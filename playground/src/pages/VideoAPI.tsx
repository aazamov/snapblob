import CodeBlock from "../components/docs/CodeBlock";
import OptionsTable from "../components/docs/OptionsTable";

const TRANSCODE_OPTIONS = [
  { name: "presetName", type: "VideoPresetName", description: 'Named preset: "high-quality", "balanced", "small-file", "social-media"' },
  { name: "codec", type: "string", default: '"libx264"', description: 'Video codec ("libx264", "libx265", "libvpx-vp9", "mpeg4")' },
  { name: "preset", type: "string", description: 'Encoder speed: "ultrafast" to "veryslow"' },
  { name: "crf", type: "number", description: "Constant Rate Factor. 18 = high quality, 23 = balanced, 28 = small" },
  { name: "maxBitrate", type: "string | number", description: 'Max video bitrate ("5M", "2500k", or 2500000)' },
  { name: "audioBitrate", type: "string | number", description: 'Audio bitrate ("128k", "192k")' },
  { name: "audioCodec", type: "string", description: 'Audio codec ("aac", "libopus")' },
  { name: "pixelFormat", type: "string", default: '"yuv420p"', description: "Pixel format for compatibility" },
  { name: "outputFormat", type: "string", default: "Input ext", description: 'Output container ("mp4", "webm")' },
  { name: "threads", type: "number", default: "0 (auto)", description: "Number of encoding threads" },
  { name: "signal", type: "AbortSignal", description: "Cancel the transcoding operation" },
  { name: "onProgress", type: "(p: number) => void", description: "Progress callback (0-100)" },
  { name: "ffmpegBaseUrl", type: "string", default: "unpkg CDN", description: "Custom URL for FFmpeg core files" },
  { name: "ffmpegMTBaseUrl", type: "string", default: "unpkg CDN", description: "Custom URL for FFmpeg multi-thread core" },
];

const EXTRACT_AUDIO_OPTIONS = [
  { name: "format", type: '"mp3" | "aac" | "opus" | "wav"', default: '"mp3"', description: "Output audio format" },
  { name: "bitrate", type: "string | number", default: '"128k"', description: 'Audio bitrate ("128k", "192k", "320k")' },
  { name: "signal", type: "AbortSignal", description: "Cancel the extraction operation" },
  { name: "onProgress", type: "(p: number) => void", description: "Progress callback (0-100)" },
  { name: "onLog", type: "(msg: string) => void", description: "FFmpeg log callback" },
];

const THUMBNAIL_OPTIONS = [
  { name: "time", type: "number", default: "0", description: "Time in seconds to capture the frame" },
  { name: "width", type: "number", description: "Output width (height scales proportionally)" },
  { name: "format", type: '"jpeg" | "png" | "webp"', default: '"jpeg"', description: "Output image format" },
  { name: "quality", type: "number", default: "5", description: "Quality for JPEG (1-31, lower is better)" },
];

export default function VideoAPI() {
  return (
    <div className="doc-page">
      <h1>Video API</h1>
      <p className="doc-lead">
        Transcode videos in the browser using FFmpeg WASM. Full codec control, progress tracking, and cancellation support.
      </p>

      {/* transcodeVideo */}
      <section className="doc-section">
        <h2 id="transcode-video"><code>transcodeVideo(file, options?)</code></h2>
        <p>
          Transcodes a video using FFmpeg WASM. The FFmpeg core (~30MB) is downloaded and cached
          on the first call. Returns a <code>Promise&lt;Blob&gt;</code>.
        </p>

        <CodeBlock
          code={`import { transcodeVideo, applyPreset } from "snapblob/video";

// Using a preset
const blob = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  outputFormat: "mp4",
  onProgress: (p) => console.log(\`\${p}%\`),
});`}
          title="With preset"
        />

        <CodeBlock
          code={`// Full custom control
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
});`}
          title="Full custom"
        />

        <h3>Options</h3>
        <OptionsTable options={TRANSCODE_OPTIONS} />

        <div className="doc-info-grid">
          <div className="doc-info-card">
            <h4>Input</h4>
            <code>File | Blob</code>
          </div>
          <div className="doc-info-card">
            <h4>Returns</h4>
            <code>Promise&lt;Blob&gt;</code>
          </div>
          <div className="doc-info-card">
            <h4>Throws</h4>
            <code>VideoTranscodeError</code>, <code>VideoAbortError</code>, <code>VideoValidationError</code>
          </div>
        </div>
      </section>

      {/* Presets */}
      <section className="doc-section">
        <h2 id="presets">Video Presets</h2>
        <p>Built-in presets for common scenarios. Use <code>applyPreset()</code> and spread into your options:</p>

        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Preset</th><th>CRF</th><th>Max Bitrate</th><th>Speed</th><th>Use Case</th></tr>
            </thead>
            <tbody>
              <tr><td><code>"high-quality"</code></td><td>18</td><td>8M</td><td>slow</td><td>Archiving, professional</td></tr>
              <tr><td><code>"balanced"</code></td><td>23</td><td>5M</td><td>medium</td><td>General purpose</td></tr>
              <tr><td><code>"small-file"</code></td><td>28</td><td>2M</td><td>fast</td><td>File size priority</td></tr>
              <tr><td><code>"social-media"</code></td><td>26</td><td>3M</td><td>fast</td><td>Social platform sharing</td></tr>
              <tr><td><code>"instagram-feed"</code></td><td>23</td><td>3.5M</td><td>fast</td><td>Instagram feed</td></tr>
              <tr><td><code>"instagram-story"</code></td><td>23</td><td>4M</td><td>fast</td><td>Stories</td></tr>
              <tr><td><code>"tiktok"</code></td><td>23</td><td>4M</td><td>fast</td><td>TikTok</td></tr>
              <tr><td><code>"youtube-1080p"</code></td><td>20</td><td>8M</td><td>medium</td><td>YouTube HD</td></tr>
              <tr><td><code>"youtube-4k"</code></td><td>18</td><td>20M</td><td>slow</td><td>YouTube 4K</td></tr>
              <tr><td><code>"twitter"</code></td><td>24</td><td>5M</td><td>fast</td><td>Twitter/X</td></tr>
            </tbody>
          </table>
        </div>

        <CodeBlock
          code={`import { applyPreset, VIDEO_PRESETS } from "snapblob/video";

// Spread preset, override specific values
const blob = await transcodeVideo(file, {
  ...applyPreset("high-quality"),
  outputFormat: "webm",
});

// Inspect preset values
console.log(VIDEO_PRESETS["balanced"]);
// { codec: "libx264", preset: "medium", crf: 23,
//   maxBitrate: "5M", audioBitrate: "128k", pixelFormat: "yuv420p" }`}
          title="Using presets"
        />
      </section>

      {/* getVideoInfo */}
      <section className="doc-section">
        <h2 id="get-video-info"><code>getVideoInfo(file)</code></h2>
        <p>Returns video metadata without transcoding.</p>

        <CodeBlock
          code={`import { getVideoInfo } from "snapblob/video";

const info = await getVideoInfo(file);
// { duration: 12.5, width: 1920, height: 1080,
//   fileSize: 5242880, mimeType: "video/mp4" }`}
          title="Get metadata"
        />

        <CodeBlock
          code={`interface VideoInfo {
  duration: number;  // seconds
  width: number;     // pixels
  height: number;    // pixels
  fileSize: number;  // bytes
  mimeType: string;
}`}
          title="VideoInfo type"
        />
      </section>

      {/* extractAudio */}
      <section className="doc-section">
        <h2 id="extract-audio"><code>extractAudio(file, options?)</code></h2>
        <p>
          Extract audio from a video file. Returns a <code>Promise&lt;Blob&gt;</code> containing the audio track.
        </p>

        <CodeBlock
          code={`import { extractAudio } from "snapblob/video";

const mp3 = await extractAudio(videoFile, {
  format: "mp3",
  bitrate: "192k",
  onProgress: (p) => console.log(\`\${p}%\`),
});

// Download the audio
const url = URL.createObjectURL(mp3);
const a = document.createElement("a");
a.href = url;
a.download = "audio.mp3";
a.click();`}
          title="Extract audio"
        />

        <h3>Options</h3>
        <OptionsTable options={EXTRACT_AUDIO_OPTIONS} />

        <h3>Format to Codec Mapping</h3>
        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Format</th><th>Codec</th><th>Container</th></tr>
            </thead>
            <tbody>
              <tr><td><code>"mp3"</code></td><td>libmp3lame</td><td>.mp3</td></tr>
              <tr><td><code>"aac"</code></td><td>aac</td><td>.m4a</td></tr>
              <tr><td><code>"opus"</code></td><td>libopus</td><td>.ogg</td></tr>
              <tr><td><code>"wav"</code></td><td>pcm_s16le</td><td>.wav</td></tr>
            </tbody>
          </table>
        </div>

        <div className="doc-info-grid">
          <div className="doc-info-card">
            <h4>Input</h4>
            <code>File | Blob</code>
          </div>
          <div className="doc-info-card">
            <h4>Returns</h4>
            <code>Promise&lt;Blob&gt;</code>
          </div>
          <div className="doc-info-card">
            <h4>Throws</h4>
            <code>VideoTranscodeError</code>
          </div>
        </div>
      </section>

      {/* getVideoThumbnail */}
      <section className="doc-section">
        <h2 id="get-video-thumbnail"><code>getVideoThumbnail(file, options?)</code></h2>
        <p>
          Extract a single frame from a video as an image. Returns a <code>Promise&lt;Blob&gt;</code>.
        </p>

        <CodeBlock
          code={`import { getVideoThumbnail } from "snapblob/video";

const thumbnail = await getVideoThumbnail(videoFile, {
  time: 5,        // capture at 5 seconds
  width: 320,     // 320px wide (height scales proportionally)
  format: "jpeg",
  quality: 5,     // 1-31, lower is better quality
});

const url = URL.createObjectURL(thumbnail);
document.getElementById("thumb").src = url;`}
          title="Extract thumbnail"
        />

        <h3>Options</h3>
        <OptionsTable options={THUMBNAIL_OPTIONS} />

        <div className="doc-info-grid">
          <div className="doc-info-card">
            <h4>Input</h4>
            <code>File | Blob</code>
          </div>
          <div className="doc-info-card">
            <h4>Returns</h4>
            <code>Promise&lt;Blob&gt;</code>
          </div>
          <div className="doc-info-card">
            <h4>Throws</h4>
            <code>VideoTranscodeError</code>
          </div>
        </div>
      </section>

      {/* Lifecycle Management */}
      <section className="doc-section">
        <h2 id="lifecycle">Lifecycle Management</h2>
        <p>
          Manage the FFmpeg WASM instance lifecycle. The FFmpeg core is ~30MB -- freeing it when
          not in use can significantly reduce memory pressure.
        </p>

        <CodeBlock
          code={`import { preloadFFmpeg, destroyFFmpeg } from "snapblob/video";

// Warm up FFmpeg during app initialization
// Downloads and initializes the WASM core (~30MB)
await preloadFFmpeg();

// Free the FFmpeg instance and ~30MB of WASM memory
// Call when video processing is no longer needed
destroyFFmpeg();`}
          title="FFmpeg lifecycle"
        />

        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Function</th><th>Returns</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>preloadFFmpeg()</code></td><td><code>Promise&lt;void&gt;</code></td><td>Download and initialize FFmpeg WASM for faster first transcode</td></tr>
              <tr><td><code>destroyFFmpeg()</code></td><td><code>void</code></td><td>Free the FFmpeg WASM instance (~30MB memory)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Cancellation */}
      <section className="doc-section">
        <h2 id="cancellation">Cancelling Transcoding</h2>
        <CodeBlock
          code={`import { VideoAbortError } from "snapblob/video";

const controller = new AbortController();

const promise = transcodeVideo(file, {
  ...applyPreset("balanced"),
  signal: controller.signal,
});

// Cancel it
cancelButton.onclick = () => controller.abort();

try {
  const blob = await promise;
} catch (err) {
  if (err instanceof VideoAbortError) {
    console.log("User cancelled");
  }
}`}
          title="AbortController"
        />
      </section>

      {/* FFmpeg Setup */}
      <section className="doc-section">
        <h2 id="ffmpeg-setup">FFmpeg WASM Setup</h2>
        <p>
          Multi-threaded mode requires <strong>Cross-Origin Isolation</strong> headers.
          Without them, FFmpeg runs single-threaded (slower but functional).
        </p>

        <CodeBlock
          code={`Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`}
          language="http"
          title="Required HTTP headers"
        />

        <h3>Vite</h3>
        <CodeBlock
          code={`// vite.config.ts
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
});`}
          title="Vite config"
        />

        <h3>Next.js</h3>
        <CodeBlock
          code={`// next.config.js
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
};`}
          language="javascript"
          title="Next.js config"
        />

        <h3>Nginx</h3>
        <CodeBlock
          code={`add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;`}
          language="nginx"
          title="Nginx config"
        />

        <h3>Self-Hosted FFmpeg Core</h3>
        <CodeBlock
          code={`const blob = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  ffmpegBaseUrl: "https://cdn.example.com/ffmpeg",
  ffmpegMTBaseUrl: "https://cdn.example.com/ffmpeg-mt",
});`}
          title="Custom FFmpeg URL"
        />
      </section>

      {/* Error Handling */}
      <section className="doc-section">
        <h2 id="errors">Error Handling</h2>
        <CodeBlock
          code={`import {
  VideoTranscodeError,
  VideoAbortError,
  VideoValidationError,
} from "snapblob/video";

try {
  const blob = await transcodeVideo(file, { signal: controller.signal });
} catch (err) {
  if (err instanceof VideoAbortError) {
    // User cancelled -- not a real error
  } else if (err instanceof VideoValidationError) {
    // Input file issue (e.g. empty file)
  } else if (err instanceof VideoTranscodeError) {
    // FFmpeg failure
    console.error(err.message, err.cause);
  }
}`}
          title="Error classes"
        />
      </section>
    </div>
  );
}
