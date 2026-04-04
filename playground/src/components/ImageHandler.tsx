import { useState, useCallback, useRef } from "react";
import { compressImage, validateImage } from "../../../src/image";
import { ImageMimeType, ResizeFilter } from "../../../src/image/constants";
import type { CompressImageOptions, ValidateImageOptions } from "../../../src/image/types";
import { formatSize, formatDimensions, formatDuration } from "../utils";

// validateImage expects File, not Blob


interface ImageStats {
  originalFileSize: number;
  compressedFileSize: number;
  ratio: number;
  elapsed: number;
}

interface ValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  errors: string[];
}

const MIME_OPTIONS = [
  { value: ImageMimeType.WEBP, label: "WebP" },
  { value: ImageMimeType.JPEG, label: "JPEG" },
  { value: ImageMimeType.PNG, label: "PNG" },
] as const;

const FILTER_OPTIONS = [
  { value: ResizeFilter.MKS2013, label: "MKS 2013 (best)" },
  { value: ResizeFilter.LANCZOS3, label: "Lanczos 3" },
  { value: ResizeFilter.LANCZOS2, label: "Lanczos 2" },
  { value: ResizeFilter.HAMMING, label: "Hamming" },
  { value: ResizeFilter.BOX, label: "Box (fastest)" },
] as const;

export default function ImageHandler() {
  // --- State ---
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // --- Compress options ---
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1080);
  const [quality, setQuality] = useState(0.8);
  const [mimeType, setMimeType] = useState<ImageMimeType>(ImageMimeType.WEBP);
  const [resizeFilter, setResizeFilter] = useState<ResizeFilter>(ResizeFilter.MKS2013);
  const [adjustOrientation, setAdjustOrientation] = useState(true);
  const [skipIfSmaller, setSkipIfSmaller] = useState(false);

  // --- Validation options ---
  const [validateEnabled, setValidateEnabled] = useState(true);
  const [valMaxFileSize, setValMaxFileSize] = useState(20);
  const [valMinWidth, setValMinWidth] = useState(100);
  const [valMinHeight, setValMinHeight] = useState(100);
  const [valMaxWidth, setValMaxWidth] = useState(8000);
  const [valMaxHeight, setValMaxHeight] = useState(8000);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanup = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
  }, [originalUrl, compressedUrl]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      cleanup();
      setError(null);
      setProcessing(true);
      setProgress(0);
      setStats(null);
      setValidation(null);
      setCompressedUrl(null);

      const origUrl = URL.createObjectURL(file);
      setOriginalUrl(origUrl);

      try {
        // --- Validation ---
        if (validateEnabled) {
          const valOptions: ValidateImageOptions = {
            maxFileSize: valMaxFileSize * 1024 * 1024,
            minSize: [valMinWidth, valMinHeight],
            maxSize: [valMaxWidth, valMaxHeight],
            allowedTypes: [...MIME_OPTIONS.map((o) => o.value)],
          };
          const result = await validateImage(file, valOptions);
          setValidation(result);
          if (!result.valid) {
            setError(result.errors.join(" | "));
            setProcessing(false);
            return;
          }
        }

        // --- Compression ---
        const options: CompressImageOptions = {
          maxWidth,
          maxHeight,
          quality,
          mimeType,
          resizeFilter,
          adjustOrientation,
          skipIfSmaller,
          onProgress: setProgress,
        };

        const startTime = performance.now();
        const blob = await compressImage(file, options);
        const elapsed = performance.now() - startTime;

        const compUrl = URL.createObjectURL(blob);
        setCompressedUrl(compUrl);
        setStats({
          originalFileSize: file.size,
          compressedFileSize: blob.size,
          ratio: blob.size / file.size,
          elapsed,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setProcessing(false);
      }
    },
    [
      cleanup, maxWidth, maxHeight, quality, mimeType, resizeFilter,
      adjustOrientation, skipIfSmaller, validateEnabled, valMaxFileSize,
      valMinWidth, valMinHeight, valMaxWidth, valMaxHeight,
    ]
  );

  const mimeExt = mimeType === ImageMimeType.WEBP ? "webp" : mimeType === ImageMimeType.JPEG ? "jpg" : "png";

  return (
    <section className="handler-section">
      <div className="section-header">
        <div>
          <h2>Image Compressor</h2>
          <p className="section-sub">
            <code>compressImage(file, options)</code> +{" "}
            <code>validateImage(file, options)</code>
          </p>
        </div>
        <button
          className="toggle-btn"
          onClick={() => setShowOptions(!showOptions)}
          type="button"
        >
          {showOptions ? "Hide Options" : "Show Options"}
        </button>
      </div>

      {/* --- OPTIONS PANEL --- */}
      {showOptions && (
        <div className="options-panel">
          <div className="options-group">
            <h4>Compression</h4>
            <div className="options-grid">
              <label>
                Max Width
                <input type="number" value={maxWidth} min={1} max={16000}
                  onChange={(e) => setMaxWidth(Number(e.target.value))} />
              </label>
              <label>
                Max Height
                <input type="number" value={maxHeight} min={1} max={16000}
                  onChange={(e) => setMaxHeight(Number(e.target.value))} />
              </label>
              <label>
                Quality ({Math.round(quality * 100)}%)
                <input type="range" min={0.05} max={1} step={0.05} value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))} />
              </label>
              <label>
                Output Format
                <select value={mimeType} onChange={(e) => setMimeType(e.target.value as ImageMimeType)}>
                  {MIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Resize Filter
                <select value={resizeFilter} onChange={(e) => setResizeFilter(e.target.value as ResizeFilter)}>
                  {FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={adjustOrientation}
                  onChange={(e) => setAdjustOrientation(e.target.checked)} />
                Adjust Orientation
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={skipIfSmaller}
                  onChange={(e) => setSkipIfSmaller(e.target.checked)} />
                Skip if Smaller
              </label>
            </div>
          </div>

          <div className="options-group">
            <h4>
              <label className="checkbox-label inline">
                <input type="checkbox" checked={validateEnabled}
                  onChange={(e) => setValidateEnabled(e.target.checked)} />
                Validation
              </label>
            </h4>
            {validateEnabled && (
              <div className="options-grid">
                <label>
                  Max File Size (MB)
                  <input type="number" value={valMaxFileSize} min={0.1} step={0.1}
                    onChange={(e) => setValMaxFileSize(Number(e.target.value))} />
                </label>
                <label>
                  Min Width
                  <input type="number" value={valMinWidth} min={0}
                    onChange={(e) => setValMinWidth(Number(e.target.value))} />
                </label>
                <label>
                  Min Height
                  <input type="number" value={valMinHeight} min={0}
                    onChange={(e) => setValMinHeight(Number(e.target.value))} />
                </label>
                <label>
                  Max Width
                  <input type="number" value={valMaxWidth} min={1}
                    onChange={(e) => setValMaxWidth(Number(e.target.value))} />
                </label>
                <label>
                  Max Height
                  <input type="number" value={valMaxHeight} min={1}
                    onChange={(e) => setValMaxHeight(Number(e.target.value))} />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- FILE INPUT --- */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
        onChange={handleFile}
        disabled={processing}
      />

      {/* --- ERROR --- */}
      {error && <div className="message error">{error}</div>}

      {/* --- VALIDATION INFO --- */}
      {validation && validation.valid && (
        <div className="message success">
          Validation passed ({validation.width} x {validation.height})
        </div>
      )}

      {/* --- PROGRESS --- */}
      {processing && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}

      {/* --- PREVIEW --- */}
      <div className="preview-grid">
        <div className="preview-card">
          <h3>Original</h3>
          <div className="preview-box">
            {originalUrl ? <img src={originalUrl} alt="Original" /> : <span className="placeholder">No image</span>}
          </div>
          {stats && (
            <div className="stat-list">
              {validation?.width && validation?.height && <span>{formatDimensions(validation.width, validation.height)}</span>}
              <span>{formatSize(stats.originalFileSize)}</span>
            </div>
          )}
        </div>
        <div className="preview-card">
          <h3>Compressed</h3>
          <div className="preview-box">
            {compressedUrl ? <img src={compressedUrl} alt="Compressed" /> : <span className="placeholder">{processing ? "Processing..." : "No result"}</span>}
          </div>
          {stats && (
            <div className="stat-list">
              <span>{formatSize(stats.compressedFileSize)}</span>
              <span className={stats.ratio < 1 ? "stat-good" : "stat-bad"}>
                {stats.ratio < 1
                  ? `${Math.round((1 - stats.ratio) * 100)}% smaller`
                  : `${Math.round((stats.ratio - 1) * 100)}% larger`}
              </span>
              <span className="stat-muted">{formatDuration(stats.elapsed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* --- DOWNLOAD --- */}
      {compressedUrl && (
        <div className="actions">
          <a href={compressedUrl} download={`compressed.${mimeExt}`} className="btn btn-primary">
            Download {formatSize(stats?.compressedFileSize ?? 0)}
          </a>
          <button type="button" className="btn btn-secondary"
            onClick={() => {
              cleanup();
              setOriginalUrl(null);
              setCompressedUrl(null);
              setStats(null);
              setValidation(null);
              setError(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}>
            Reset
          </button>
        </div>
      )}

      {/* --- CODE PREVIEW --- */}
      {stats && (
        <details className="code-preview">
          <summary>View generated code</summary>
          <pre>{`import { compressImage } from "snapblob/image";
${validateEnabled ? `import { validateImage } from "snapblob/image";\n` : ""}
${validateEnabled ? `const validation = await validateImage(file, {
  maxFileSize: ${valMaxFileSize} * 1024 * 1024,
  minSize: [${valMinWidth}, ${valMinHeight}],
  maxSize: [${valMaxWidth}, ${valMaxHeight}],
});
if (!validation.valid) throw new Error(validation.errors.join(", "));
` : ""}const result = await compressImage(file, {
  maxWidth: ${maxWidth},
  maxHeight: ${maxHeight},
  quality: ${quality},
  mimeType: "${mimeType}",
  resizeFilter: "${resizeFilter}",${adjustOrientation ? "" : "\n  adjustOrientation: false,"}${skipIfSmaller ? "\n  skipIfSmaller: true," : ""}
  onProgress: (p) => console.log(p + "%"),
});

// result.blob → ${mimeExt.toUpperCase()} Blob (${formatSize(stats.compressedFileSize)})`}</pre>
        </details>
      )}
    </section>
  );
}
