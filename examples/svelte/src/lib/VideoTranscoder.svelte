<script lang="ts">
  import { transcodeVideo, getVideoInfo } from "../../../../src/video";
  import { applyPreset } from "../../../../src/video/presets";
  import type { VideoPresetName } from "../../../../src/video/presets";
  import type { TranscodeVideoOptions, VideoInfo } from "../../../../src/video/types";
  import { formatSize, formatDuration } from "../utils";

  let originalUrl = $state<string | null>(null);
  let transcodedUrl = $state<string | null>(null);
  let progress = $state(0);
  let error = $state<string | null>(null);
  let processing = $state(false);
  let loadingFFmpeg = $state(false);
  let videoInfo = $state<VideoInfo | null>(null);
  let selectedPreset = $state<VideoPresetName>("balanced");
  let outputFormat = $state("mp4");

  let stats = $state<{
    originalSize: number;
    transcodedSize: number;
    ratio: number;
    elapsed: number;
  } | null>(null);

  let abortController: AbortController | null = null;

  const presetOptions: { value: VideoPresetName; label: string }[] = [
    { value: "balanced", label: "Balanced" },
    { value: "high-quality", label: "High Quality" },
    { value: "small-file", label: "Small File" },
    { value: "social-media", label: "Social Media" },
  ];

  function cleanup() {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
  }

  async function handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    cleanup();
    error = null;
    processing = true;
    progress = 0;
    stats = null;
    transcodedUrl = null;
    loadingFFmpeg = true;

    originalUrl = URL.createObjectURL(file);

    try {
      const info = await getVideoInfo(file);
      videoInfo = info;
    } catch {
      videoInfo = null;
    }

    abortController = new AbortController();
    const startTime = performance.now();

    try {
      const options: TranscodeVideoOptions = {
        ...applyPreset(selectedPreset),
        outputFormat,
        signal: abortController.signal,
        onProgress: (p) => {
          loadingFFmpeg = false;
          progress = p;
        },
      };

      const blob = await transcodeVideo(file, options);
      const elapsed = performance.now() - startTime;

      transcodedUrl = URL.createObjectURL(blob);
      stats = {
        originalSize: file.size,
        transcodedSize: blob.size,
        ratio: blob.size / file.size,
        elapsed,
      };
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === "VideoAbortError" || err.message.includes("abort"))
      ) {
        error = "Transcoding cancelled";
      } else {
        error = err instanceof Error ? err.message : "Unknown error";
      }
    } finally {
      processing = false;
      loadingFFmpeg = false;
      abortController = null;
    }
  }

  function cancel() {
    abortController?.abort();
  }

  function reset() {
    cleanup();
    originalUrl = null;
    transcodedUrl = null;
    stats = null;
    videoInfo = null;
    error = null;
    progress = 0;
  }
</script>

<div class="card">
  <h2>Video Transcoder</h2>
  <p><code>transcodeVideo(file, options)</code></p>

  <!-- Presets -->
  <div class="presets">
    <div class="preset-buttons">
      {#each presetOptions as preset}
        <button
          class="btn"
          class:btn-primary={selectedPreset === preset.value}
          class:btn-secondary={selectedPreset !== preset.value}
          onclick={() => (selectedPreset = preset.value)}
          disabled={processing}
        >
          {preset.label}
        </button>
      {/each}
    </div>
    <div class="options-grid" style="margin-top: 0.75rem">
      <label>
        Output Format
        <select bind:value={outputFormat}>
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
        </select>
      </label>
    </div>
  </div>

  <input
    class="file-input"
    type="file"
    accept="video/mp4,video/webm,video/ogg,video/quicktime"
    disabled={processing}
    onchange={handleFile}
  />

  {#if videoInfo}
    <div class="video-info">
      Source: {videoInfo.width} x {videoInfo.height} | {videoInfo.duration.toFixed(1)}s |
      {videoInfo.mimeType}
    </div>
  {/if}

  {#if error}
    <div class="error-msg">{error}</div>
  {/if}

  {#if processing}
    {#if loadingFFmpeg}
      <p class="loading-text">Loading FFmpeg WASM (~31MB first time)...</p>
    {/if}
    <div class="progress-bar">
      <div class="fill" style:width="{progress}%"></div>
    </div>
    <div class="progress-text">
      {loadingFFmpeg ? "Loading..." : Math.round(progress) + "%"}
    </div>
    <button class="btn btn-danger" style="margin-top: 0.5rem" onclick={cancel}>Cancel</button>
  {/if}

  {#if originalUrl}
    <div class="preview-grid">
      <div>
        <h3>Original</h3>
        <div class="preview-box">
          <!-- svelte-ignore a11y_media_has_caption -->
          <video controls src={originalUrl}></video>
        </div>
        {#if stats}
          <div class="stats">
            <span>{formatSize(stats.originalSize)}</span>
          </div>
        {/if}
      </div>
      <div>
        <h3>Transcoded</h3>
        <div class="preview-box">
          {#if transcodedUrl}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video controls src={transcodedUrl}></video>
          {:else}
            <span class="placeholder">{processing ? "Transcoding..." : "No result"}</span>
          {/if}
        </div>
        {#if stats}
          <div class="stats">
            <span>{formatSize(stats.transcodedSize)}</span>
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

  {#if transcodedUrl}
    <div class="actions">
      <a href={transcodedUrl} download="transcoded.{outputFormat}" class="btn btn-primary">
        Download {formatSize(stats?.transcodedSize ?? 0)}
      </a>
      <button class="btn btn-secondary" onclick={reset}>Reset</button>
    </div>
  {/if}

  {#if stats}
    <div class="code-block">
      <pre>import {"{"} transcodeVideo, applyPreset {"}"} from "snapblob/video";

const blob = await transcodeVideo(file, {"{"}
  ...applyPreset("{selectedPreset}"),
  outputFormat: "{outputFormat}",
  onProgress: (p) =&gt; console.log(p + "%"),
  signal: abortController.signal,
{"}"});

// Result: {outputFormat.toUpperCase()} ({formatSize(stats.transcodedSize)})</pre>
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

  .card h2 {
    font-size: 1.2rem;
    margin-bottom: 0.25rem;
  }

  .card p {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .presets {
    margin: 1rem 0;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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

  .options-grid select {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
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

  .video-info {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .error-msg {
    color: var(--danger);
    margin-bottom: 1rem;
  }

  .loading-text {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
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

  .preview-box video {
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

  .btn-danger {
    background: var(--danger);
    color: #fff;
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
  }
</style>
