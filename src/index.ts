// Primary API — standalone functions
export { compressImage, compressImages, validateImage, validateImageOrThrow } from "./image";
export { transcodeVideo, getVideoInfo, extractAudio, getVideoThumbnail } from "./video";

// Format detection
export { getBestImageFormat, supportsWebp, supportsAvif } from "./image";

// Lifecycle management
export { destroyPica, preloadPica } from "./image";
export { destroyFFmpeg, preloadFFmpeg } from "./video";

// Image types
export type {
  CompressImageOptions,
  BatchCompressOptions,
  ValidateImageOptions,
  ImageValidationResult,
  ProgressCallback,
} from "./image";

// Video types
export type {
  TranscodeVideoOptions,
  VideoInfo,
  VideoPreset,
  ExtractAudioOptions,
  AudioFormat,
  VideoThumbnailOptions,
  ThumbnailFormat,
} from "./video";

// Video presets & helpers
export { VIDEO_PRESETS, applyPreset } from "./video";
export type { VideoPresetName } from "./video";

// Image constants
export { ImageMimeType, ResizeFilter } from "./image";

// Video/FFmpeg constants
export {
  FFMPEGVideoEncoder,
  FFMPEGAudioEncoder,
  EncoderH264Preset,
  FFMPEGPixelFormat,
} from "./video";

// Shared constants
export { DataSize, BitrateUnit, StreamDuration } from "./constants/units";
export { MediaImageMimeType, VideoFileMimeType } from "./file-handlers/constants/mimes";

// Error classes
export { ImageProcessingError, ImageValidationError } from "./image";
export { VideoTranscodeError, VideoValidationError, VideoAbortError } from "./video";

// Legacy handlers (backward compatibility) — @deprecated, will be removed in v2.0
export { ImageHandler, TypedImageHandler } from "./file-handlers/image-handler/handler"; // @deprecated Use compressImage() instead
export { FFMPEGHandler, TypedFFMPEGHandler } from "./file-handlers/ffmpeg-handler/handler"; // @deprecated Use transcodeVideo() instead
export { BaseFileHandler } from "./file-handlers/base-handler/handler"; // @deprecated Use standalone functions instead
