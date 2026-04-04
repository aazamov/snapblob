import { ImageMimeType, ResizeFilter } from "./constants.ts";
import { ImageProcessingError } from "./errors.ts";
import { loadImage } from "./load.ts";
import type { CompressImageOptions, ProgressCallback } from "./types.ts";
import {
  adjustOrientationWith,
  convertToAspectRatio,
  createCanvas,
  type ImageSize,
} from "./utils.ts";

/** Module-level cached Pica instance to avoid repeated instantiation. */
let picaInstance: InstanceType<typeof import("pica")> | null = null;

/** Lazily imports and caches a single Pica instance. */
async function getPica(): Promise<InstanceType<typeof import("pica")>> {
  if (!picaInstance) {
    const mod = await import("pica");
    const Pica = mod.default ?? mod;
    picaInstance = new Pica();
  }
  return picaInstance;
}

/**
 * Destroys the cached Pica instance to free memory.
 * Call this when you're done with image processing in an SPA.
 */
export function destroyPica(): void {
  picaInstance = null;
}

/**
 * Preloads the Pica library so the first `compressImage` call is faster.
 *
 * @example
 * ```ts
 * await preloadPica();
 * ```
 */
export async function preloadPica(): Promise<void> {
  await getPica();
}

/**
 * Reports progress at the given percentage, guarding against missing callbacks.
 */
function reportProgress(
  onProgress: ProgressCallback | undefined,
  value: number,
): void {
  if (onProgress) {
    onProgress(value);
  }
}

/**
 * Validates compression options at the API boundary.
 * Throws immediately on invalid inputs so callers get clear feedback.
 */
function validateOptions(options: CompressImageOptions): void {
  if (options.quality !== undefined) {
    if (options.quality < 0 || options.quality > 1 || Number.isNaN(options.quality)) {
      throw new ImageProcessingError(
        `Invalid quality value: ${options.quality}. Must be between 0 and 1.`,
      );
    }
  }
  if (options.maxWidth !== undefined) {
    if (options.maxWidth <= 0 || !Number.isFinite(options.maxWidth)) {
      throw new ImageProcessingError(
        `Invalid maxWidth: ${options.maxWidth}. Must be a positive number.`,
      );
    }
  }
  if (options.maxHeight !== undefined) {
    if (options.maxHeight <= 0 || !Number.isFinite(options.maxHeight)) {
      throw new ImageProcessingError(
        `Invalid maxHeight: ${options.maxHeight}. Must be a positive number.`,
      );
    }
  }
}

/**
 * Compresses and optionally resizes an image file.
 *
 * Uses the Pica library for high-quality downscaling. When the source image
 * is already within the target dimensions, it skips resizing and only re-encodes.
 *
 * @param file - The image file to compress
 * @param options - Compression configuration
 * @returns The compressed image as a Blob
 * @throws {ImageProcessingError} If image loading or compression fails
 *
 * @example
 * ```ts
 * const compressed = await compressImage(file, {
 *   maxWidth: 1920,
 *   maxHeight: 1080,
 *   quality: 0.8,
 *   mimeType: ImageMimeType.WEBP,
 *   onProgress: (p) => console.log(`${p}%`),
 * });
 * ```
 */
export async function compressImage(
  file: File | Blob,
  options: CompressImageOptions = {},
): Promise<Blob> {
  if (file.size === 0) {
    throw new ImageProcessingError("Input file is empty (0 bytes).");
  }

  validateOptions(options);

  const {
    maxWidth,
    maxHeight,
    mimeType = ImageMimeType.WEBP,
    quality = 0.8,
    resizeFilter = ResizeFilter.MKS2013,
    adjustOrientation = true,
    onProgress,
    skipIfSmaller = false,
  } = options;

  reportProgress(onProgress, 5);

  let loaded;
  try {
    loaded = await loadImage(file);
  } catch (error) {
    throw new ImageProcessingError("Failed to load image for compression", {
      cause: error,
    });
  }

  reportProgress(onProgress, 15);

  const { width: srcWidth, height: srcHeight, source, cleanup } = loaded;

  try {
    const pica = await getPica();
    reportProgress(onProgress, 25);

    const targetDims = computeTargetDimensions(
      srcWidth,
      srcHeight,
      maxWidth,
      maxHeight,
      adjustOrientation,
    );

    const needsResize =
      targetDims.width !== srcWidth || targetDims.height !== srcHeight;

    let resultBlob: Blob;

    if (needsResize) {
      resultBlob = await resizeAndEncode(
        pica,
        source,
        srcWidth,
        srcHeight,
        targetDims,
        resizeFilter,
        mimeType,
        quality,
        onProgress,
      );
    } else {
      reportProgress(onProgress, 50);
      resultBlob = await encodeWithoutResize(
        pica,
        source,
        srcWidth,
        srcHeight,
        mimeType,
        quality,
      );
      reportProgress(onProgress, 85);
    }

    reportProgress(onProgress, 95);

    if (skipIfSmaller && resultBlob.size >= file.size) {
      reportProgress(onProgress, 100);
      // Always return a plain Blob (not File) to match return type
      return new Blob([file], { type: file.type });
    }

    reportProgress(onProgress, 100);
    return resultBlob;
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }
    throw new ImageProcessingError("Image compression failed", {
      cause: error,
    });
  } finally {
    cleanup();
  }
}

/**
 * Computes final target dimensions, applying orientation adjustment
 * and aspect-ratio preservation. Clamps to source dimensions (never upscales).
 */
function computeTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number | undefined,
  maxHeight: number | undefined,
  shouldAdjustOrientation: boolean,
): { width: number; height: number } {
  // Guard against invalid source dimensions
  if (srcWidth <= 0 || srcHeight <= 0 || !Number.isFinite(srcWidth) || !Number.isFinite(srcHeight)) {
    throw new ImageProcessingError(
      `Invalid source dimensions: ${srcWidth}x${srcHeight}.`,
    );
  }

  let targetWidth = maxWidth ?? srcWidth;
  let targetHeight = maxHeight ?? srcHeight;

  if (shouldAdjustOrientation) {
    const source: ImageSize = [srcWidth, srcHeight];
    const target: ImageSize = [targetWidth, targetHeight];
    const adjusted = adjustOrientationWith(source, target);
    targetWidth = adjusted[0];
    targetHeight = adjusted[1];
  }

  // Clamp to source dimensions so we never upscale
  targetWidth = Math.min(targetWidth, srcWidth);
  targetHeight = Math.min(targetHeight, srcHeight);

  // Preserve source aspect ratio within the target bounding box
  const srcAspectRatio = srcWidth / srcHeight;
  const fitted = convertToAspectRatio(targetWidth, targetHeight, srcAspectRatio);

  // Final safety: ensure positive integer dimensions
  const finalWidth = Math.max(1, Math.round(fitted.width));
  const finalHeight = Math.max(1, Math.round(fitted.height));

  if (!Number.isFinite(finalWidth) || !Number.isFinite(finalHeight)) {
    throw new ImageProcessingError(
      `Computed invalid dimensions: ${finalWidth}x${finalHeight}.`,
    );
  }

  return { width: finalWidth, height: finalHeight };
}

/**
 * Draws the source onto a canvas at source dimensions, then encodes.
 * Used when no resize is needed.
 */
async function encodeWithoutResize(
  pica: InstanceType<typeof import("pica")>,
  source: HTMLImageElement | ImageBitmap,
  width: number,
  height: number,
  mimeType: ImageMimeType,
  quality: number,
): Promise<Blob> {
  const canvas = createCanvas(width, height);

  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;

  if (!ctx) {
    throw new ImageProcessingError("Failed to get canvas 2D context");
  }

  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  const blob = await pica.toBlob(canvas as HTMLCanvasElement, mimeType, quality);

  // Free canvas GPU memory
  releaseCanvas(canvas);

  return blob;
}

/**
 * Resizes the source image to target dimensions using Pica, then encodes.
 */
async function resizeAndEncode(
  pica: InstanceType<typeof import("pica")>,
  source: HTMLImageElement | ImageBitmap,
  srcWidth: number,
  srcHeight: number,
  target: { width: number; height: number },
  resizeFilter: ResizeFilter,
  mimeType: ImageMimeType,
  quality: number,
  onProgress: ProgressCallback | undefined,
): Promise<Blob> {
  // Draw source onto a source-sized canvas (Pica needs canvas input)
  const srcCanvas = createCanvas(srcWidth, srcHeight);
  const srcCtx = srcCanvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;

  if (!srcCtx) {
    throw new ImageProcessingError("Failed to get source canvas 2D context");
  }

  srcCtx.drawImage(source as CanvasImageSource, 0, 0, srcWidth, srcHeight);
  reportProgress(onProgress, 35);

  const destCanvas = createCanvas(target.width, target.height);
  reportProgress(onProgress, 45);

  await pica.resize(
    srcCanvas as HTMLCanvasElement,
    destCanvas as HTMLCanvasElement,
    { filter: resizeFilter },
  );
  reportProgress(onProgress, 70);

  const blob = await pica.toBlob(
    destCanvas as HTMLCanvasElement,
    mimeType,
    quality,
  );
  reportProgress(onProgress, 85);

  // Free canvas GPU memory
  releaseCanvas(srcCanvas);
  releaseCanvas(destCanvas);

  return blob;
}

/**
 * Releases canvas memory by zeroing its dimensions.
 * This signals the browser to free the backing pixel buffer.
 */
function releaseCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // OffscreenCanvas may throw in some browsers — ignore
  }
}
