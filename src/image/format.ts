import { ImageMimeType } from "./constants";

// ---------------------------------------------------------------------------
// Cached detection results
// ---------------------------------------------------------------------------

let cachedWebpSupport: boolean | null = null;
let cachedAvifSupport: boolean | null = null;

/**
 * Tests whether the browser can encode a given image format by
 * drawing a 1x1 pixel to a canvas and checking `toDataURL` output.
 */
function testFormatSupport(mimeType: string): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL(mimeType);
    // If the browser doesn't support the format, it falls back to "image/png"
    return dataUrl.startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
}

/**
 * Checks whether the current browser supports encoding WebP images.
 * The result is cached after the first call.
 *
 * @returns `true` if WebP encoding is supported
 *
 * @example
 * ```ts
 * if (supportsWebp()) {
 *   console.log("WebP is supported!");
 * }
 * ```
 */
export function supportsWebp(): boolean {
  if (cachedWebpSupport === null) {
    cachedWebpSupport = testFormatSupport("image/webp");
  }
  return cachedWebpSupport;
}

/**
 * Checks whether the current browser supports encoding AVIF images.
 * The result is cached after the first call.
 *
 * @returns `true` if AVIF encoding is supported
 *
 * @example
 * ```ts
 * if (supportsAvif()) {
 *   console.log("AVIF is supported!");
 * }
 * ```
 */
export function supportsAvif(): boolean {
  if (cachedAvifSupport === null) {
    cachedAvifSupport = testFormatSupport("image/avif");
  }
  return cachedAvifSupport;
}

/**
 * Returns the best image format supported by the current browser,
 * preferring modern formats for smaller file sizes.
 *
 * Priority order: AVIF > WebP > JPEG
 *
 * @returns The best supported {@link ImageMimeType}
 *
 * @example
 * ```ts
 * import { getBestImageFormat, compressImage } from "snapblob";
 *
 * const compressed = await compressImage(file, {
 *   mimeType: getBestImageFormat(),
 *   quality: 0.8,
 * });
 * ```
 */
export function getBestImageFormat(): ImageMimeType {
  if (supportsAvif()) {
    // ImageMimeType doesn't include AVIF — return WEBP as next best
    // AVIF is "image/avif" but that's not in the enum, so we check dynamically
    return "image/avif" as ImageMimeType;
  }
  if (supportsWebp()) {
    return ImageMimeType.WEBP;
  }
  return ImageMimeType.JPEG;
}
