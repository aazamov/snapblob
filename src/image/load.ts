/** Default timeout for loading an image (ms). */
const IMAGE_LOAD_TIMEOUT = 30_000;

/** Result of loading an image file, providing dimensions, a renderable source, and cleanup. */
export interface LoadedImage {
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
  /** The loaded image source, usable as a canvas image source. */
  source: HTMLImageElement | ImageBitmap;
  /** Releases resources (object URLs, ImageBitmap memory). Must be called when done. */
  cleanup: () => void;
}

/**
 * Loads an image from a File or Blob, returning its dimensions and a renderable source.
 *
 * Tries `createImageBitmap` first for better performance and Web Worker compatibility.
 * Falls back to an `HTMLImageElement` with an object URL for older browsers.
 *
 * @param file - The image file or blob to load
 * @returns A loaded image with dimensions, source, and cleanup function
 * @throws {Error} If the image cannot be decoded or loading times out
 */
export async function loadImage(file: File | Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement path
    }
  }

  return loadImageViaElement(file);
}

/**
 * Loads an image using an HTMLImageElement and object URL.
 * Used as a fallback when createImageBitmap is unavailable.
 * Includes a timeout to prevent hanging on corrupt files.
 */
function loadImageViaElement(file: File | Blob): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);

  return new Promise<LoadedImage>((resolve, reject) => {
    const img = document.createElement("img");
    img.src = url;

    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          `Image loading timed out after ${IMAGE_LOAD_TIMEOUT / 1000}s.`,
        ),
      );
    }, IMAGE_LOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timer);
      resolve({
        width: img.width,
        height: img.height,
        source: img,
        cleanup: () => URL.revokeObjectURL(url),
      });
    };

    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Failed to load image. The file may be corrupted or in an unsupported format.",
        ),
      );
    };
  });
}
