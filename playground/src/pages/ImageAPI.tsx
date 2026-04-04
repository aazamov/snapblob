import CodeBlock from "../components/docs/CodeBlock";
import OptionsTable from "../components/docs/OptionsTable";

const COMPRESS_OPTIONS = [
  { name: "maxWidth", type: "number", default: "Source width", description: "Maximum output width in pixels (never upscales)" },
  { name: "maxHeight", type: "number", default: "Source height", description: "Maximum output height in pixels (never upscales)" },
  { name: "quality", type: "number", default: "0.8", description: "Encoding quality, 0 to 1" },
  { name: "mimeType", type: "ImageMimeType", default: "WEBP", description: "Output format: WEBP, JPEG, PNG, GIF, BMP, TIFF" },
  { name: "resizeFilter", type: "ResizeFilter", default: "MKS2013", description: "Resize algorithm: MKS2013 (best), LANCZOS3, LANCZOS2, HAMMING, BOX (fastest)" },
  { name: "adjustOrientation", type: "boolean", default: "true", description: "Adjust dimensions to match source orientation" },
  { name: "skipIfSmaller", type: "boolean", default: "false", description: "Return original if compression increases file size" },
  { name: "onProgress", type: "(p: number) => void", description: "Progress callback (0-100)" },
];

const BATCH_OPTIONS = [
  { name: "concurrency", type: "number", default: "3", description: "Maximum number of images to compress in parallel" },
  { name: "onFileProgress", type: "(index: number, total: number, pct: number) => void", description: "Progress callback for each file (index is 0-based)" },
];

const VALIDATE_OPTIONS = [
  { name: "maxFileSize", type: "number", description: "Maximum file size in bytes" },
  { name: "minSize", type: "[width, height]", description: "Minimum dimensions in pixels" },
  { name: "maxSize", type: "[width, height]", description: "Maximum dimensions in pixels" },
  { name: "allowedTypes", type: "ImageMimeType[]", description: "Allowed MIME types" },
];

export default function ImageAPI() {
  return (
    <div className="doc-page">
      <h1>Image API</h1>
      <p className="doc-lead">
        Compress, resize, and validate images entirely in the browser using the Pica library for high-quality downscaling.
      </p>

      {/* compressImage */}
      <section className="doc-section">
        <h2 id="compress-image"><code>compressImage(file, options?)</code></h2>
        <p>Compresses and optionally resizes an image. Returns a <code>Promise&lt;Blob&gt;</code>.</p>

        <CodeBlock
          code={`import { compressImage, ImageMimeType, ResizeFilter } from "snapblob/image";

const blob = await compressImage(file, {
  maxWidth: 1280,
  maxHeight: 720,
  quality: 0.8,
  mimeType: ImageMimeType.WEBP,
  resizeFilter: ResizeFilter.LANCZOS3,
  adjustOrientation: true,
  skipIfSmaller: true,
  onProgress: (p) => console.log(\`\${p}%\`),
});`}
          title="Full example"
        />

        <h3>Options</h3>
        <OptionsTable options={COMPRESS_OPTIONS} />

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
            <code>ImageProcessingError</code>
          </div>
        </div>
      </section>

      {/* compressImages */}
      <section className="doc-section">
        <h2 id="compress-images"><code>compressImages(files, options?)</code></h2>
        <p>
          Batch compression with concurrency control. Extends all <code>compressImage</code> options
          with additional batch-specific options. Returns a <code>Promise&lt;Blob[]&gt;</code>.
        </p>

        <CodeBlock
          code={`import { compressImages } from "snapblob/image";

const files = Array.from(fileInput.files);

const blobs = await compressImages(files, {
  maxWidth: 1280,
  quality: 0.8,
  concurrency: 3,
  onFileProgress: (index, total, pct) => {
    console.log(\`File \${index + 1}/\${total}: \${pct}%\`);
  },
});`}
          title="Batch compression"
        />

        <h3>Additional Options</h3>
        <OptionsTable options={BATCH_OPTIONS} />
        <p className="doc-note">
          All <code>compressImage</code> options (maxWidth, quality, mimeType, etc.) are also supported.
        </p>

        <div className="doc-info-grid">
          <div className="doc-info-card">
            <h4>Input</h4>
            <code>(File | Blob)[]</code>
          </div>
          <div className="doc-info-card">
            <h4>Returns</h4>
            <code>Promise&lt;Blob[]&gt;</code>
          </div>
          <div className="doc-info-card">
            <h4>Throws</h4>
            <code>ImageProcessingError</code>
          </div>
        </div>
      </section>

      {/* Format Detection */}
      <section className="doc-section">
        <h2 id="format-detection">Format Detection</h2>
        <p>
          Detect the best image format supported by the current browser. The priority order
          is AVIF &gt; WebP &gt; JPEG.
        </p>

        <CodeBlock
          code={`import {
  getBestImageFormat,
  supportsWebp,
  supportsAvif,
} from "snapblob/image";

// Returns the best supported ImageMimeType
const bestFormat = getBestImageFormat();
// e.g. ImageMimeType.AVIF on Chrome 100+

// Individual checks
if (supportsAvif()) {
  console.log("AVIF supported!");
}
if (supportsWebp()) {
  console.log("WebP supported!");
}

// Combine with compressImage
import { compressImage } from "snapblob/image";

const blob = await compressImage(file, {
  maxWidth: 1280,
  quality: 0.8,
  mimeType: getBestImageFormat(),
});`}
          title="Format detection"
        />

        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Function</th><th>Returns</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>getBestImageFormat()</code></td><td><code>ImageMimeType</code></td><td>Best supported format (AVIF &gt; WebP &gt; JPEG)</td></tr>
              <tr><td><code>supportsWebp()</code></td><td><code>boolean</code></td><td>Whether the browser supports WebP encoding</td></tr>
              <tr><td><code>supportsAvif()</code></td><td><code>boolean</code></td><td>Whether the browser supports AVIF encoding</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Lifecycle Management */}
      <section className="doc-section">
        <h2 id="lifecycle">Lifecycle Management</h2>
        <p>
          Manage the Pica instance lifecycle for optimal memory usage.
        </p>

        <CodeBlock
          code={`import { preloadPica, destroyPica } from "snapblob/image";

// Warm up Pica during app initialization for faster first call
await preloadPica();

// Free the cached Pica instance when no longer needed
// (e.g. on SPA route change, component unmount)
destroyPica();`}
          title="Pica lifecycle"
        />

        <div className="options-table-wrap">
          <table className="options-table">
            <thead>
              <tr><th>Function</th><th>Returns</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>preloadPica()</code></td><td><code>Promise&lt;void&gt;</code></td><td>Create and cache a Pica instance for faster first compression</td></tr>
              <tr><td><code>destroyPica()</code></td><td><code>void</code></td><td>Free the cached Pica instance to release memory</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* validateImage */}
      <section className="doc-section">
        <h2 id="validate-image"><code>validateImage(file, options?)</code></h2>
        <p>
          Validates an image against dimension, type, and size constraints.
          Returns a result object (does not throw).
        </p>

        <CodeBlock
          code={`import { validateImage, ImageMimeType } from "snapblob/image";

const result = await validateImage(file, {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  minSize: [300, 300],
  maxSize: [4096, 4096],
  allowedTypes: [ImageMimeType.JPEG, ImageMimeType.PNG, ImageMimeType.WEBP],
});

if (!result.valid) {
  console.error(result.errors); // string[]
}
// result.width, result.height available when image loaded`}
          title="Validation example"
        />

        <h3>Options</h3>
        <OptionsTable options={VALIDATE_OPTIONS} />

        <h3>Return Type</h3>
        <CodeBlock
          code={`interface ImageValidationResult {
  valid: boolean;
  width?: number;   // populated when image loads
  height?: number;
  errors: string[]; // empty when valid
}`}
          title="ImageValidationResult"
        />

        <div className="doc-note">
          <strong>Note:</strong> <code>validateImage</code> accepts <code>File</code> (not <code>Blob</code>) because it needs the <code>.type</code> property for MIME type checking.
        </div>
      </section>

      {/* validateImageOrThrow */}
      <section className="doc-section">
        <h2 id="validate-or-throw"><code>validateImageOrThrow(file, options?)</code></h2>
        <p>Same as <code>validateImage</code>, but throws <code>ImageValidationError</code> on failure.</p>

        <CodeBlock
          code={`import { validateImageOrThrow } from "snapblob/image";

try {
  await validateImageOrThrow(file, { maxFileSize: 5 * 1024 * 1024 });
  const blob = await compressImage(file, { quality: 0.8 });
} catch (err) {
  if (err instanceof ImageValidationError) {
    // err.message has all errors joined by "; "
  }
}`}
          title="Throw on invalid"
        />
      </section>

      {/* Constants */}
      <section className="doc-section">
        <h2 id="constants">Constants</h2>

        <h3>ImageMimeType</h3>
        <CodeBlock
          code={`enum ImageMimeType {
  PNG   = "image/png",
  JPEG  = "image/jpeg",
  WEBP  = "image/webp",
  GIF   = "image/gif",
  SVG   = "image/svg+xml",
  TIFF  = "image/tiff",
  BMP   = "image/bmp",
  ICO   = "image/x-icon",
}`}
          title="ImageMimeType enum"
        />

        <h3>ResizeFilter</h3>
        <CodeBlock
          code={`enum ResizeFilter {
  BOX      = "box",       // Fastest, lowest quality
  HAMMING  = "hamming",
  LANCZOS2 = "lanczos2",
  LANCZOS3 = "lanczos3",
  MKS2013  = "mks2013",   // Best quality (default)
}`}
          title="ResizeFilter enum"
        />
      </section>

      {/* Error Handling */}
      <section className="doc-section">
        <h2 id="errors">Error Handling</h2>
        <CodeBlock
          code={`import {
  ImageProcessingError,
  ImageValidationError,
} from "snapblob/image";

try {
  const blob = await compressImage(file);
} catch (err) {
  if (err instanceof ImageProcessingError) {
    console.error(err.message);
    console.error(err.cause); // original underlying error
  }
}`}
          title="Error handling"
        />
      </section>
    </div>
  );
}
