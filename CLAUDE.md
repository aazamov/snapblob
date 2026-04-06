# snapblob

Browser-native media compression & processing library (images + video). Zero framework dependency. Open-source npm package.

**Package:** `snapblob` | **Version:** 1.0.0-beta.1 | **License:** MIT | **Repo:** github.com/aazamov/snapblob

## Build & Test

- **Build**: `npm run build` (tsc + vite library mode, multi-entry)
- **Dev server**: `npm run dev` (Vite with CORS headers for FFmpeg WASM)
- **Playground**: `cd playground && npm run dev` (React demo app)
- **Tests**: `npm test` (Vitest, 176 tests)
- **Lint**: `npm run lint` (ESLint)
- **Format**: `npm run format` (Prettier)
- **Type check**: `npx tsc --noEmit`

Always run `npm test` and `npx tsc --noEmit` before committing.

## Architecture

```
src/
  image/                  # Standalone image module (tree-shakeable)
    compress.ts           # compressImage(), destroyPica(), preloadPica()
    batch.ts              # compressImages() — concurrent batch processing
    format.ts             # getBestImageFormat(), supportsWebp(), supportsAvif()
    validate.ts           # validateImage() / validateImageOrThrow()
    load.ts               # loadImage() — createImageBitmap with DOM fallback
    utils.ts              # convertToAspectRatio, adjustOrientation, createCanvas
    constants.ts          # ImageMimeType, ResizeFilter enums
    errors.ts             # ImageProcessingError, ImageValidationError
    types.ts              # CompressImageOptions, ValidateImageOptions, etc.
    index.ts              # Public re-exports for subpath import
  video/                  # Standalone video module (tree-shakeable)
    ffmpeg.ts             # Shared FFmpeg singleton (getFFmpeg, destroy, preload)
    transcode.ts          # transcodeVideo() + getVideoInfo()
    audio.ts              # extractAudio() — extract audio from video
    thumbnail.ts          # getVideoThumbnail() — extract frame as image
    presets.ts            # VIDEO_PRESETS (10 presets), applyPreset()
    constants.ts          # FFmpeg codec/encoder/pixel format enums
    errors.ts             # VideoTranscodeError, VideoAbortError
    types.ts              # TranscodeVideoOptions, VideoInfo
    index.ts              # Public re-exports for subpath import
  file-handlers/          # Legacy handler classes (backward compat)
    base-handler/         # Abstract base: validation + processing lifecycle
    image-handler/        # Class-based image handler
    ffmpeg-handler/       # Class-based FFmpeg handler
    constants/            # MIME types
  utils/                  # Shared utility functions
  types/                  # Shared TypeScript types
  constants/              # Enums: data sizes, bitrate units
  index.ts                # Main entry — curated public API surface

playground/               # React demo app (separate Vite project)
  src/components/
    MainHandler.tsx       # Tabbed layout (image/video)
    ImageHandler.tsx      # Full options UI for compressImage + validateImage
    VideoHandler.tsx      # Full options UI for transcodeVideo + presets
  src/utils.ts            # formatSize, formatDuration, formatDimensions

tests/                    # Vitest test suites (176 tests)
  image/                  # compressImage, validate, load, utils tests
  video/                  # transcodeVideo, presets, errors tests
  file-handlers/          # Legacy handler tests
  utils/                  # Shared utility tests
  constants/              # Constants tests
```

### Primary API (new functional style)

```typescript
// Image
const blob = await compressImage(file, { maxWidth: 1280, quality: 0.8 });
const blobs = await compressImages(files, { maxWidth: 1280, concurrency: 3 });
const result = await validateImage(file, { maxFileSize: 20_000_000 });
const format = getBestImageFormat(); // AVIF > WebP > JPEG

// Video
const blob = await transcodeVideo(file, { ...applyPreset("balanced") });
const info = await getVideoInfo(file);
const audio = await extractAudio(file, { format: "mp3", bitrate: "192k" });
const thumb = await getVideoThumbnail(file, { time: 5, width: 320 });

// Lifecycle
await preloadFFmpeg(); // warm cache
destroyFFmpeg();       // free ~30MB WASM
```

### Build Output

Multi-entry Vite build producing ESM + CJS:
- `dist/index.{mjs,cjs}` — full library
- `dist/image/index.{mjs,cjs}` — image-only (no FFmpeg)
- `dist/video/index.{mjs,cjs}` — video-only (no Pica)

### Subpath Imports

```json
{ ".": "dist/index.mjs", "./image": "dist/image/index.mjs", "./video": "dist/video/index.mjs" }
```

### Dependencies

All heavy deps are **optional peerDependencies** (not bundled):
- `pica` — image resizing (only needed for `./image`)
- `@ffmpeg/ffmpeg` + `@ffmpeg/util` — video transcoding (only needed for `./video`)

### Key Design Decisions

- `src/image/` and `src/video/` are **self-contained** — no cross-module imports
- Small shared utils (aspectRatio, orientation) are copied into each module
- Pica singleton is cached at module level (not re-created per call)
- FFmpeg singleton uses `needsReload` flag for safe abort recovery
- `createImageBitmap` preferred over `new Image()` (Web Worker compatible)
- `OffscreenCanvas` preferred with DOM `<canvas>` fallback

## Code Style

- TypeScript strict mode, 2-space indent
- Double quotes for strings
- Semicolons always
- Enum naming: PascalCase. Enum values: UPPER_SNAKE or string literals
- Error classes set `this.name` and support `cause` chaining
- No `console.log` in library code (remove any you find)
- No `any` type — use `unknown` and narrow
- Prefer early returns over deeply nested conditionals
- Max function length: ~40 lines

## Key Design Principles

- Library must work WITHOUT any backend/server — processing returns a Blob
- No framework dependency (no React, Vue, etc. in production deps)
- Tree-shakeable: image-only users shouldn't pay for FFmpeg
- All public APIs must have JSDoc comments
- Errors must be meaningful — never swallow silently
- Options objects with sensible defaults — minimal config for common use cases
- AbortSignal for cancellation on long operations (video transcoding)
- Progress callbacks: `(progress: number) => void` where progress is 0-100

## Git Conventions

- Branch: `feature/name`, `fix/name`, `chore/name`, `refactor/name`
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)
- PRs: link to issue, summary + test plan

## Claude Code Setup

- **Rules**: `.claude/rules/` — code-style (src/**), api-design (src/**), testing (tests/**)
- **Skills**: `/build`, `/test`, `/release`, `/review`, `/fix-issue`
- **Agents**: bundle-analyzer, api-docs-generator, compatibility-checker, migration-helper, test-writer
- **Hooks**: format-on-save (prettier), protect-files (.env, package-lock.json, dist/, .git/)

## References

- @PLAN.md for the full rewrite roadmap and target API design
- Playground app in `/playground` is for manual testing (separate React app)
- `.claude/` for all Claude Code configuration (rules, skills, agents, hooks)
