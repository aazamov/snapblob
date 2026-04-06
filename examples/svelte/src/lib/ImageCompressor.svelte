<script lang="ts">
  import { compressImage, validateImage } from "../../../../src/image";
  import { ImageMimeType, ResizeFilter } from "../../../../src/image/constants";
  import type { CompressImageOptions, ValidateImageOptions } from "../../../../src/image/types";
  import { formatSize, formatDuration } from "../utils";

  let originalUrl = $state<string | null>(null);
  let compressedUrl = $state<string | null>(null);
  let progress = $state(0);
  let error = $state<string | null>(null);
  let processing = $state(false);
  let showOptions = $state(false);

  let maxWidth = $state(1920);
  let maxHeight = $state(1080);
  let quality = $state(0.8);
  let mimeType = $state<ImageMimeType>(ImageMimeType.WEBP);
  let resizeFilter = $state<ResizeFilter>(ResizeFilter.MKS2013);
  let skipIfSmaller = $state(false);

  let stats = $state<{
    originalSize: number;
    compressedSize: number;
    ratio: number;
    elapsed: number;
  } | null>(null);

  let qualityPercent = $derived(Math.round(quality * 100));
  let mimeExt = $derived(
    mimeType === ImageMimeType.WEBP ? "webp" : mimeType === ImageMimeType.JPEG ? "jpg" : "png",
  );

  function cleanup() {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
  }

  async function handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    cleanup();
    error = null;
    processing = true;
    progress = 0;
    stats = null;
    compressedUrl = null;

    originalUrl = URL.createObjectURL(file);

    try {
      const valOpts: ValidateImageOptions = {
        maxFileSize: 20 * 1024 * 1024,
        allowedTypes: [ImageMimeType.WEBP, ImageMimeType.JPEG, ImageMimeType.PNG],
      };
      const result = await validateImage(file, valOpts);
      if (!result.valid) {
        error = result.errors.join(" | ");
        processing = false;
        return;
      }

      const options: CompressImageOptions = {
        maxWidth,
        maxHeight,
        quality,
        mimeType,
        resizeFilter,
        skipIfSmaller,
        onProgress: (p) => {
          progress = p;
        },
      };

      const startTime = performance.now();
      const blob = await compressImage(file, options);
      const elapsed = performance.now() - startTime;

      compressedUrl = URL.createObjectURL(blob);
      stats = {
        originalSize: file.size,
        compressedSize: blob.size,
        ratio: blob.size / file.size,
        elapsed,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    } finally {
      processing = false;
    }
  }

  function reset() {
    cleanup();
    originalUrl = null;
    compressedUrl = null;
    stats = null;
    error = null;
    progress = 0;
  }
</script>

<div class="card">
  <div class="card-header">
    <div>
      <h2>Image Compressor</h2>
      <p><code>compressImage(file, options)</code></p>
    </div>
    <button class="btn btn-secondary" onclick={() => (showOptions = !showOptions)}>
      {showOptions ? "Hide Options" : "Show Options"}
    </button>
  </div>

  {#if showOptions}
    <div class="options">
      <div class="options-grid">
        <label>
          Max Width
          <input type="number" bind:value={maxWidth} min="1" max="16000" />
        </label>
        <label>
          Max Height
          <input type="number" bind:value={maxHeight} min="1" max="16000" />
        </label>
        <label>
          Quality ({qualityPercent}%)
          <input type="range" bind:value={quality} min="0.05" max="1" step="0.05" />
        </label>
        <label>
          Output Format
          <select bind:value={mimeType}>
            <option value={ImageMimeType.WEBP}>WebP</option>
            <option value={ImageMimeType.JPEG}>JPEG</option>
            <option value={ImageMimeType.PNG}>PNG</option>
          </select>
        </label>
        <label>
          Resize Filter
          <select bind:value={resizeFilter}>
            <option value={ResizeFilter.MKS2013}>MKS 2013 (best)</option>
            <option value={ResizeFilter.LANCZOS3}>Lanczos 3</option>
            <option value={ResizeFilter.LANCZOS2}>Lanczos 2</option>
            <option value={ResizeFilter.BOX}>Box (fastest)</option>
          </select>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={skipIfSmaller} />
          Skip if Smaller
        </label>
      </div>
    </div>
  {/if}

  <input
    class="file-input"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    disabled={processing}
    onchange={handleFile}
  />

  {#if error}
    <div class="error-msg">{error}</div>
  {/if}

  {#if processing}
    <div class="progress-bar">
      <div class="fill" style:width="{progress}%"></div>
    </div>
    <div class="progress-text">{Math.round(progress)}%</div>
  {/if}

  {#if originalUrl}
    <div class="preview-grid">
      <div>
        <h3>Original</h3>
        <div class="preview-box">
          <img src={originalUrl} alt="Original" />
        </div>
        {#if stats}
          <div class="stats">
            <span>{formatSize(stats.originalSize)}</span>
          </div>
        {/if}
      </div>
      <div>
        <h3>Compressed</h3>
        <div class="preview-box">
          {#if compressedUrl}
            <img src={compressedUrl} alt="Compressed" />
          {:else}
            <span class="placeholder">{processing ? "Processing..." : "No result"}</span>
          {/if}
        </div>
        {#if stats}
          <div class="stats">
            <span>{formatSize(stats.compressedSize)}</span>
            <span class={stats.ratio < 1 ? "good" : "bad"}>
              {stats.ratio < 1
                ? Math.round((1 - stats.ratio) * 100) + "% smaller"
                : Math.round((stats.ratio - 1) * 100) + "% larger"}
            </span>
            <span class="muted">{formatDuration(stats.elapsed)}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if compressedUrl}
    <div class="actions">
      <a href={compressedUrl} download="compressed.{mimeExt}" class="btn btn-primary">
        Download {formatSize(stats?.compressedSize ?? 0)}
      </a>
      <button class="btn btn-secondary" onclick={reset}>Reset</button>
    </div>
  {/if}

  {#if stats}
    <div class="code-block">
      <pre>import {"{"} compressImage {"}"} from "snapblob/image";

const blob = await compressImage(file, {"{"}
  maxWidth: {maxWidth},
  maxHeight: {maxHeight},
  quality: {quality},
  mimeType: "{mimeType}",
  onProgress: (p) =&gt; console.log(p + "%"),
{"}"});

// Result: {mimeExt.toUpperCase()} Blob ({formatSize(stats.compressedSize)})</pre>
    </div>
  {/if}
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card h2 {
    font-size: 1.2rem;
    margin-bottom: 0.25rem;
  }

  .card p {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .options {
    margin: 1rem 0;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .options-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .options-grid input,
  .options-grid select {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
  }

  .checkbox-label {
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.5rem !important;
  }

  .file-input {
    display: block;
    width: 100%;
    padding: 0.75rem;
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--text);
    cursor: pointer;
    margin: 1rem 0;
  }

  .file-input:hover {
    border-color: var(--primary);
  }

  .error-msg {
    color: var(--danger);
    margin-bottom: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin: 0.5rem 0;
  }

  .fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s;
  }

  .progress-text {
    font-size: 0.85rem;
    color: var(--text-muted);
    text-align: center;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .preview-grid h3 {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .preview-box {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem;
    text-align: center;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-box img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 4px;
  }

  .placeholder {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  .good {
    color: var(--success);
  }

  .bad {
    color: var(--danger);
  }

  .muted {
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .btn {
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: var(--radius);
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--primary);
    color: #fff;
  }

  .btn-primary:hover {
    background: var(--primary-hover);
  }

  .btn-secondary {
    background: var(--border);
    color: var(--text);
  }

  .code-block {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    margin-top: 1rem;
    overflow-x: auto;
  }

  .code-block pre {
    font-family: "Fira Code", "Consolas", monospace;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .preview-grid {
      grid-template-columns: 1fr;
    }
    .options-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
