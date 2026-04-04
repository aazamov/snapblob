import type { VideoPresetName } from "./presets";

export interface TranscodeVideoOptions {
  /** Use a named preset. Individual options override preset values. */
  presetName?: VideoPresetName;

  /** Video codec (e.g. "libx264", "libx265", "libvpx-vp9"). */
  codec?: string;

  /** Encoder preset (e.g. "fast", "medium", "slow"). */
  preset?: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow";

  /**
   * Constant Rate Factor — lower means higher quality.
   * Typical range: 18 (visually lossless) to 28 (smaller file).
   */
  crf?: number;

  /**
   * Maximum video bitrate. Accepts FFmpeg-style strings ("2500k", "4M")
   * or numeric values in bps.
   */
  maxBitrate?: string | number;

  /** Audio bitrate (e.g. "128k", "192k"). */
  audioBitrate?: string | number;

  /** Audio codec (e.g. "aac", "libopus"). */
  audioCodec?: string;

  /** Pixel format (e.g. "yuv420p"). */
  pixelFormat?: string;

  /** Output container format / extension (e.g. "mp4", "webm"). Defaults to input extension. */
  outputFormat?: string;

  /** Number of threads. 0 = auto (let FFmpeg decide). Defaults to 0. */
  threads?: number;

  /** AbortSignal to cancel the operation. */
  signal?: AbortSignal;

  /** Progress callback, called with percentage 0-100. */
  onProgress?: (progress: number) => void;

  /** Optional logger for FFmpeg messages. If not set, logs are silently discarded. */
  onLog?: (message: string) => void;

  /** Custom FFmpeg base URL for core files. */
  ffmpegBaseUrl?: string;

  /** Custom FFmpeg multi-thread base URL. */
  ffmpegMTBaseUrl?: string;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}
