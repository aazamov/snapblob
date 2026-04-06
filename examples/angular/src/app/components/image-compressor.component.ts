import { Component } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { compressImage, validateImage, ImageMimeType, ResizeFilter } from "snapblob/image";
import type { CompressImageOptions, ValidateImageOptions } from "snapblob/image";
import { formatSize, formatDuration } from "../utils";

interface Stats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  elapsed: number;
}

@Component({
  selector: "app-image-compressor",
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <div>
          <h2>Image Compressor</h2>
          <p><code>compressImage(file, options)</code></p>
        </div>
        <button class="btn btn-secondary" (click)="showOptions = !showOptions">
          {{ showOptions ? "Hide Options" : "Show Options" }}
        </button>
      </div>

      <!-- Options -->
      @if (showOptions) {
        <div style="margin: 1rem 0">
          <div class="options-grid">
            <label>
              Max Width
              <input type="number" [(ngModel)]="maxWidth" min="1" max="16000" />
            </label>
            <label>
              Max Height
              <input type="number" [(ngModel)]="maxHeight" min="1" max="16000" />
            </label>
            <label>
              Quality ({{ qualityPercent }}%)
              <input type="range" [(ngModel)]="quality" min="0.05" max="1" step="0.05" />
            </label>
            <label>
              Output Format
              <select [(ngModel)]="mimeType">
                <option [value]="MIME.WEBP">WebP</option>
                <option [value]="MIME.JPEG">JPEG</option>
                <option [value]="MIME.PNG">PNG</option>
              </select>
            </label>
            <label>
              Resize Filter
              <select [(ngModel)]="resizeFilter">
                <option [value]="FILTER.MKS2013">MKS 2013 (best)</option>
                <option [value]="FILTER.LANCZOS3">Lanczos 3</option>
                <option [value]="FILTER.LANCZOS2">Lanczos 2</option>
                <option [value]="FILTER.BOX">Box (fastest)</option>
              </select>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="skipIfSmaller" />
              Skip if Smaller
            </label>
          </div>
        </div>
      }

      <!-- File input -->
      <input
        class="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        [disabled]="processing"
        (change)="handleFile($event)"
      />

      <!-- Error -->
      @if (error) {
        <div style="color: var(--danger); margin-bottom: 1rem">{{ error }}</div>
      }

      <!-- Progress -->
      @if (processing) {
        <div class="progress-bar">
          <div class="fill" [style.width.%]="progress"></div>
        </div>
        <div class="progress-text">{{ progress | number: "1.0-0" }}%</div>
      }

      <!-- Preview -->
      @if (originalUrl) {
        <div class="preview-grid">
          <div>
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Original</h3>
            <div class="preview-box">
              <img [src]="originalUrl" alt="Original" />
            </div>
            @if (stats) {
              <div class="stats">
                <span>{{ formatSize(stats.originalSize) }}</span>
              </div>
            }
          </div>
          <div>
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Compressed</h3>
            <div class="preview-box">
              @if (compressedUrl) {
                <img [src]="compressedUrl" alt="Compressed" />
              } @else {
                <span class="placeholder">{{ processing ? "Processing..." : "No result" }}</span>
              }
            </div>
            @if (stats) {
              <div class="stats">
                <span>{{ formatSize(stats.compressedSize) }}</span>
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
      @if (compressedUrl) {
        <div class="actions">
          <a [href]="compressedUrl" [download]="'compressed.' + mimeExt" class="btn btn-primary">
            Download {{ formatSize(stats?.compressedSize ?? 0) }}
          </a>
          <button class="btn btn-secondary" (click)="reset()">Reset</button>
        </div>
      }

      <!-- Code preview -->
      @if (stats) {
        <div class="code-block">
          <pre>
import {{ "{" }} compressImage {{ "}" }} from "snapblob/image";

const blob = await compressImage(file, {{ "{" }}
  maxWidth: {{ maxWidth }},
  maxHeight: {{ maxHeight }},
  quality: {{ quality }},
  mimeType: "{{ mimeType }}",
  onProgress: (p) =&gt; console.log(p + "%"),
{{ "}" }});

// Result: {{ mimeExt.toUpperCase() }} Blob ({{ formatSize(stats.compressedSize) }})</pre
          >
        </div>
      }
    </div>
  `,
})
export class ImageCompressorComponent {
  readonly MIME = ImageMimeType;
  readonly FILTER = ResizeFilter;
  readonly formatSize = formatSize;
  readonly formatDuration = formatDuration;

  originalUrl: string | null = null;
  compressedUrl: string | null = null;
  progress = 0;
  error: string | null = null;
  processing = false;
  showOptions = false;
  stats: Stats | null = null;

  maxWidth = 1920;
  maxHeight = 1080;
  quality = 0.8;
  mimeType: ImageMimeType = ImageMimeType.WEBP;
  resizeFilter: ResizeFilter = ResizeFilter.MKS2013;
  skipIfSmaller = false;

  get qualityPercent(): number {
    return Math.round(this.quality * 100);
  }

  get mimeExt(): string {
    if (this.mimeType === ImageMimeType.WEBP) return "webp";
    if (this.mimeType === ImageMimeType.JPEG) return "jpg";
    return "png";
  }

  private cleanup(): void {
    if (this.originalUrl) URL.revokeObjectURL(this.originalUrl);
    if (this.compressedUrl) URL.revokeObjectURL(this.compressedUrl);
  }

  async handleFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.cleanup();
    this.error = null;
    this.processing = true;
    this.progress = 0;
    this.stats = null;
    this.compressedUrl = null;

    this.originalUrl = URL.createObjectURL(file);

    try {
      const valOpts: ValidateImageOptions = {
        maxFileSize: 20 * 1024 * 1024,
        allowedTypes: [ImageMimeType.WEBP, ImageMimeType.JPEG, ImageMimeType.PNG],
      };
      const result = await validateImage(file, valOpts);
      if (!result.valid) {
        this.error = result.errors.join(" | ");
        this.processing = false;
        return;
      }

      const options: CompressImageOptions = {
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight,
        quality: this.quality,
        mimeType: this.mimeType,
        resizeFilter: this.resizeFilter,
        skipIfSmaller: this.skipIfSmaller,
        onProgress: (p) => {
          this.progress = p;
        },
      };

      const startTime = performance.now();
      const blob = await compressImage(file, options);
      const elapsed = performance.now() - startTime;

      this.compressedUrl = URL.createObjectURL(blob);
      this.stats = {
        originalSize: file.size,
        compressedSize: blob.size,
        ratio: blob.size / file.size,
        elapsed,
      };
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Unknown error";
    } finally {
      this.processing = false;
    }
  }

  reset(): void {
    this.cleanup();
    this.originalUrl = null;
    this.compressedUrl = null;
    this.stats = null;
    this.error = null;
    this.progress = 0;
  }
}
