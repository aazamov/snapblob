import { useState } from "react";
import CodeBlock from "../components/docs/CodeBlock";

type Framework = "react" | "vue" | "svelte" | "angular" | "vanilla";

const FRAMEWORK_TABS: { value: Framework; label: string }[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue 3" },
  { value: "svelte", label: "Svelte" },
  { value: "angular", label: "Angular" },
  { value: "vanilla", label: "Vanilla JS" },
];

const REACT_IMAGE = `import { useState, useCallback } from "react";
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
}`;

const REACT_VIDEO = `import { useState, useRef } from "react";
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
}`;

const REACT_HOOK = `import { useState, useCallback } from "react";
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
      return await compressImage(file, { ...options, onProgress: setProgress });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed"));
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
    quality: 0.8,
  });

  return (
    <input
      type="file"
      accept="image/*"
      disabled={loading}
      onChange={async (e) => {
        const blob = await compress(e.target.files![0]);
        if (blob) { /* upload */ }
      }}
    />
  );
}`;

const REACT_BATCH = `import { useState, useCallback } from "react";
import { compressImages } from "snapblob/image";

function BatchUploader() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setLoading(true);
    setProgress(0);

    const blobs = await compressImages(files, {
      maxWidth: 1280,
      quality: 0.8,
      concurrency: 3,
      onFileProgress: (index, total, pct) => {
        const overall = ((index / total) * 100) + (pct / total);
        setProgress(Math.round(overall));
      },
    });

    // Upload all compressed blobs
    const formData = new FormData();
    blobs.forEach((blob, i) => formData.append("images", blob, \`photo-\${i}.webp\`));
    await fetch("/api/upload-batch", { method: "POST", body: formData });

    setLoading(false);
  }, []);

  return (
    <div>
      <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={loading} />
      {loading && <progress value={progress} max={100} />}
    </div>
  );
}`;

const VUE_IMAGE = `<script setup lang="ts">
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
</template>`;

const VUE_COMPOSABLE = `// composables/useImageCompressor.ts
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
      error.value = err instanceof Error ? err : new Error("Failed");
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { compress, progress, loading, error };
}`;

const VUE_VIDEO = `<script setup lang="ts">
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
</template>`;

const SVELTE_IMAGE = `<script lang="ts">
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
{#if loading}<p>Compressing: {Math.round(progress)}%</p>{/if}
{#if preview}<img src={preview} alt="Compressed" />{/if}`;

const ANGULAR_IMAGE = `// image-upload.component.ts
import { Component } from "@angular/core";
import { compressImage, ImageMimeType } from "snapblob/image";

@Component({
  selector: "app-image-upload",
  template: \`
    <input type="file" accept="image/*" (change)="handleFile($event)" [disabled]="loading" />
    <div *ngIf="loading">
      <progress [value]="progress" max="100"></progress>
      <span>{{ progress | number:'1.0-0' }}%</span>
    </div>
    <img *ngIf="preview" [src]="preview" alt="Preview" />
  \`,
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
}`;

const VANILLA_IMAGE = `<input type="file" id="fileInput" accept="image/*" />
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
  });
</script>`;

const VANILLA_VIDEO = `<input type="file" id="videoInput" accept="video/*" />
<progress id="bar" value="0" max="100" hidden></progress>
<button id="cancelBtn" hidden>Cancel</button>

<script type="module">
  import { transcodeVideo, applyPreset } from "snapblob/video";

  let controller;

  document.getElementById("videoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    controller = new AbortController();
    document.getElementById("bar").hidden = false;
    document.getElementById("cancelBtn").hidden = false;

    try {
      const blob = await transcodeVideo(file, {
        ...applyPreset("balanced"),
        outputFormat: "mp4",
        signal: controller.signal,
        onProgress: (p) => { document.getElementById("bar").value = p; },
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "video.mp4";
      a.click();
    } catch (err) {
      if (err.name !== "VideoAbortError") console.error(err);
    } finally {
      document.getElementById("bar").hidden = true;
      document.getElementById("cancelBtn").hidden = true;
    }
  });

  document.getElementById("cancelBtn").onclick = () => controller?.abort();
</script>`;

const EXAMPLES: Record<Framework, { title: string; code: string; language?: string }[]> = {
  react: [
    { title: "Image Upload Component", code: REACT_IMAGE },
    { title: "Batch Image Compression", code: REACT_BATCH },
    { title: "Video Transcoder with Cancel", code: REACT_VIDEO },
    { title: "Custom Hook: useImageCompressor", code: REACT_HOOK },
  ],
  vue: [
    { title: "Image Compression (Composition API)", code: VUE_IMAGE, language: "vue" },
    { title: "Composable: useImageCompressor", code: VUE_COMPOSABLE },
    { title: "Video Transcoder with Cancel", code: VUE_VIDEO, language: "vue" },
  ],
  svelte: [
    { title: "Image Compression", code: SVELTE_IMAGE, language: "svelte" },
  ],
  angular: [
    { title: "Image Upload Component", code: ANGULAR_IMAGE },
  ],
  vanilla: [
    { title: "Image Compression", code: VANILLA_IMAGE, language: "html" },
    { title: "Video Transcoding", code: VANILLA_VIDEO, language: "html" },
  ],
};

export default function Frameworks() {
  const [active, setActive] = useState<Framework>("react");

  return (
    <div className="doc-page">
      <h1>Framework Integration</h1>
      <p className="doc-lead">
        media-client works with any frontend framework. Here are copy-paste examples for the most popular ones.
      </p>

      <div className="framework-tabs">
        {FRAMEWORK_TABS.map((fw) => (
          <button
            key={fw.value}
            type="button"
            className={`framework-tab ${active === fw.value ? "active" : ""}`}
            onClick={() => setActive(fw.value)}
          >
            {fw.label}
          </button>
        ))}
      </div>

      <div className="framework-examples">
        {EXAMPLES[active].map((ex, i) => (
          <section key={i} className="doc-section">
            <h2>{ex.title}</h2>
            <CodeBlock code={ex.code} language={ex.language} title={ex.title} />
          </section>
        ))}
      </div>
    </div>
  );
}
