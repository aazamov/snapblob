import CodeBlock from "../components/docs/CodeBlock";

export default function Recipes() {
  return (
    <div className="doc-page">
      <h1>Recipes</h1>
      <p className="doc-lead">
        Common patterns and real-world use cases.
      </p>

      <section className="doc-section">
        <h2 id="validate-then-compress">Validate Then Compress</h2>
        <CodeBlock
          code={`import {
  compressImage,
  validateImage,
  ImageMimeType,
} from "snapblob/image";

async function processImage(file: File): Promise<Blob> {
  const { valid, errors } = await validateImage(file, {
    maxFileSize: 20 * 1024 * 1024,
    minSize: [200, 200],
    maxSize: [8000, 8000],
    allowedTypes: [ImageMimeType.JPEG, ImageMimeType.PNG, ImageMimeType.WEBP],
  });

  if (!valid) throw new Error(errors.join(", "));

  return compressImage(file, { maxWidth: 1280, quality: 0.8 });
}`}
          title="Validate before processing"
        />
      </section>

      <section className="doc-section">
        <h2 id="thumbnail">Generate Thumbnail</h2>
        <CodeBlock
          code={`import { compressImage, ImageMimeType } from "snapblob/image";

const thumbnail = await compressImage(file, {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.6,
  mimeType: ImageMimeType.WEBP,
});

// Use as avatar, preview, etc.
const url = URL.createObjectURL(thumbnail);`}
          title="Small thumbnail"
        />
      </section>

      <section className="doc-section">
        <h2 id="upload-formdata">Upload with FormData</h2>
        <CodeBlock
          code={`import { compressImage } from "snapblob/image";

const blob = await compressImage(file, { maxWidth: 1920, quality: 0.8 });

const formData = new FormData();
formData.append("avatar", blob, "avatar.webp");
formData.append("userId", "123");

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});`}
          title="FormData upload"
        />
      </section>

      <section className="doc-section">
        <h2 id="batch">Batch Compress Multiple Images</h2>
        <CodeBlock
          code={`import { compressImage } from "snapblob/image";

const files = Array.from(fileInput.files);

// All at once
const blobs = await Promise.all(
  files.map((f) => compressImage(f, { maxWidth: 1280, quality: 0.8 }))
);

// With concurrency limit (avoid memory pressure)
async function batchCompress(files: File[], concurrency = 3): Promise<Blob[]> {
  const results: Blob[] = [];
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((f) => compressImage(f, { maxWidth: 1280, quality: 0.8 }))
    );
    results.push(...batchResults);
  }
  return results;
}`}
          title="Batch processing"
        />
      </section>

      <section className="doc-section">
        <h2 id="convert-format">Convert Video Format</h2>
        <CodeBlock
          code={`import { transcodeVideo } from "snapblob/video";

// MP4 to WebM
const webm = await transcodeVideo(mp4File, {
  codec: "libvpx-vp9",
  crf: 30,
  audioCodec: "libopus",
  audioBitrate: "128k",
  outputFormat: "webm",
});

// Any format to MP4 (H.264 + AAC -- most compatible)
const mp4 = await transcodeVideo(inputFile, {
  codec: "libx264",
  preset: "fast",
  crf: 23,
  audioCodec: "aac",
  audioBitrate: "128k",
  outputFormat: "mp4",
});`}
          title="Format conversion"
        />
      </section>

      <section className="doc-section">
        <h2 id="preview-before-upload">Preview Before Upload</h2>
        <CodeBlock
          code={`import { compressImage } from "snapblob/image";

const blob = await compressImage(file, { maxWidth: 1280, quality: 0.8 });
const url = URL.createObjectURL(blob);

// Show preview
const img = document.createElement("img");
img.src = url;
previewContainer.appendChild(img);

// On confirm, upload
uploadButton.onclick = async () => {
  const formData = new FormData();
  formData.append("image", blob, "photo.webp");
  await fetch("/api/upload", { method: "POST", body: formData });

  // Clean up
  URL.revokeObjectURL(url);
};`}
          title="Preview workflow"
        />
      </section>

      <section className="doc-section">
        <h2 id="video-info-before-transcode">Check Video Info Before Transcoding</h2>
        <CodeBlock
          code={`import { getVideoInfo, transcodeVideo, applyPreset } from "snapblob/video";

const info = await getVideoInfo(file);

// Only transcode if the video is too large
if (info.fileSize > 50 * 1024 * 1024) { // > 50MB
  const blob = await transcodeVideo(file, {
    ...applyPreset("small-file"),
    onProgress: (p) => console.log(\`\${p}%\`),
  });
  return blob;
}

// Already small enough, use as-is
return file;`}
          title="Conditional transcoding"
        />
      </section>

      <section className="doc-section">
        <h2 id="self-hosted-ffmpeg">Self-Hosted FFmpeg</h2>
        <CodeBlock
          code={`import { transcodeVideo, applyPreset } from "snapblob/video";

// Use your own CDN instead of unpkg
const blob = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  ffmpegBaseUrl: "https://cdn.yoursite.com/ffmpeg",
  ffmpegMTBaseUrl: "https://cdn.yoursite.com/ffmpeg-mt",
});`}
          title="Custom FFmpeg CDN"
        />
        <p className="doc-note">
          Download FFmpeg core files from
          <code> @ffmpeg/core@0.12.6 </code> and
          <code> @ffmpeg/core-mt@0.12.6 </code> npm packages and host them on your CDN.
        </p>
      </section>

      <section className="doc-section">
        <h2 id="auto-detect-format">Auto-Detect Best Format</h2>
        <CodeBlock
          code={`import { getBestImageFormat, compressImage } from "snapblob/image";

// Automatically picks AVIF > WebP > JPEG based on browser support
const blob = await compressImage(file, {
  mimeType: getBestImageFormat(),
  quality: 0.8,
});`}
          title="Best format detection"
        />
      </section>

      <section className="doc-section">
        <h2 id="extract-audio">Extract Audio from Video</h2>
        <CodeBlock
          code={`import { extractAudio } from "snapblob/video";

const mp3 = await extractAudio(videoFile, {
  format: "mp3",
  bitrate: "192k",
  onProgress: (p) => console.log(\`\${p}%\`),
});

// Download the extracted audio
const url = URL.createObjectURL(mp3);
const a = document.createElement("a");
a.href = url;
a.download = "audio.mp3";
a.click();`}
          title="Audio extraction"
        />
      </section>

      <section className="doc-section">
        <h2 id="video-thumbnail">Generate Video Thumbnail</h2>
        <CodeBlock
          code={`import { getVideoThumbnail } from "snapblob/video";

const thumb = await getVideoThumbnail(videoFile, {
  time: 5,        // capture at 5 seconds
  width: 320,     // scale to 320px wide
  format: "jpeg",
});

const url = URL.createObjectURL(thumb);
document.getElementById("thumbnail").src = url;`}
          title="Video thumbnail"
        />
      </section>

      <section className="doc-section">
        <h2 id="preload">Preload for Better UX</h2>
        <CodeBlock
          code={`import { preloadPica } from "snapblob/image";
import { preloadFFmpeg } from "snapblob/video";

// Call during app initialization to avoid delays on first use
await Promise.all([preloadPica(), preloadFFmpeg()]);`}
          title="Preload resources"
        />
      </section>

      <section className="doc-section">
        <h2 id="cleanup-spa">Cleanup in SPA Navigation</h2>
        <CodeBlock
          code={`import { destroyPica } from "snapblob/image";
import { destroyFFmpeg } from "snapblob/video";

// In React useEffect cleanup or Vue onUnmounted
useEffect(() => {
  return () => {
    destroyPica();
    destroyFFmpeg();
  };
}, []);`}
          title="SPA cleanup"
        />
        <p className="doc-note">
          Calling <code>destroyFFmpeg()</code> frees ~30MB of WASM memory. Both functions are safe
          to call even if the instance was never created.
        </p>
      </section>

      <section className="doc-section">
        <h2 id="migration">Migration from v0.x</h2>
        <CodeBlock
          code={`// Before (v0.x) -- class-based with upload logic baked in
const handler = new TypedImageHandler({
  processingConfig: {
    imageSize: [1280, 720],
    resizeQuality: 0.8,
    imageMimeType: MediaImageMimeType.WEBP,
  },
  // ...callbacks, upload config, CSRF tokens
});
await handler.handle(file);

// After (v1.x) -- standalone function, returns Blob
const blob = await compressImage(file, {
  maxWidth: 1280,
  maxHeight: 720,
  quality: 0.8,
  mimeType: ImageMimeType.WEBP,
});
// Upload the blob yourself using fetch, axios, etc.`}
          title="v0.x to v1.x migration"
        />
      </section>
    </div>
  );
}
