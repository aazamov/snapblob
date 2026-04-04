/** A width-height pair representing image dimensions. */
export type ImageSize = [width: number, height: number];

/**
 * Converts dimensions to fit a target aspect ratio within the original bounding box.
 * The result never exceeds the original width or height.
 *
 * @param width - Bounding box width
 * @param height - Bounding box height
 * @param targetAspectRatio - Desired aspect ratio (width / height)
 * @returns Adjusted dimensions that match the target aspect ratio
 */
export function convertToAspectRatio(
  width: number,
  height: number,
  targetAspectRatio: number,
): { width: number; height: number } {
  // Guard against invalid inputs
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(targetAspectRatio) ||
    targetAspectRatio <= 0
  ) {
    return {
      width: Math.max(1, Math.round(width) || 1),
      height: Math.max(1, Math.round(height) || 1),
    };
  }

  if (width / height === targetAspectRatio) {
    return { width, height };
  }

  const heightFromWidth = Math.floor(width / targetAspectRatio);
  if (heightFromWidth <= height) {
    return { width, height: Math.max(1, heightFromWidth) };
  }

  const widthFromHeight = Math.floor(height * targetAspectRatio);
  return { width: Math.max(1, widthFromHeight), height };
}

/**
 * Adjusts the target dimensions to match the orientation (landscape vs portrait)
 * of the source image. If orientations differ, the target dimensions are swapped.
 *
 * @param source - Original image dimensions [width, height]
 * @param target - Target dimensions [width, height]
 * @returns Target dimensions adjusted to match source orientation
 */
export function adjustOrientationWith(
  source: ImageSize,
  target: ImageSize
): ImageSize {
  const sourceIsLandscape = source[0] >= source[1];
  const targetIsLandscape = target[0] >= target[1];
  return sourceIsLandscape !== targetIsLandscape
    ? [target[1], target[0]]
    : target;
}

/**
 * Creates a canvas element, preferring OffscreenCanvas when available
 * for Web Worker compatibility.
 *
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns A canvas element (OffscreenCanvas or HTMLCanvasElement)
 */
export function createCanvas(
  width: number,
  height: number
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
