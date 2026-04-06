<script setup lang="ts">
import { ref, computed } from "vue";
import { compressImage, validateImage } from "../../../../src/image";
import { ImageMimeType, ResizeFilter } from "../../../../src/image/constants";
import type { CompressImageOptions, ValidateImageOptions } from "../../../../src/image/types";
import { formatSize, formatDuration } from "../utils";

const originalUrl = ref<string | null>(null);
const compressedUrl = ref<string | null>(null);
const progress = ref(0);
const error = ref<string | null>(null);
const processing = ref(false);
const showOptions = ref(false);

const maxWidth = ref(1920);
const maxHeight = ref(1080);
const quality = ref(0.8);
const mimeType = ref<ImageMimeType>(ImageMimeType.WEBP);
const resizeFilter = ref<ResizeFilter>(ResizeFilter.MKS2013);
const skipIfSmaller = ref(false);

const validateEnabled = ref(true);
const valMaxFileSize = ref(20);
const valMinWidth = ref(100);
const valMinHeight = ref(100);

const stats = ref<{
  originalSize: number;
  compressedSize: number;
  ratio: number;
  elapsed: number;
} | null>(null);

const qualityPercent = computed(() => Math.round(quality.value * 100));

const mimeExt = computed(() => {
  if (mimeType.value === ImageMimeType.WEBP) return "webp";
  if (mimeType.value === ImageMimeType.JPEG) return "jpg";
  return "png";
});

function cleanup() {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value);
  if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value);
}

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  cleanup();
  error.value = null;
  processing.value = true;
  progress.value = 0;
  stats.value = null;
  compressedUrl.value = null;

  originalUrl.value = URL.createObjectURL(file);

  try {
    if (validateEnabled.value) {
      const valOpts: ValidateImageOptions = {
        maxFileSize: valMaxFileSize.value * 1024 * 1024,
        minSize: [valMinWidth.value, valMinHeight.value],
        allowedTypes: [ImageMimeType.WEBP, ImageMimeType.JPEG, ImageMimeType.PNG],
      };
      const result = await validateImage(file, valOpts);
      if (!result.valid) {
        error.value = result.errors.join(" | ");
        processing.value = false;
        return;
      }
    }

    const options: CompressImageOptions = {
      maxWidth: maxWidth.value,
      maxHeight: maxHeight.value,
      quality: quality.value,
      mimeType: mimeType.value,
      resizeFilter: resizeFilter.value,
      skipIfSmaller: skipIfSmaller.value,
      onProgress: (p) => {
        progress.value = p;
      },
    };

    const startTime = performance.now();
    const blob = await compressImage(file, options);
    const elapsed = performance.now() - startTime;

    compressedUrl.value = URL.createObjectURL(blob);
    stats.value = {
      originalSize: file.size,
      compressedSize: blob.size,
      ratio: blob.size / file.size,
      elapsed,
    };
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unknown error";
  } finally {
    processing.value = false;
  }
}

function reset() {
  cleanup();
  originalUrl.value = null;
  compressedUrl.value = null;
  stats.value = null;
  error.value = null;
  progress.value = 0;
}
</script>

<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>Image Compressor</h2>
        <p><code>compressImage(file, options)</code></p>
      </div>
      <button class="btn btn-secondary" @click="showOptions = !showOptions">
        {{ showOptions ? "Hide Options" : "Show Options" }}
      </button>
    </div>

    <!-- Options -->
    <div v-if="showOptions" style="margin: 1rem 0">
      <div class="options-grid">
        <label>
          Max Width
          <input type="number" v-model.number="maxWidth" min="1" max="16000" />
        </label>
        <label>
          Max Height
          <input type="number" v-model.number="maxHeight" min="1" max="16000" />
        </label>
        <label>
          Quality ({{ qualityPercent }}%)
          <input type="range" v-model.number="quality" min="0.05" max="1" step="0.05" />
        </label>
        <label>
          Output Format
          <select v-model="mimeType">
            <option :value="ImageMimeType.WEBP">WebP</option>
            <option :value="ImageMimeType.JPEG">JPEG</option>
            <option :value="ImageMimeType.PNG">PNG</option>
          </select>
        </label>
        <label>
          Resize Filter
          <select v-model="resizeFilter">
            <option :value="ResizeFilter.MKS2013">MKS 2013 (best)</option>
            <option :value="ResizeFilter.LANCZOS3">Lanczos 3</option>
            <option :value="ResizeFilter.LANCZOS2">Lanczos 2</option>
            <option :value="ResizeFilter.BOX">Box (fastest)</option>
          </select>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="skipIfSmaller" />
          Skip if Smaller
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="validateEnabled" />
          Validate Before Compress
        </label>
      </div>
    </div>

    <!-- File input -->
    <input
      class="file-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      :disabled="processing"
      @change="handleFile"
    />

    <!-- Error -->
    <div v-if="error" style="color: var(--danger); margin-bottom: 1rem">{{ error }}</div>

    <!-- Progress -->
    <div v-if="processing">
      <div class="progress-bar">
        <div class="fill" :style="{ width: progress + '%' }" />
      </div>
      <div class="progress-text">{{ Math.round(progress) }}%</div>
    </div>

    <!-- Preview -->
    <div v-if="originalUrl" class="preview-grid">
      <div>
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Original</h3>
        <div class="preview-box">
          <img :src="originalUrl" alt="Original" />
        </div>
        <div v-if="stats" class="stats">
          <span>{{ formatSize(stats.originalSize) }}</span>
        </div>
      </div>
      <div>
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Compressed</h3>
        <div class="preview-box">
          <img v-if="compressedUrl" :src="compressedUrl" alt="Compressed" />
          <span v-else class="placeholder">{{ processing ? "Processing..." : "No result" }}</span>
        </div>
        <div v-if="stats" class="stats">
          <span>{{ formatSize(stats.compressedSize) }}</span>
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
    <div v-if="compressedUrl" class="actions">
      <a :href="compressedUrl" :download="'compressed.' + mimeExt" class="btn btn-primary">
        Download {{ formatSize(stats?.compressedSize ?? 0) }}
      </a>
      <button class="btn btn-secondary" @click="reset">Reset</button>
    </div>

    <!-- Code preview -->
    <div v-if="stats" class="code-block">
      <pre>import { compressImage } from "snapblob/image";

const blob = await compressImage(file, {
  maxWidth: {{ maxWidth }},
  maxHeight: {{ maxHeight }},
  quality: {{ quality }},
  mimeType: "{{ mimeType }}",
  onProgress: (p) =&gt; console.log(p + "%"),
});

// Result: {{ mimeExt.toUpperCase() }} Blob ({{ formatSize(stats.compressedSize) }})</pre>
    </div>
  </div>
</template>
