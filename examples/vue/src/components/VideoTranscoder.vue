<script setup lang="ts">
import { ref, computed } from "vue";
import { transcodeVideo, getVideoInfo } from "../../../../src/video";
import { applyPreset, VIDEO_PRESETS } from "../../../../src/video/presets";
import type { VideoPresetName } from "../../../../src/video/presets";
import type { TranscodeVideoOptions, VideoInfo } from "../../../../src/video/types";
import { formatSize, formatDuration } from "../utils";

const originalUrl = ref<string | null>(null);
const transcodedUrl = ref<string | null>(null);
const progress = ref(0);
const error = ref<string | null>(null);
const processing = ref(false);
const loadingFFmpeg = ref(false);
const videoInfo = ref<VideoInfo | null>(null);
const selectedPreset = ref<VideoPresetName>("balanced");
const outputFormat = ref("mp4");

let abortController: AbortController | null = null;

const stats = ref<{
  originalSize: number;
  transcodedSize: number;
  ratio: number;
  elapsed: number;
} | null>(null);

const presetOptions: { value: VideoPresetName; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "high-quality", label: "High Quality" },
  { value: "small-file", label: "Small File" },
  { value: "social-media", label: "Social Media" },
];

function cleanup() {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value);
  if (transcodedUrl.value) URL.revokeObjectURL(transcodedUrl.value);
}

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  cleanup();
  error.value = null;
  processing.value = true;
  progress.value = 0;
  stats.value = null;
  transcodedUrl.value = null;
  loadingFFmpeg.value = true;

  originalUrl.value = URL.createObjectURL(file);

  try {
    const info = await getVideoInfo(file);
    videoInfo.value = info;
  } catch {
    videoInfo.value = null;
  }

  abortController = new AbortController();
  const startTime = performance.now();

  try {
    const options: TranscodeVideoOptions = {
      ...applyPreset(selectedPreset.value),
      outputFormat: outputFormat.value,
      signal: abortController.signal,
      onProgress: (p) => {
        loadingFFmpeg.value = false;
        progress.value = p;
      },
    };

    const blob = await transcodeVideo(file, options);
    const elapsed = performance.now() - startTime;

    transcodedUrl.value = URL.createObjectURL(blob);
    stats.value = {
      originalSize: file.size,
      transcodedSize: blob.size,
      ratio: blob.size / file.size,
      elapsed,
    };
  } catch (err) {
    if (err instanceof Error && (err.name === "VideoAbortError" || err.message.includes("abort"))) {
      error.value = "Transcoding cancelled";
    } else {
      error.value = err instanceof Error ? err.message : "Unknown error";
    }
  } finally {
    processing.value = false;
    loadingFFmpeg.value = false;
    abortController = null;
  }
}

function cancel() {
  abortController?.abort();
}

function reset() {
  cleanup();
  originalUrl.value = null;
  transcodedUrl.value = null;
  stats.value = null;
  videoInfo.value = null;
  error.value = null;
  progress.value = 0;
}
</script>

<template>
  <div class="card">
    <h2>Video Transcoder</h2>
    <p><code>transcodeVideo(file, options)</code></p>

    <!-- Preset selection -->
    <div style="margin: 1rem 0">
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
        <button
          v-for="preset in presetOptions"
          :key="preset.value"
          class="btn"
          :class="selectedPreset === preset.value ? 'btn-primary' : 'btn-secondary'"
          @click="selectedPreset = preset.value"
          :disabled="processing"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="options-grid" style="margin-top: 0.75rem">
        <label>
          Output Format
          <select v-model="outputFormat">
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
          </select>
        </label>
      </div>
    </div>

    <!-- File input -->
    <input
      class="file-input"
      type="file"
      accept="video/mp4,video/webm,video/ogg,video/quicktime"
      :disabled="processing"
      @change="handleFile"
    />

    <!-- Video info -->
    <div v-if="videoInfo" style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem">
      Source: {{ videoInfo.width }} x {{ videoInfo.height }} | {{ videoInfo.duration.toFixed(1) }}s | {{ videoInfo.mimeType }}
    </div>

    <!-- Error -->
    <div v-if="error" style="color: var(--danger); margin-bottom: 1rem">{{ error }}</div>

    <!-- Progress -->
    <div v-if="processing">
      <p v-if="loadingFFmpeg" style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem">
        Loading FFmpeg WASM (~31MB first time)...
      </p>
      <div class="progress-bar">
        <div class="fill" :style="{ width: progress + '%' }" />
      </div>
      <div class="progress-text">
        {{ loadingFFmpeg ? "Loading..." : Math.round(progress) + "%" }}
      </div>
      <button class="btn btn-danger" style="margin-top: 0.5rem" @click="cancel">Cancel</button>
    </div>

    <!-- Preview -->
    <div v-if="originalUrl" class="preview-grid">
      <div>
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Original</h3>
        <div class="preview-box">
          <video controls :src="originalUrl" />
        </div>
        <div v-if="stats" class="stats">
          <span>{{ formatSize(stats.originalSize) }}</span>
        </div>
      </div>
      <div>
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Transcoded</h3>
        <div class="preview-box">
          <video v-if="transcodedUrl" controls :src="transcodedUrl" />
          <span v-else class="placeholder">{{ processing ? "Transcoding..." : "No result" }}</span>
        </div>
        <div v-if="stats" class="stats">
          <span>{{ formatSize(stats.transcodedSize) }}</span>
          <span :class="stats.ratio < 1 ? 'good' : 'bad'">
            {{ stats.ratio < 1
              ? Math.round((1 - stats.ratio) * 100) + "% smaller"
              : Math.round((stats.ratio - 1) * 100) + "% larger" }}
          </span>
          <span class="muted">{{ formatDuration(stats.elapsed) }}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="transcodedUrl" class="actions">
      <a :href="transcodedUrl" :download="'transcoded.' + outputFormat" class="btn btn-primary">
        Download {{ formatSize(stats?.transcodedSize ?? 0) }}
      </a>
      <button class="btn btn-secondary" @click="reset">Reset</button>
    </div>

    <!-- Code preview -->
    <div v-if="stats" class="code-block">
      <pre>import { transcodeVideo, applyPreset } from "snapblob/video";

const blob = await transcodeVideo(file, {
  ...applyPreset("{{ selectedPreset }}"),
  outputFormat: "{{ outputFormat }}",
  onProgress: (p) =&gt; console.log(p + "%"),
  signal: abortController.signal,
});

// Result: {{ outputFormat.toUpperCase() }} ({{ formatSize(stats.transcodedSize) }})</pre>
    </div>
  </div>
</template>
