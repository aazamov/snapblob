import type { TranscodeVideoOptions } from "./types";

export interface VideoPreset {
  codec: string;
  preset: string;
  crf: number;
  maxBitrate: string;
  audioBitrate: string;
  pixelFormat: string;
  /** Optional: set audioCodec explicitly (e.g. for audio-only extraction). */
  audioCodec?: string;
  /** Optional: strip video track. */
  noVideo?: boolean;
}

export const VIDEO_PRESETS = {
  /** High quality: preserve detail, larger file */
  "high-quality": {
    codec: "libx264",
    preset: "slow",
    crf: 18,
    maxBitrate: "8M",
    audioBitrate: "192k",
    pixelFormat: "yuv420p",
  },
  /** Balanced: good quality with reasonable file size */
  balanced: {
    codec: "libx264",
    preset: "medium",
    crf: 23,
    maxBitrate: "5M",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
  },
  /** Small file: aggressive compression */
  "small-file": {
    codec: "libx264",
    preset: "fast",
    crf: 28,
    maxBitrate: "2M",
    audioBitrate: "96k",
    pixelFormat: "yuv420p",
  },
  /** Social media optimized: 720p, good for sharing */
  "social-media": {
    codec: "libx264",
    preset: "fast",
    crf: 26,
    maxBitrate: "3M",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
  },
  /** Instagram feed: square/portrait video, up to 60s, optimized for mobile feeds */
  "instagram-feed": {
    codec: "libx264",
    crf: 23,
    maxBitrate: "3.5M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
  },
  /** Instagram story: 9:16 vertical video, optimized for full-screen mobile playback */
  "instagram-story": {
    codec: "libx264",
    crf: 23,
    maxBitrate: "4M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
  },
  /** TikTok: vertical short-form video, optimized for mobile playback */
  "tiktok": {
    codec: "libx264",
    crf: 23,
    maxBitrate: "4M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
  },
  /** YouTube 1080p: full HD upload, good balance of quality and upload speed */
  "youtube-1080p": {
    codec: "libx264",
    crf: 20,
    maxBitrate: "8M",
    preset: "medium",
    audioBitrate: "192k",
    pixelFormat: "yuv420p",
  },
  /** YouTube 4K: ultra HD upload, maximum quality for large displays */
  "youtube-4k": {
    codec: "libx264",
    crf: 18,
    maxBitrate: "20M",
    preset: "slow",
    audioBitrate: "192k",
    pixelFormat: "yuv420p",
  },
  /** Twitter/X: optimized for timeline video playback with size constraints */
  "twitter": {
    codec: "libx264",
    crf: 24,
    maxBitrate: "5M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
  },
} as const satisfies Record<string, VideoPreset>;

export type VideoPresetName = keyof typeof VIDEO_PRESETS;

/**
 * Returns partial `TranscodeVideoOptions` populated from a named preset.
 * Callers can spread the result and override individual fields.
 */
export function applyPreset(presetName: VideoPresetName): Partial<TranscodeVideoOptions> {
  const preset = VIDEO_PRESETS[presetName];
  return {
    codec: preset.codec,
    preset: preset.preset as TranscodeVideoOptions["preset"],
    crf: preset.crf,
    maxBitrate: preset.maxBitrate,
    audioBitrate: preset.audioBitrate,
    pixelFormat: preset.pixelFormat,
  };
}
