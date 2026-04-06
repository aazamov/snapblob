import { Component } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { transcodeVideo, getVideoInfo, applyPreset } from "snapblob/video";
import type { TranscodeVideoOptions, VideoInfo, VideoPresetName } from "snapblob/video";
import { formatSize, formatDuration } from "../utils";

interface Stats {
  originalSize: number;
  transcodedSize: number;
  ratio: number;
  elapsed: number;
}

@Component({
  selector: "app-video-transcoder",
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="card">
      <h2>Video Transcoder</h2>
      <p><code>transcodeVideo(file, options)</code></p>

      <!-- Presets -->
      <div style="margin: 1rem 0">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
          @for (preset of presetOptions; track preset.value) {
            <button
              class="btn"
              [class.btn-primary]="selectedPreset === preset.value"
              [class.btn-secondary]="selectedPreset !== preset.value"
              (click)="selectedPreset = preset.value"
              [disabled]="processing"
            >
              {{ preset.label }}
            </button>
          }
        </div>
        <div class="options-grid" style="margin-top: 0.75rem">
          <label>
            Output Format
            <select [(ngModel)]="outputFormat">
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
        [disabled]="processing"
        (change)="handleFile($event)"
      />

      <!-- Video info -->
      @if (videoInfo) {
        <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem">
          Source: {{ videoInfo.width }} x {{ videoInfo.height }} |
          {{ videoInfo.duration.toFixed(1) }}s | {{ videoInfo.mimeType }}
        </div>
      }

      <!-- Error -->
      @if (error) {
        <div style="color: var(--danger); margin-bottom: 1rem">{{ error }}</div>
      }

      <!-- Progress -->
      @if (processing) {
        @if (loadingFFmpeg) {
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem">
            Loading FFmpeg WASM (~31MB first time)...
          </p>
        }
        <div class="progress-bar">
          <div class="fill" [style.width.%]="progress"></div>
        </div>
        <div class="progress-text">
          {{ loadingFFmpeg ? "Loading..." : (progress | number: "1.0-0") + "%" }}
        </div>
        <button class="btn btn-danger" style="margin-top: 0.5rem" (click)="cancel()">Cancel</button>
      }

      <!-- Preview -->
      @if (originalUrl) {
        <div class="preview-grid">
          <div>
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Original</h3>
            <div class="preview-box">
              <video controls [src]="originalUrl"></video>
            </div>
            @if (stats) {
              <div class="stats">
                <span>{{ formatSize(stats.originalSize) }}</span>
              </div>
            }
          </div>
          <div>
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Transcoded</h3>
            <div class="preview-box">
              @if (transcodedUrl) {
                <video controls [src]="transcodedUrl"></video>
              } @else {
                <span class="placeholder">{{ processing ? "Transcoding..." : "No result" }}</span>
              }
            </div>
            @if (stats) {
              <div class="stats">
                <span>{{ formatSize(stats.transcodedSize) }}</span>
                <span [class]="stats.ratio < 1 ? 'good' : 'bad'">
                  {{
                    stats.ratio < 1
                      ? ((1 - stats.ratio) * 100 | number: "1.0-0") + "% smaller"
                      : ((stats.ratio - 1) * 100 | number: "1.0-0") + "% larger"
                  }}
                </span>
                <span class="muted">{{ formatDuration(stats.elapsed) }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Actions -->
      @if (transcodedUrl) {
        <div class="actions">
          <a
            [href]="transcodedUrl"
            [download]="'transcoded.' + outputFormat"
            class="btn btn-primary"
          >
            Download {{ formatSize(stats?.transcodedSize ?? 0) }}
          </a>
          <button class="btn btn-secondary" (click)="reset()">Reset</button>
        </div>
      }

      <!-- Code preview -->
      @if (stats) {
        <div class="code-block">
          <pre>
import {{ "{" }} transcodeVideo, applyPreset {{ "}" }} from "snapblob/video";

const blob = await transcodeVideo(file, {{ "{" }}
  ...applyPreset("{{ selectedPreset }}"),
  outputFormat: "{{ outputFormat }}",
  onProgress: (p) =&gt; console.log(p + "%"),
  signal: abortController.signal,
{{ "}" }});

// Result: {{ outputFormat.toUpperCase() }} ({{ formatSize(stats.transcodedSize) }})</pre
          >
        </div>
      }
    </div>
  `,
})
export class VideoTranscoderComponent {
  readonly formatSize = formatSize;
  readonly formatDuration = formatDuration;

  originalUrl: string | null = null;
  transcodedUrl: string | null = null;
  progress = 0;
  error: string | null = null;
  processing = false;
  loadingFFmpeg = false;
  videoInfo: VideoInfo | null = null;
  stats: Stats | null = null;

  selectedPreset: VideoPresetName = "balanced";
  outputFormat = "mp4";

  presetOptions: { value: VideoPresetName; label: string }[] = [
    { value: "balanced", label: "Balanced" },
    { value: "high-quality", label: "High Quality" },
    { value: "small-file", label: "Small File" },
    { value: "social-media", label: "Social Media" },
  ];

  private abortController: AbortController | null = null;

  private cleanup(): void {
    if (this.originalUrl) URL.revokeObjectURL(this.originalUrl);
    if (this.transcodedUrl) URL.revokeObjectURL(this.transcodedUrl);
  }

  async handleFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.cleanup();
    this.error = null;
    this.processing = true;
    this.progress = 0;
    this.stats = null;
    this.transcodedUrl = null;
    this.loadingFFmpeg = true;

    this.originalUrl = URL.createObjectURL(file);

    try {
      const info = await getVideoInfo(file);
      this.videoInfo = info;
    } catch {
      this.videoInfo = null;
    }

    this.abortController = new AbortController();
    const startTime = performance.now();

    try {
      const options: TranscodeVideoOptions = {
        ...applyPreset(this.selectedPreset),
        outputFormat: this.outputFormat,
        signal: this.abortController.signal,
        onProgress: (p) => {
          this.loadingFFmpeg = false;
          this.progress = p;
        },
      };

      const blob = await transcodeVideo(file, options);
      const elapsed = performance.now() - startTime;

      this.transcodedUrl = URL.createObjectURL(blob);
      this.stats = {
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
        this.error = "Transcoding cancelled";
      } else {
        this.error = err instanceof Error ? err.message : "Unknown error";
      }
    } finally {
      this.processing = false;
      this.loadingFFmpeg = false;
      this.abortController = null;
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  reset(): void {
    this.cleanup();
    this.originalUrl = null;
    this.transcodedUrl = null;
    this.stats = null;
    this.videoInfo = null;
    this.error = null;
    this.progress = 0;
  }
}
