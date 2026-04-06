import { Component } from "@angular/core";
import { ImageCompressorComponent } from "./components/image-compressor.component";
import { VideoTranscoderComponent } from "./components/video-transcoder.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ImageCompressorComponent, VideoTranscoderComponent],
  template: `
    <div class="app">
      <header>
        <h1>snapblob</h1>
        <p>Angular Example &mdash; Browser-native media compression</p>
      </header>

      <div class="tabs">
        <button [class.active]="tab === 'image'" (click)="tab = 'image'">Image Compressor</button>
        <button [class.active]="tab === 'video'" (click)="tab = 'video'">Video Transcoder</button>
      </div>

      @if (tab === "image") {
        <app-image-compressor />
      } @else {
        <app-video-transcoder />
      }
    </div>
  `,
})
export class AppComponent {
  tab: "image" | "video" = "image";
}
