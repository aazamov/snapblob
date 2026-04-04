import { ImageMimeType, ResizeFilter } from "./constants.ts";
import type { ImageSize } from "./utils.ts";

/** Callback invoked during compression to report progress (0-100). */
export type ProgressCallback = (progress: number) => void;

/** Configuration options for {@link compressImage}. */
export interface CompressImageOptions {
  /** Maximum output width in pixels. */
  maxWidth?: number;
  /** Maximum output height in pixels. */
  maxHeight?: number;
  /** Output MIME type. Defaults to {@link ImageMimeType.WEBP}. */
  mimeType?: ImageMimeType;
  /** Encoding quality from 0 to 1. Defaults to 0.8. */
  quality?: number;
  /** Pica resize filter algorithm. Defaults to {@link ResizeFilter.MKS2013}. */
  resizeFilter?: ResizeFilter;
  /**
   * Whether to adjust target dimensions to match the source image orientation.
   * Defaults to true.
   */
  adjustOrientation?: boolean;
  /** Progress callback invoked at key stages of compression. */
  onProgress?: ProgressCallback;
  /**
   * When true, returns the original blob if compression would increase file size.
   * Defaults to false.
   */
  skipIfSmaller?: boolean;
}

/** Configuration options for {@link validateImage}. */
export interface ValidateImageOptions {
  /** Minimum allowed dimensions [width, height]. */
  minSize?: ImageSize;
  /** Maximum allowed dimensions [width, height]. */
  maxSize?: ImageSize;
  /** List of allowed MIME types. */
  allowedTypes?: ImageMimeType[];
  /** Maximum file size in bytes. */
  maxFileSize?: number;
}

/** Result returned by {@link validateImage}. */
export interface ImageValidationResult {
  /** Whether the image passed all validation checks. */
  valid: boolean;
  /** Image width in pixels (populated when image could be loaded). */
  width?: number;
  /** Image height in pixels (populated when image could be loaded). */
  height?: number;
  /** Validation error messages, empty when valid. */
  errors: string[];
}
