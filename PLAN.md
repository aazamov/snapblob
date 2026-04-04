# snapblob — Production Hardening Plan

## Where We Are Now

### Done
- Standalone functional API: `compressImage()`, `validateImage()`, `transcodeVideo()`, `getVideoInfo()`
- Multi-entry Vite build with subpath exports (`./image`, `./video`)
- Optional peer dependencies (pica, @ffmpeg/ffmpeg, @ffmpeg/util)
- Self-contained modules (no cross-imports between image/ and video/)
- Cached singletons (Pica, FFmpeg) with `destroyPica()` / `destroyFFmpeg()` cleanup
- Preload functions: `preloadPica()`, `preloadFFmpeg()`
- Video presets system with 10 presets (4 general + 6 social media platform)
- AbortSignal support for video transcoding, audio extraction, thumbnails
- Batch image processing with concurrency control: `compressImages()`
- Format detection: `getBestImageFormat()`, `supportsWebp()`, `supportsAvif()`
- Audio extraction: `extractAudio()` (mp3, aac, opus, wav)
- Video thumbnails: `getVideoThumbnail()` (jpeg, png, webp)
- Shared FFmpeg singleton (`src/video/ffmpeg.ts`) used by transcode, audio, thumbnail
- Input validation at all API boundaries (quality, dimensions, file size)
- Timeout protection (30s) on image loading and video metadata loading
- NaN/Infinity guards in dimension calculations
- Concurrent-safe unique filenames in FFmpeg virtual FS
- Optional `onLog` callback replacing console.log
- FFmpeg error context included in error messages (last 5 log lines)
- Playground with full options UI + documentation site (6 pages)
- 176 tests (93 legacy + 83 new functional API tests)
- CI/CD pipeline with Node 18/20/22 matrix + auto-publish
- Deprecation notices on legacy handlers
- CLAUDE.md, rules, skills, agents configured
- package.json metadata complete (MIT license, keywords, repository, engines, scripts)

### Remaining (Future)
- Web Worker support (`compressImageInWorker`)
- AVIF added to ImageMimeType enum
- EXIF metadata preservation
- Progressive JPEG encoding
- Animated GIF handling
- Color space conversion

---

## Critical Bugs (Fix Immediately)

### BUG-1: Concurrent transcodeVideo calls corrupt files
**Location:** `src/video/transcode.ts:139-143`
**Problem:** All calls use the same filenames (`input.mp4`, `output.mp4`) in FFmpeg's virtual filesystem. Two simultaneous calls overwrite each other's files.
**Fix:** Generate unique filenames per call:
```typescript
const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
const inputFileName = `input_${id}.${inputExt}`;
const outputFileName = `output_${id}.${outExt}`;
```

### BUG-2: console.log in library code
**Location:** `src/video/transcode.ts:78, 83`
**Problem:** Two `console.log()` calls pollute the user's console in production.
**Fix:** Remove both. Optionally accept an `onLog?: (msg: string) => void` callback in options.

### BUG-3: Abort signal doesn't actually stop FFmpeg
**Location:** `src/video/transcode.ts:208-211`
**Problem:** Abort handler only sets `needsReload = true` but doesn't interrupt `ffmpeg.exec()`. The transcoding continues to completion.
**Fix:** Call `ffmpeg.terminate()` in the abort handler to actually stop execution, then set `needsReload = true` for the next call.

### BUG-4: FFmpeg load flag set before load completes
**Location:** `src/video/transcode.ts:93`
**Problem:** `ffmpegLoaded = true` is set after `ffmpeg.load()`, but if load throws partway through, the flag is already set by the time the error propagates. Actually — the flag is set after, so this is correct. But the event listeners (lines 77-85) are registered before load, meaning they fire during load setup, which is fine. The real issue: if load fails, the instance is half-initialized but still assigned to `ffmpegInstance`. Next call checks `!ffmpegInstance` — it's truthy, checks `ffmpegLoaded` — it's false, so it tries to load again on the same broken instance.
**Fix:** Reset `ffmpegInstance = null` in the catch block of `getFFmpeg`, or create a fresh instance on retry.

### BUG-5: License mismatch
**Location:** `package.json:93`
**Problem:** Says `"license": "ISC"` but LICENSE file is MIT.
**Fix:** Change to `"license": "MIT"`.

---

## Phase 1: Safety & Correctness

Priority: **P0** — Must fix before anyone uses this in production.

### 1.1 Input Validation at API Boundaries

**compressImage:**
- Validate `quality` is in `[0, 1]` range. Clamp or throw.
- Validate `maxWidth` / `maxHeight` > 0 if provided.
- Validate `file.size > 0` (empty file check).
- Validate `file.type` is an image MIME type (when File, not Blob).

**transcodeVideo:**
- Add maximum file size check (warn or throw for files > 500MB — FFmpeg WASM has heap limits).
- Validate `crf` is in `[0, 51]` range.
- Validate `threads` is in `[0, 16]` range.

**validateImage:**
- Handle empty `allowedTypes` array (currently truthy but skips validation — confusing).

### 1.2 Timeout Protection

**Image loading (`src/image/load.ts`):**
- Add timeout to `loadImageViaElement`. DOM image loads can hang forever on corrupt files.
- Default: 30 seconds. No config needed — this is a safety net, not a feature.

**getVideoInfo (`src/video/transcode.ts`):**
- Add timeout to video metadata loading. Same issue — corrupt files cause infinite wait.
- Default: 30 seconds.

### 1.3 Zero/NaN/Infinity Guards

**`src/image/utils.ts` — `convertToAspectRatio`:**
- Guard against `aspectRatio <= 0`, `width <= 0`, `height <= 0`.
- Guard against NaN/Infinity from division.
- Return original dimensions if guards trigger.

**`src/image/compress.ts` — `computeTargetDimensions`:**
- Validate computed dimensions are positive integers before passing to Pica.

### 1.4 Memory Safety

**FFmpeg cleanup function:**
```typescript
// New public export from src/video/
export function destroyFFmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    ffmpegLoaded = false;
    needsReload = false;
  }
}
```
- Users can call this when navigating away from a video page in an SPA.
- Prevents 30MB+ WASM from lingering in memory.

**Pica cleanup function:**
```typescript
// New public export from src/image/
export function destroyPica(): void {
  picaInstance = null;
}
```

**Canvas cleanup in compress.ts:**
- Set canvas width/height to 0 after use to release GPU memory:
```typescript
srcCanvas.width = 0;
srcCanvas.height = 0;
```

### 1.5 Error Context

**Video errors should include FFmpeg logs:**
- Capture FFmpeg log messages during exec.
- On error, include last N log lines in the error message or `cause`.
- Replace `"Transcoding failed."` with `"Transcoding failed: <ffmpeg error>"`.

**getVideoInfo wrong error class:**
- Change `VideoTranscodeError` to `VideoValidationError` in the onerror handler.

---

## Phase 2: Robustness

Priority: **P1** — Important for reliability but not blocking basic usage.

### 2.1 Concurrency Safety for Video

Two options (pick one):

**Option A: Unique filenames (simpler, recommended)**
- Already described in BUG-1. Each call gets unique input/output names.
- FFmpeg can only run one exec at a time anyway, so calls will queue naturally.

**Option B: Mutex queue**
```typescript
let transcodeQueue: Promise<void> = Promise.resolve();

export async function transcodeVideo(file, options) {
  return new Promise((resolve, reject) => {
    transcodeQueue = transcodeQueue.then(async () => {
      try { resolve(await doTranscode(file, options)); }
      catch (err) { reject(err); }
    });
  });
}
```
- Serializes all calls. Safer but adds latency for back-to-back calls.

**Recommendation:** Option A (unique filenames) + document that FFmpeg WASM is single-threaded.

### 2.2 FFmpeg Load Resilience

```typescript
async function getFFmpeg(...) {
  if (needsReload || !ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    ffmpegLoaded = false;
    needsReload = false;
  }

  if (!ffmpegLoaded) {
    try {
      // ... load config ...
      await ffmpeg.load(loadConfig);
      ffmpegLoaded = true;  // Only after success
    } catch (err) {
      // Reset so next call creates a fresh instance
      ffmpegInstance = null;
      ffmpegLoaded = false;
      throw new VideoTranscodeError("Failed to load FFmpeg.", { cause: err });
    }
  }
}
```

### 2.3 Progress Normalization

**Image:** Current progress jumps (5, 15, 25, 35, 45, 70, 85, 95, 100) are fine for a fast operation. No change needed.

**Video:** FFmpeg progress may not reach exactly 100%.
- After successful `ffmpeg.exec()`, always call `onProgress?.(100)` before returning the blob.

### 2.4 Event Listener Cleanup on FFmpeg

- Store references to log/progress handlers.
- On reload (`needsReload`), call `ffmpeg.off("log", ...)` and `ffmpeg.off("progress", ...)` before creating new instance.

### 2.5 skipIfSmaller Logic Fix

**`src/image/compress.ts:134-136`:**
```typescript
// Current (File extends Blob, so this always returns the original File)
return file instanceof Blob ? file : new Blob([file]);

// Should be:
return new Blob([file], { type: file.type });
```
Return a plain Blob consistently (not a File) to match the return type.

---

## Phase 3: Testing

Priority: **P1** — Required before v1.0 release.

### 3.1 New Module Tests

| Test File | What to Test |
|---|---|
| `tests/image/compress.test.ts` | compressImage with various options, skipIfSmaller, quality bounds, progress callback, error paths |
| `tests/image/validate.test.ts` | validateImage all constraint combos, validateImageOrThrow, edge cases (empty allowedTypes, zero dimensions) |
| `tests/image/load.test.ts` | loadImage with createImageBitmap and DOM fallback, cleanup called, timeout (once added) |
| `tests/image/utils.test.ts` | convertToAspectRatio edge cases (zero, NaN, extreme ratios), adjustOrientation, createCanvas |
| `tests/video/transcode.test.ts` | transcodeVideo with presets, custom options, abort, unique filenames, error paths |
| `tests/video/presets.test.ts` | applyPreset all presets, VIDEO_PRESETS values, spread + override pattern |
| `tests/video/errors.test.ts` | Error class names, cause chaining, instanceof checks |

### 3.2 Mocking Strategy

**Image tests:**
- Mock `pica` module — return a fake Pica instance with `resize()` and `toBlob()` stubs.
- Mock `createImageBitmap` — return `{ width: 800, height: 600, close: vi.fn() }`.
- Mock `document.createElement("canvas")` — return fake canvas with `getContext()` stub.

**Video tests:**
- Mock `@ffmpeg/ffmpeg` — return fake FFmpeg with `load()`, `exec()`, `writeFile()`, `readFile()`, `deleteFile()` stubs.
- Mock `@ffmpeg/util` — `fetchFile()` returns `Uint8Array`, `toBlobURL()` returns data URLs.
- Test abort by calling `signal.abort()` during mocked exec.

### 3.3 Coverage Target

- **Public API functions:** 100% branch coverage.
- **Internal helpers:** 80%+ line coverage.
- **Error paths:** Every custom error class must have a test that triggers it.

### 3.4 Integration Tests (Optional, Slow)

- Real image compression with a tiny test fixture (1x1 PNG, 10x10 JPEG).
- Verify output blob is valid image (check magic bytes).
- Mark as `describe.skip` in CI if too slow.

---

## Phase 4: package.json & Publish Readiness

Priority: **P2** — Needed for npm publish.

### 4.1 Fix package.json

```jsonc
{
  "name": "snapblob",
  "version": "1.0.0-beta.1",
  "license": "MIT",                           // Fix: was ISC
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "repository": {
    "type": "git",
    "url": "https://github.com/aazamov/snapblob"
  },
  "homepage": "https://github.com/aazamov/snapblob#readme",
  "bugs": {
    "url": "https://github.com/aazamov/snapblob/issues"
  },
  "keywords": [
    "image-compression",
    "image-resize",
    "video-transcoding",
    "ffmpeg",
    "ffmpeg-wasm",
    "pica",
    "browser",
    "wasm",
    "webp",
    "typescript",
    "media",
    "compress"
  ],
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "format": "prettier --write 'src/**/*.ts'",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run typecheck && npm test && npm run build",
    "preview": "vite preview"
  }
}
```

### 4.2 CI/CD Pipeline

Update `.github/workflows/publish.yml`:

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  publish:
    needs: test
    if: github.ref == 'refs/heads/master' && startsWith(github.event.head_commit.message, 'chore: release')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org/
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 4.3 Deprecation Notices

Add `@deprecated` JSDoc to legacy handlers:

```typescript
/**
 * @deprecated Use `compressImage()` from `snapblob/image` instead.
 * This class will be removed in v2.0.
 */
export class ImageHandler extends BaseFileHandler { ... }
```

---

## Phase 5: API Polish

Priority: **P2** — Better DX but not blocking.

### 5.1 JSDoc on All Public Functions

Every exported function needs `@param`, `@returns`, `@throws`, `@example`. Currently:
- `compressImage` — has JSDoc (good)
- `validateImage` — has JSDoc (good)
- `validateImageOrThrow` — has JSDoc (good)
- `transcodeVideo` — has minimal JSDoc (needs `@param`, `@throws`, `@example`)
- `getVideoInfo` — has minimal JSDoc (needs expansion)
- `applyPreset` — has JSDoc (good)
- `destroyFFmpeg` — new, needs JSDoc
- `destroyPica` — new, needs JSDoc

### 5.2 Optional Logger

Instead of `console.log`, accept an optional logger:

```typescript
interface TranscodeVideoOptions {
  // ... existing options ...
  /** Optional logger for FFmpeg messages. If not set, logs are silently discarded. */
  onLog?: (message: string) => void;
}
```

Wire it up:
```typescript
ffmpeg.on("log", ({ message }) => {
  merged.onLog?.(message);
});
```

### 5.3 FFmpeg Load Progress

Separate "loading FFmpeg" from "transcoding progress":

```typescript
interface TranscodeVideoOptions {
  // ... existing ...
  /** Called when FFmpeg WASM is being downloaded (first time only). */
  onLoadProgress?: (phase: "downloading" | "initializing" | "ready") => void;
}
```

### 5.4 Preload Functions

```typescript
// src/image/index.ts
export async function preloadPica(): Promise<void> {
  await getPica();
}

// src/video/index.ts
export async function preloadFFmpeg(options?: {
  baseUrl?: string;
  mtBaseUrl?: string;
}): Promise<void> {
  await getFFmpeg(undefined, options?.baseUrl, options?.mtBaseUrl);
}
```

Users can call these during idle time to avoid latency on first use.

---

## Phase 6: Features (Post v1.0)

Priority: **P3** — Nice to have, not blocking release.

### 6.1 Web Worker Support

- `compressImageInWorker(file, options)` — runs compression off main thread.
- Requires: OffscreenCanvas path (already exists), Worker bundling, Pica in Worker context.
- Ship as separate export: `snapblob/image/worker`.

### 6.2 Batch Processing

```typescript
export async function compressImages(
  files: File[],
  options: CompressImageOptions & { concurrency?: number },
): Promise<Blob[]> {
  const { concurrency = 3, ...compressOpts } = options;
  // Process in batches of `concurrency`
}
```

### 6.3 Format Detection

```typescript
export function getBestImageFormat(): ImageMimeType {
  if (supportsAvif()) return ImageMimeType.AVIF;
  if (supportsWebp()) return ImageMimeType.WEBP;
  return ImageMimeType.JPEG;
}
```

### 6.4 More Video Presets

- Platform-specific: `"instagram-feed"`, `"instagram-story"`, `"tiktok"`, `"youtube-1080p"`.
- Each with appropriate resolution, aspect ratio, and bitrate.

### 6.5 Audio Extraction

```typescript
export async function extractAudio(
  file: File | Blob,
  options?: { format?: "mp3" | "aac" | "opus"; bitrate?: string },
): Promise<Blob> {
  // ffmpeg -i input -vn -c:a aac output.m4a
}
```

### 6.6 Video Thumbnails

```typescript
export async function getVideoThumbnail(
  file: File | Blob,
  options?: { time?: number; width?: number; format?: ImageMimeType },
): Promise<Blob> {
  // ffmpeg -i input -ss time -frames:v 1 output.jpg
}
```

---

## Execution Order

```
Week 1: Critical Bugs (BUG-1 through BUG-5)
         Phase 1: Safety & Correctness
         
Week 2: Phase 2: Robustness
         Phase 3: Testing (new module tests)

Week 3: Phase 4: package.json, CI/CD, publish prep
         Phase 5: API Polish (JSDoc, logger, preload)

Week 4: v1.0.0-beta.1 publish
         Gather feedback
         Phase 6: Start feature work based on user requests
```

## Files That Need Changes

| File | Changes |
|---|---|
| `src/video/transcode.ts` | Unique filenames, remove console.log, fix abort, fix load resilience, add destroyFFmpeg, add onLog, add timeout to getVideoInfo, fix error class in getVideoInfo, call onProgress(100) at end |
| `src/video/index.ts` | Export destroyFFmpeg, preloadFFmpeg |
| `src/video/types.ts` | Add onLog option |
| `src/image/compress.ts` | Input validation, fix skipIfSmaller return, canvas cleanup, NaN guards |
| `src/image/validate.ts` | Handle empty allowedTypes |
| `src/image/load.ts` | Add timeout, better error context in catch |
| `src/image/utils.ts` | Zero/NaN/Infinity guards in convertToAspectRatio |
| `src/image/index.ts` | Export destroyPica, preloadPica |
| `src/index.ts` | Export new functions, add @deprecated on legacy |
| `package.json` | License, metadata, scripts, keywords, engines |
| `.github/workflows/publish.yml` | Add test step, publish step, matrix |
| `tests/image/*.test.ts` | New test files (4) |
| `tests/video/*.test.ts` | New test files (3) |

## Success Criteria for v1.0

- [ ] Zero critical bugs
- [ ] No console.log in library source
- [ ] All public functions have JSDoc with examples
- [ ] 80%+ test coverage on public API
- [ ] CI runs typecheck + tests + build on every PR
- [ ] package.json metadata complete and correct
- [ ] `npm publish --dry-run` succeeds
- [ ] Playground and docs site functional
- [ ] README has accurate API docs matching actual code
