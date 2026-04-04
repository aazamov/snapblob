import CodeBlock from "../components/docs/CodeBlock";

export default function GettingStarted() {
  return (
    <div className="doc-page">
      <h1>Getting Started</h1>
      <p className="doc-lead">
        snapblob is a browser-native library for image compression and video transcoding.
        No server required -- everything runs in the browser and returns a standard <code>Blob</code>.
      </p>

      <section className="doc-section">
        <h2 id="installation">Installation</h2>
        <CodeBlock
          code="npm install snapblob"
          language="bash"
          title="Install the package"
        />
        <p>Then install only the peer dependencies you need:</p>
        <CodeBlock
          code={`# Image compression only
npm install pica

# Video transcoding only
npm install @ffmpeg/ffmpeg @ffmpeg/util

# Both
npm install pica @ffmpeg/ffmpeg @ffmpeg/util`}
          language="bash"
          title="Peer dependencies"
        />
      </section>

      <section className="doc-section">
        <h2 id="quick-start">Quick Start</h2>

        <h3>Compress an Image</h3>
        <CodeBlock
          code={`import { compressImage } from "snapblob/image";

const blob = await compressImage(file, {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
});

// blob is a standard Blob -- upload, display, or download it
const url = URL.createObjectURL(blob);`}
          title="Image compression"
        />

        <h3>Batch Compress Multiple Images</h3>
        <CodeBlock
          code={`import { compressImages } from "snapblob/image";

const blobs = await compressImages(files, {
  maxWidth: 1280,
  quality: 0.8,
  concurrency: 3,
  onFileProgress: (index, total, pct) => console.log(\`File \${index + 1}/\${total}: \${pct}%\`),
});`}
          title="Batch compression"
        />

        <h3>Auto-Detect Best Format</h3>
        <CodeBlock
          code={`import { compressImage, getBestImageFormat } from "snapblob/image";

// Automatically uses AVIF > WebP > JPEG based on browser support
const blob = await compressImage(file, {
  maxWidth: 1280,
  mimeType: getBestImageFormat(),
  quality: 0.8,
});`}
          title="Format detection"
        />

        <h3>Transcode a Video</h3>
        <CodeBlock
          code={`import { transcodeVideo, applyPreset } from "snapblob/video";

const blob = await transcodeVideo(file, {
  ...applyPreset("balanced"),
  outputFormat: "mp4",
  onProgress: (p) => console.log(\`\${p}%\`),
});`}
          title="Video transcoding"
        />
      </section>

      <section className="doc-section">
        <h2 id="tree-shaking">Tree-Shaking</h2>
        <p>Import from subpaths to only bundle what you use:</p>
        <CodeBlock
          code={`// Image only (~45KB gzipped) -- no FFmpeg code
import { compressImage } from "snapblob/image";

// Video only -- FFmpeg WASM loaded at runtime
import { transcodeVideo } from "snapblob/video";

// Everything (only if you need both)
import { compressImage, transcodeVideo } from "snapblob";`}
          title="Subpath imports"
        />
      </section>

      <section className="doc-section">
        <h2 id="bundle-size">Bundle Size</h2>
        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Import Path</th><th>Size (gzipped)</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/image</code></td><td>~45 KB</td><td>Pica library</td></tr>
              <tr><td><code>/image</code> (batch)</td><td>~45 KB</td><td>compressImages with concurrency control</td></tr>
              <tr><td><code>/image</code> (format detection)</td><td>&lt; 1 KB</td><td>getBestImageFormat, supportsWebp, supportsAvif</td></tr>
              <tr><td><code>/video</code></td><td>&lt; 1 KB</td><td>FFmpeg WASM (~30 MB) loaded on first call</td></tr>
              <tr><td><code>/video</code> (audio extraction)</td><td>&lt; 1 KB</td><td>extractAudio, shares FFmpeg instance</td></tr>
              <tr><td><code>/video</code> (thumbnails)</td><td>&lt; 1 KB</td><td>getVideoThumbnail, shares FFmpeg instance</td></tr>
              <tr><td>Types / constants</td><td>&lt; 1 KB</td><td>Zero runtime cost</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2 id="browser-support">Browser Support</h2>
        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Feature</th><th>Chrome</th><th>Firefox</th><th>Safari</th><th>Edge</th></tr>
            </thead>
            <tbody>
              <tr><td>Image compression</td><td>66+</td><td>65+</td><td>15+</td><td>79+</td></tr>
              <tr><td>Video transcoding</td><td>79+</td><td>72+</td><td>16.4+</td><td>79+</td></tr>
              <tr><td>Multi-thread video*</td><td>92+</td><td>79+</td><td>15.2+</td><td>92+</td></tr>
            </tbody>
          </table>
        </div>
        <p className="doc-note">* Requires Cross-Origin Isolation headers.</p>
      </section>
    </div>
  );
}
