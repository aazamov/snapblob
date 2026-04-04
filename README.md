# snapblob

Browser-native image compression & video transcoding. Zero framework dependency. One function call.

[![npm version](https://img.shields.io/npm/v/snapblob.svg)](https://www.npmjs.com/package/snapblob)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

- **Image compression** -- resize, convert format, and adjust quality entirely in the browser
- **Batch processing** -- compress multiple images with concurrency control
- **Format detection** -- automatically pick the best format (AVIF > WebP > JPEG)
- **Video transcoding** -- transcode videos using FFmpeg WASM with full codec control
- **Audio extraction** -- extract audio tracks from video files
- **Video thumbnails** -- generate thumbnail images from any point in a video
- **Zero backend dependency** -- returns a `Blob` you can upload however you want
- **Tree-shakeable** -- import only `image` or `video` to keep your bundle small
- **TypeScript-first** -- full type definitions with IntelliSense-friendly APIs
- **Framework-agnostic** -- works with React, Vue, Svelte, Angular, or vanilla JS

## Installation

```bash
npm install snapblob
```

Install only the peer dependencies you need:

```bash
# Image compression only
npm install pica

# Video transcoding only
npm install @ffmpeg/ffmpeg @ffmpeg/util

# Both
npm install pica @ffmpeg/ffmpeg @ffmpeg/util
```

## Quick Start

```typescript
// Compress an image
import { compressImage } from "snapblob/image";

const blob = await compressImage(file, { maxWidth: 1920, quality: 0.8 });

// Transcode a video
import { transcodeVideo, applyPreset } from "snapblob/video";

const video = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  onProgress: (p) => console.log(`${p}%`),
});
```

All processing functions return a standard `Blob` -- upload it, display it, or download it.

```typescript
// Batch compress multiple images
import { compressImages } from "snapblob/image";

const blobs = await compressImages(files, {
  maxWidth: 1280,
  quality: 0.8,
  concurrency: 4,
});

// Auto-detect best format
import { getBestImageFormat } from "snapblob/image";

const format = getBestImageFormat(); // AVIF > WebP > JPEG
const blob = await compressImage(file, { mimeType: format });
```

---

## Image API

### `compressImage(file, options?)`

Compresses and optionally resizes an image. Uses the [Pica](https://github.com/nicedoc/pica) library for high-quality downscaling.

```typescript
import { compressImage, ImageMimeType, ResizeFilter } from "snapblob/image";

const blob = await compressImage(file, {
  maxWidth: 1280,
  maxHeight: 720,
  quality: 0.8,
  mimeType: ImageMimeType.WEBP,
  resizeFilter: ResizeFilter.LANCZOS3,
  adjustOrientation: true,
  skipIfSmaller: true,
  onProgress: (p) => console.log(`${p}%`),
});
```

**Parameters:**

| Option | Type | Default | Description |
|---|---|---|---|
| `maxWidth` | `number` | Source width | Maximum output width in pixels (never upscales) |
| `maxHeight` | `number` | Source height | Maximum output height in pixels (never upscales) |
| `quality` | `number` | `0.8` | Encoding quality, `0` to `1` |
| `mimeType` | `ImageMimeType` | `WEBP` | Output format: `WEBP`, `JPEG`, `PNG`, `GIF`, `BMP`, `TIFF` |
| `resizeFilter` | `ResizeFilter` | `MKS2013` | Algorithm: `MKS2013` (best quality), `LANCZOS3`, `LANCZOS2`, `HAMMING`, `BOX` (fastest) |
| `adjustOrientation` | `boolean` | `true` | Adjust target dimensions to match source orientation |
| `skipIfSmaller` | `boolean` | `false` | Return the original if compression would increase file size |
| `onProgress` | `(p: number) => void` | -- | Progress callback (0--100) |

**Input:** `File | Blob`
**Returns:** `Promise<Blob>`
**Throws:** `ImageProcessingError`

### `validateImage(file, options?)`

Validates an image against dimension, type, and size constraints. Returns a result object (does not throw).

```typescript
import { validateImage, ImageMimeType } from "snapblob/image";

const result = await validateImage(file, {
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  minSize: [300, 300],
  maxSize: [4096, 4096],
  allowedTypes: [ImageMimeType.JPEG, ImageMimeType.PNG, ImageMimeType.WEBP],
});

if (!result.valid) {
  console.error(result.errors); // string[]
}
// result.width, result.height -- actual image dimensions
```

| Option | Type | Description |
|---|---|---|
| `maxFileSize` | `number` | Maximum file size in bytes |
| `minSize` | `[width, height]` | Minimum dimensions in pixels |
| `maxSize` | `[width, height]` | Maximum dimensions in pixels |
| `allowedTypes` | `ImageMimeType[]` | Allowed MIME types |

**Input:** `File` (not `Blob` -- needs `.type` for MIME check)
**Returns:** `Promise<ImageValidationResult>`

```typescript
interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  errors: string[];
}
```

### `validateImageOrThrow(file, options?)`

Same as `validateImage`, but throws `ImageValidationError` on failure.

```typescript
import { validateImageOrThrow } from "snapblob/image";

await validateImageOrThrow(file, { maxFileSize: 5 * 1024 * 1024 });
// throws ImageValidationError if invalid
```

### `compressImages(files, options?)`

Batch-compresses multiple images with built-in concurrency control and per-file progress tracking.

```typescript
import { compressImages } from "snapblob/image";

const blobs = await compressImages(files, {
  maxWidth: 1280,
  quality: 0.8,
  concurrency: 4,
  onFileProgress: (index, total, pct) => {
    console.log(`File ${index + 1}/${total}: ${pct}%`);
  },
});
```

**Parameters:**

Options extend `CompressImageOptions` with additional batch-specific fields:

| Option | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | `3` | Maximum number of images to compress in parallel |
| `onFileProgress` | `(index: number, total: number, pct: number) => void` | -- | Progress callback fired per file with file index, total count, and percentage |

All other options from `compressImage` (e.g. `maxWidth`, `quality`, `mimeType`) are applied to every file in the batch.

**Input:** `(File | Blob)[]`
**Returns:** `Promise<Blob[]>`
**Throws:** `ImageProcessingError` (fails fast on first error)

### `getBestImageFormat()`

Detects the best image format supported by the current browser. Checks support in order of preference: AVIF, WebP, JPEG.

```typescript
import { getBestImageFormat, supportsWebp, supportsAvif } from "snapblob/image";

const format = getBestImageFormat(); // Returns the best supported ImageMimeType

// Or check individual format support
if (supportsAvif()) {
  console.log("AVIF is supported");
}
if (supportsWebp()) {
  console.log("WebP is supported");
}
```

**Returns:** `ImageMimeType` -- the best format the browser supports

### `supportsWebp()`

Returns `true` if the browser supports WebP encoding.

**Returns:** `boolean`

### `supportsAvif()`

Returns `true` if the browser supports AVIF encoding.

**Returns:** `boolean`

---

## Video API

### `transcodeVideo(file, options?)`

Transcodes a video using FFmpeg WASM. The FFmpeg core (~30MB) is downloaded and cached on the first call.

```typescript
import { transcodeVideo, applyPreset } from "snapblob/video";

// Using a preset
const blob = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  outputFormat: "mp4",
  onProgress: (p) => console.log(`${p}%`),
});

// Full custom control
const blob = await transcodeVideo(file, {
  codec: "libx264",
  preset: "medium",
  crf: 23,
  maxBitrate: "5M",
  audioBitrate: "128k",
  audioCodec: "aac",
  pixelFormat: "yuv420p",
  outputFormat: "mp4",
  threads: 4,
  onProgress: (p) => updateUI(p),
  signal: abortController.signal,
});
```

**Parameters:**

| Option | Type | Default | Description |
|---|---|---|---|
| `presetName` | `VideoPresetName` | -- | Named preset: `"high-quality"`, `"balanced"`, `"small-file"`, `"social-media"` |
| `codec` | `string` | `"libx264"` | Video codec (`"libx264"`, `"libx265"`, `"libvpx-vp9"`, `"mpeg4"`) |
| `preset` | `string` | -- | Encoder speed/quality trade-off: `"ultrafast"` to `"veryslow"` |
| `crf` | `number` | -- | Constant Rate Factor. 18 = high quality, 23 = balanced, 28 = small file |
| `maxBitrate` | `string \| number` | -- | Max video bitrate (`"5M"`, `"2500k"`, or `2500000`) |
| `audioBitrate` | `string \| number` | -- | Audio bitrate (`"128k"`, `"192k"`) |
| `audioCodec` | `string` | -- | Audio codec (`"aac"`, `"libopus"`) |
| `pixelFormat` | `string` | `"yuv420p"` | Pixel format for compatibility |
| `outputFormat` | `string` | Input ext | Output container (`"mp4"`, `"webm"`) |
| `threads` | `number` | `0` (auto) | Number of encoding threads |
| `signal` | `AbortSignal` | -- | Cancel the transcoding operation |
| `onProgress` | `(p: number) => void` | -- | Progress callback (0--100) |
| `ffmpegBaseUrl` | `string` | unpkg CDN | Custom URL for FFmpeg core files |
| `ffmpegMTBaseUrl` | `string` | unpkg CDN | Custom URL for FFmpeg multi-thread core |

**Input:** `File | Blob`
**Returns:** `Promise<Blob>`
**Throws:** `VideoTranscodeError`, `VideoAbortError`, `VideoValidationError`

### Video Presets

Use `applyPreset()` to get pre-configured options for common scenarios:

| Preset | CRF | Max Bitrate | Speed | Use Case |
|---|---|---|---|---|
| `"high-quality"` | 18 | 8M | slow | Archiving, professional |
| `"balanced"` | 23 | 5M | medium | General purpose |
| `"small-file"` | 28 | 2M | fast | File size priority |
| `"social-media"` | 26 | 3M | fast | Social platform sharing |
| `"instagram-feed"` | 23 | 3.5M | fast | Instagram feed posts |
| `"instagram-story"` | 23 | 4M | fast | Instagram/Facebook stories |
| `"tiktok"` | 23 | 4M | fast | TikTok vertical videos |
| `"youtube-1080p"` | 20 | 8M | medium | YouTube 1080p uploads |
| `"youtube-4k"` | 18 | 20M | slow | YouTube 4K uploads |
| `"twitter"` | 24 | 5M | fast | Twitter/X timeline videos |

```typescript
import { applyPreset, VIDEO_PRESETS } from "snapblob/video";

// Spread preset and override individual values
const blob = await transcodeVideo(file, {
  ...applyPreset("high-quality"),
  outputFormat: "webm",
});

// Inspect preset values directly
console.log(VIDEO_PRESETS["balanced"]);
// { codec: "libx264", preset: "medium", crf: 23, maxBitrate: "5M", audioBitrate: "128k", pixelFormat: "yuv420p" }
```

### `getVideoInfo(file)`

Returns video metadata without transcoding. Uses an HTML `<video>` element internally.

```typescript
import { getVideoInfo } from "snapblob/video";

const info = await getVideoInfo(file);
// { duration: 12.5, width: 1920, height: 1080, fileSize: 5242880, mimeType: "video/mp4" }
```

### Cancelling Transcoding

```typescript
const controller = new AbortController();

const promise = transcodeVideo(file, {
  ...applyPreset("balanced"),
  signal: controller.signal,
});

cancelButton.onclick = () => controller.abort();

try {
  const blob = await promise;
} catch (err) {
  if (err instanceof VideoAbortError) {
    console.log("Cancelled by user");
  }
}
```

### `extractAudio(file, options?)`

Extracts the audio track from a video file and encodes it in the specified format.

```typescript
import { extractAudio } from "snapblob/video";

const controller = new AbortController();

const audio = await extractAudio(videoFile, {
  format: "mp3",       // "mp3" | "aac" | "opus" | "wav"
  bitrate: "192k",
  signal: controller.signal,
  onProgress: (p) => console.log(`${p}%`),
});

// audio is a Blob -- download it, play it, or upload it
```

**Parameters:**

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `AudioFormat` | `"mp3"` | Output format: `"mp3"`, `"aac"`, `"opus"`, `"wav"` |
| `bitrate` | `string` | -- | Audio bitrate (e.g. `"128k"`, `"192k"`, `"320k"`) |
| `signal` | `AbortSignal` | -- | Cancel the extraction |
| `onProgress` | `(p: number) => void` | -- | Progress callback (0--100) |

**Input:** `File | Blob`
**Returns:** `Promise<Blob>`
**Throws:** `VideoTranscodeError`, `VideoAbortError`

### `getVideoThumbnail(file, options?)`

Generates a thumbnail image from a specific point in a video using FFmpeg WASM.

```typescript
import { getVideoThumbnail } from "snapblob/video";

const thumbnail = await getVideoThumbnail(videoFile, {
  time: 5,           // capture at 5 seconds
  width: 320,        // optional resize
  format: "jpeg",    // "jpeg" | "png" | "webp"
  quality: 3,        // 1-31 for JPEG (lower = better)
});

// thumbnail is a Blob -- use as an <img> src or upload
```

**Parameters:**

| Option | Type | Default | Description |
|---|---|---|---|
| `time` | `number` | `0` | Timestamp in seconds to capture the frame |
| `width` | `number` | -- | Output width in pixels (height scales proportionally) |
| `format` | `ThumbnailFormat` | `"jpeg"` | Output format: `"jpeg"`, `"png"`, `"webp"` |
| `quality` | `number` | -- | Quality level, 1--31 for JPEG (lower = better quality) |

**Input:** `File | Blob`
**Returns:** `Promise<Blob>`
**Throws:** `VideoTranscodeError`

---

## Lifecycle Management

The library lazily initializes FFmpeg WASM and Pica when first needed. You can control this lifecycle explicitly for better performance or memory management.

```typescript
import {
  preloadFFmpeg,
  preloadPica,
  destroyFFmpeg,
  destroyPica,
} from "snapblob";

// Preload during idle time (e.g. after page load)
await preloadFFmpeg();  // Downloads and initializes FFmpeg WASM (~30MB)
await preloadPica();    // Initializes Pica instance

// ... process files ...

// Cleanup when done (e.g. navigating away in an SPA)
destroyFFmpeg();  // Frees ~30MB WASM memory
destroyPica();    // Releases Pica resources
```

This is especially useful in single-page applications where you want to free memory when the user navigates away from a media processing view.

---

## Framework Integration

### React

```tsx
import { useState, useCallback } from "react";
import { compressImage, ImageMimeType } from "snapblob/image";

function ImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const blob = await compressImage(file, {
      maxWidth: 1280,
      quality: 0.8,
      mimeType: ImageMimeType.WEBP,
      onProgress: setProgress,
    });

    // Preview
    setPreview(URL.createObjectURL(blob));

    // Upload
    const formData = new FormData();
    formData.append("image", blob, "photo.webp");
    await fetch("/api/upload", { method: "POST", body: formData });

    setUploading(false);
  }, []);

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
      {uploading && <progress value={progress} max={100} />}
      {preview && <img src={preview} alt="Preview" />}
    </div>
  );
}
```

#### React: Video with Cancel

```tsx
import { useState, useRef } from "react";
import { transcodeVideo, applyPreset, VideoAbortError } from "snapblob/video";

function VideoTranscoder() {
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const blob = await transcodeVideo(file, {
        ...applyPreset("balanced"),
        outputFormat: "mp4",
        onProgress: setProgress,
        signal: controller.signal,
      });

      // Trigger download
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "transcoded.mp4";
      a.click();
    } catch (err) {
      if (!(err instanceof VideoAbortError)) console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFile} disabled={processing} />
      {processing && (
        <>
          <progress value={progress} max={100} />
          <button onClick={() => abortRef.current?.abort()}>Cancel</button>
        </>
      )}
    </div>
  );
}
```

#### React: Custom Hook

```tsx
import { useState, useCallback } from "react";
import { compressImage } from "snapblob/image";
import type { CompressImageOptions } from "snapblob/image";

export function useImageCompressor(options?: CompressImageOptions) {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compress = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const blob = await compressImage(file, { ...options, onProgress: setProgress });
      return blob;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Compression failed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { compress, progress, loading, error };
}

// Usage
function Avatar() {
  const { compress, progress, loading } = useImageCompressor({
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compress(file);
    if (blob) {
      // upload...
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} disabled={loading} />
      {loading && <span>{Math.round(progress)}%</span>}
    </div>
  );
}
```

#### React: Batch Upload

```tsx
import { useState } from "react";
import { compressImages } from "snapblob/image";

function BatchUploader() {
  const [fileProgress, setFileProgress] = useState<Record<number, number>>({});
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setProcessing(true);

    const blobs = await compressImages(files, {
      maxWidth: 1280,
      quality: 0.8,
      concurrency: 4,
      onFileProgress: (index, total, pct) => {
        setFileProgress((prev) => ({ ...prev, [index]: pct }));
      },
    });

    // Upload all compressed images
    const formData = new FormData();
    blobs.forEach((blob, i) => formData.append("images", blob, `photo-${i}.webp`));
    await fetch("/api/upload-batch", { method: "POST", body: formData });

    setProcessing(false);
  };

  return (
    <div>
      <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={processing} />
      {processing && Object.entries(fileProgress).map(([i, pct]) => (
        <div key={i}>File {Number(i) + 1}: {Math.round(pct)}%</div>
      ))}
    </div>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { ref } from "vue";
import { compressImage, ImageMimeType } from "snapblob/image";

const preview = ref<string | null>(null);
const progress = ref(0);
const loading = ref(false);

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  loading.value = true;
  progress.value = 0;

  try {
    const blob = await compressImage(file, {
      maxWidth: 1280,
      quality: 0.8,
      mimeType: ImageMimeType.WEBP,
      onProgress: (p) => { progress.value = p; },
    });

    preview.value = URL.createObjectURL(blob);

    // Upload
    const formData = new FormData();
    formData.append("image", blob, "compressed.webp");
    await fetch("/api/upload", { method: "POST", body: formData });
  } catch (err) {
    console.error("Compression failed:", err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <input type="file" accept="image/*" @change="handleFile" :disabled="loading" />
    <p v-if="loading">Compressing: {{ Math.round(progress) }}%</p>
    <img v-if="preview" :src="preview" alt="Preview" />
  </div>
</template>
```

#### Vue 3: Composable

```typescript
// composables/useImageCompressor.ts
import { ref } from "vue";
import { compressImage } from "snapblob/image";
import type { CompressImageOptions } from "snapblob/image";

export function useImageCompressor(options?: CompressImageOptions) {
  const progress = ref(0);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function compress(file: File): Promise<Blob | null> {
    loading.value = true;
    error.value = null;
    progress.value = 0;
    try {
      return await compressImage(file, {
        ...options,
        onProgress: (p) => { progress.value = p; },
      });
    } catch (err) {
      error.value = err instanceof Error ? err : new Error("Compression failed");
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { compress, progress, loading, error };
}
```

#### Vue 3: Video with Cancel

```vue
<script setup lang="ts">
import { ref } from "vue";
import { transcodeVideo, applyPreset, VideoAbortError } from "snapblob/video";

const progress = ref(0);
const processing = ref(false);
let controller: AbortController | null = null;

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  processing.value = true;
  controller = new AbortController();

  try {
    const blob = await transcodeVideo(file, {
      ...applyPreset("balanced"),
      outputFormat: "mp4",
      onProgress: (p) => { progress.value = p; },
      signal: controller.signal,
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transcoded.mp4";
    a.click();
  } catch (err) {
    if (!(err instanceof VideoAbortError)) console.error(err);
  } finally {
    processing.value = false;
  }
}
</script>

<template>
  <div>
    <input type="file" accept="video/*" @change="handleFile" :disabled="processing" />
    <div v-if="processing">
      <progress :value="progress" max="100" />
      <button @click="controller?.abort()">Cancel</button>
    </div>
  </div>
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { compressImage, ImageMimeType } from "snapblob/image";

  let preview: string | null = null;
  let progress = 0;
  let loading = false;

  async function handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    loading = true;
    progress = 0;

    try {
      const blob = await compressImage(file, {
        maxWidth: 1280,
        quality: 0.8,
        mimeType: ImageMimeType.WEBP,
        onProgress: (p) => { progress = p; },
      });

      preview = URL.createObjectURL(blob);
    } catch (err) {
      console.error(err);
    } finally {
      loading = false;
    }
  }
</script>

<input type="file" accept="image/*" on:change={handleFile} disabled={loading} />
{#if loading}
  <p>Compressing: {Math.round(progress)}%</p>
{/if}
{#if preview}
  <img src={preview} alt="Compressed" />
{/if}
```

### Angular

```typescript
// image-upload.component.ts
import { Component } from "@angular/core";
import { compressImage, ImageMimeType } from "snapblob/image";

@Component({
  selector: "app-image-upload",
  template: `
    <input type="file" accept="image/*" (change)="handleFile($event)" [disabled]="loading" />
    <div *ngIf="loading">
      <progress [value]="progress" max="100"></progress>
      <span>{{ progress | number:'1.0-0' }}%</span>
    </div>
    <img *ngIf="preview" [src]="preview" alt="Preview" />
  `,
})
export class ImageUploadComponent {
  preview: string | null = null;
  progress = 0;
  loading = false;

  async handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.loading = true;
    this.progress = 0;

    try {
      const blob = await compressImage(file, {
        maxWidth: 1280,
        quality: 0.8,
        mimeType: ImageMimeType.WEBP,
        onProgress: (p) => { this.progress = p; },
      });

      this.preview = URL.createObjectURL(blob);
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}
```

### Vanilla JavaScript

```html
<input type="file" id="fileInput" accept="image/*" />
<progress id="bar" value="0" max="100" hidden></progress>
<img id="preview" hidden />

<script type="module">
  import { compressImage } from "snapblob/image";

  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const bar = document.getElementById("bar");
    bar.hidden = false;

    const blob = await compressImage(file, {
      maxWidth: 1920,
      quality: 0.8,
      onProgress: (p) => { bar.value = p; },
    });

    const preview = document.getElementById("preview");
    preview.src = URL.createObjectURL(blob);
    preview.hidden = false;
    bar.hidden = true;

    console.log(`${file.size} -> ${blob.size} (${Math.round((1 - blob.size / file.size) * 100)}% smaller)`);
  });
</script>
```

### Vanilla JavaScript: Video

```html
<input type="file" id="videoInput" accept="video/*" />
<progress id="bar" value="0" max="100" hidden></progress>
<button id="cancelBtn" hidden>Cancel</button>

<script type="module">
  import { transcodeVideo, applyPreset } from "snapblob/video";

  let controller;

  document.getElementById("videoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    controller = new AbortController();
    const bar = document.getElementById("bar");
    const cancelBtn = document.getElementById("cancelBtn");
    bar.hidden = false;
    cancelBtn.hidden = false;

    try {
      const blob = await transcodeVideo(file, {
        ...applyPreset("balanced"),
        outputFormat: "mp4",
        signal: controller.signal,
        onProgress: (p) => { bar.value = p; },
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "video.mp4";
      a.click();
    } catch (err) {
      if (err.name !== "VideoAbortError") console.error(err);
    } finally {
      bar.hidden = true;
      cancelBtn.hidden = true;
    }
  });

  document.getElementById("cancelBtn").addEventListener("click", () => controller?.abort());
</script>
```

---

## Common Recipes

### Validate Then Compress

```typescript
import { compressImage, validateImage, ImageMimeType } from "snapblob/image";

async function processImage(file: File): Promise<Blob> {
  const { valid, errors } = await validateImage(file, {
    maxFileSize: 20 * 1024 * 1024,
    minSize: [200, 200],
    maxSize: [8000, 8000],
    allowedTypes: [ImageMimeType.JPEG, ImageMimeType.PNG, ImageMimeType.WEBP],
  });

  if (!valid) throw new Error(errors.join(", "));

  return compressImage(file, { maxWidth: 1280, quality: 0.8 });
}
```

### Generate Thumbnail

```typescript
const thumbnail = await compressImage(file, {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.6,
  mimeType: ImageMimeType.WEBP,
});
```

### Upload with FormData

```typescript
const blob = await compressImage(file, { maxWidth: 1920, quality: 0.8 });

const formData = new FormData();
formData.append("avatar", blob, "avatar.webp");
formData.append("userId", "123");

await fetch("/api/upload", { method: "POST", body: formData });
```

### Batch Compress

```typescript
import { compressImages } from "snapblob/image";

const files = Array.from(fileInput.files);

const blobs = await compressImages(files, {
  maxWidth: 1280,
  quality: 0.8,
  concurrency: 4,
  onFileProgress: (index, total, pct) => {
    console.log(`File ${index + 1}/${total}: ${pct}%`);
  },
});
```

### Convert Video Format

```typescript
// MP4 to WebM
const webm = await transcodeVideo(mp4File, {
  codec: "libvpx-vp9",
  crf: 30,
  audioCodec: "libopus",
  audioBitrate: "128k",
  outputFormat: "webm",
});
```

### Extract Audio from Video

```typescript
import { extractAudio } from "snapblob/video";

const mp3 = await extractAudio(videoFile, {
  format: "mp3",
  bitrate: "192k",
  onProgress: (p) => console.log(`${p}%`),
});

// Download the audio file
const a = document.createElement("a");
a.href = URL.createObjectURL(mp3);
a.download = "audio.mp3";
a.click();
```

### Generate Video Thumbnail

```typescript
import { getVideoThumbnail } from "snapblob/video";

const thumbnail = await getVideoThumbnail(videoFile, {
  time: 5,
  width: 320,
  format: "jpeg",
  quality: 3,
});

const img = document.createElement("img");
img.src = URL.createObjectURL(thumbnail);
```

### Auto-Detect Best Image Format

```typescript
import { compressImage, getBestImageFormat } from "snapblob/image";

const format = getBestImageFormat(); // AVIF if supported, else WebP, else JPEG
const blob = await compressImage(file, { maxWidth: 1280, mimeType: format });
```

### Self-Hosted FFmpeg

```typescript
const blob = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  ffmpegBaseUrl: "https://cdn.example.com/ffmpeg",
  ffmpegMTBaseUrl: "https://cdn.example.com/ffmpeg-mt",
});
```

---

## Tree-Shaking

Import from subpaths to only include what you use:

```typescript
// Image only (~45KB gzipped) -- no FFmpeg code
import { compressImage, compressImages, getBestImageFormat } from "snapblob/image";

// Video only -- FFmpeg WASM loaded at runtime on first call
import { transcodeVideo, extractAudio, getVideoThumbnail } from "snapblob/video";

// Lifecycle management
import { preloadFFmpeg, destroyFFmpeg, preloadPica, destroyPica } from "snapblob";

// Everything (only if you need both)
import { compressImage, transcodeVideo } from "snapblob";
```

## Error Handling

All errors are typed classes that extend `Error` with optional `cause` chaining:

```typescript
import { ImageProcessingError, ImageValidationError } from "snapblob/image";
import { VideoTranscodeError, VideoAbortError, VideoValidationError } from "snapblob/video";

try {
  const blob = await compressImage(file);
} catch (err) {
  if (err instanceof ImageProcessingError) {
    console.error(err.message, err.cause);
  }
}

try {
  const blob = await transcodeVideo(file, { signal: controller.signal });
} catch (err) {
  if (err instanceof VideoAbortError) {
    // User cancelled -- not a real error
  } else if (err instanceof VideoTranscodeError) {
    console.error(err.message);
  }
}
```

## FFmpeg WASM Setup

Video transcoding requires Cross-Origin Isolation headers for multi-threaded mode. Without them, FFmpeg runs single-threaded (slower but functional).

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Vite

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
```

### Next.js

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    }];
  },
};
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
};
```

### Nginx

```nginx
add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;
```

## TypeScript

Full type definitions included. Import types from subpaths:

```typescript
import type {
  CompressImageOptions,
  BatchCompressOptions,
  ValidateImageOptions,
  ImageValidationResult,
  ProgressCallback,
} from "snapblob/image";

import type {
  TranscodeVideoOptions,
  ExtractAudioOptions,
  AudioFormat,
  VideoThumbnailOptions,
  ThumbnailFormat,
  VideoInfo,
  VideoPresetName,
  VideoPreset,
} from "snapblob/video";
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Image compression | 66+ | 65+ | 15+ | 79+ |
| Video transcoding | 79+ | 72+ | 16.4+ | 79+ |
| Multi-thread video* | 92+ | 79+ | 15.2+ | 92+ |

\* Requires Cross-Origin Isolation headers.

## Bundle Size

| Import Path | Size (gzipped) | Notes |
|---|---|---|
| `/image` | ~45 KB | Pica library |
| `/video` | < 1 KB | FFmpeg WASM (~30 MB) loaded at runtime on first call |
| Types / constants only | < 1 KB | Zero runtime cost |

## API Reference

### Image

| Function | Signature | Description |
|---|---|---|
| `compressImage` | `(file: File \| Blob, options?: CompressImageOptions) => Promise<Blob>` | Compress and resize a single image |
| `compressImages` | `(files: (File \| Blob)[], options?: BatchCompressOptions) => Promise<Blob[]>` | Batch compress multiple images with concurrency control |
| `validateImage` | `(file: File, options?: ValidateImageOptions) => Promise<ImageValidationResult>` | Validate image dimensions, type, and size |
| `validateImageOrThrow` | `(file: File, options?: ValidateImageOptions) => Promise<void>` | Same as `validateImage` but throws on failure |
| `getBestImageFormat` | `() => ImageMimeType` | Detect best supported format (AVIF > WebP > JPEG) |
| `supportsWebp` | `() => boolean` | Check if the browser supports WebP encoding |
| `supportsAvif` | `() => boolean` | Check if the browser supports AVIF encoding |

### Video

| Function | Signature | Description |
|---|---|---|
| `transcodeVideo` | `(file: File \| Blob, options?: TranscodeVideoOptions) => Promise<Blob>` | Transcode a video with full codec control |
| `extractAudio` | `(file: File \| Blob, options?: ExtractAudioOptions) => Promise<Blob>` | Extract audio track from a video file |
| `getVideoThumbnail` | `(file: File \| Blob, options?: VideoThumbnailOptions) => Promise<Blob>` | Generate a thumbnail image from a video |
| `getVideoInfo` | `(file: File \| Blob) => Promise<VideoInfo>` | Get video metadata (duration, dimensions, size) |
| `applyPreset` | `(name: VideoPresetName) => Partial<TranscodeVideoOptions>` | Get preset options for common scenarios |

### Lifecycle

| Function | Signature | Description |
|---|---|---|
| `preloadFFmpeg` | `() => Promise<void>` | Pre-initialize FFmpeg WASM (~30MB download) |
| `destroyFFmpeg` | `() => void` | Free FFmpeg WASM memory |
| `preloadPica` | `() => Promise<void>` | Pre-initialize the Pica instance |
| `destroyPica` | `() => void` | Release Pica resources |

## Migration from v0.x

v1.0 replaces the class-based API with standalone functions:

```typescript
// Before (v0.x)
const handler = new TypedImageHandler({
  processingConfig: { imageSize: [1280, 720], resizeQuality: 0.8 },
  // ...callbacks, upload config
});
await handler.handle(file);

// After (v1.x)
const blob = await compressImage(file, { maxWidth: 1280, quality: 0.8 });
```

Key changes:
- **No upload logic** -- returns a `Blob`. You handle uploading.
- **No class instantiation** -- call `compressImage()` or `transcodeVideo()` directly.
- **Simpler options** -- flat options object with sensible defaults.
- **Tree-shakeable** -- subpath imports mean you only bundle what you use.

The legacy classes (`TypedImageHandler`, `TypedFFMPEGHandler`, `BaseFileHandler`) are still exported from the main entry point for backward compatibility.

## License

[MIT](./LICENSE)

## Contributing

Contributions are welcome. Please open an issue first to discuss changes.

```bash
git clone https://github.com/aazamov/snapblob.git
cd snapblob
npm install
npm test          # run tests
npm run build     # build library
npm run dev       # dev server with playground
```
