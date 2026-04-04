import { ImageValidationError } from "./errors.ts";
import { loadImage } from "./load.ts";
import type { ImageValidationResult, ValidateImageOptions } from "./types.ts";
import type { ImageSize } from "./utils.ts";

/**
 * Validates an image file against dimension, type, and size constraints.
 *
 * Loads the image to check its actual pixel dimensions, then runs all
 * configured checks. Returns a result object rather than throwing, so
 * callers can handle multiple errors at once.
 *
 * @param file - The image file to validate
 * @param options - Validation constraints
 * @returns Validation result with dimensions and any error messages
 *
 * @example
 * ```ts
 * const result = await validateImage(file, {
 *   minSize: [100, 100],
 *   maxSize: [4096, 4096],
 *   maxFileSize: 10 * 1024 * 1024,
 *   allowedTypes: [ImageMimeType.JPEG, ImageMimeType.PNG],
 * });
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export async function validateImage(
  file: File,
  options: ValidateImageOptions = {}
): Promise<ImageValidationResult> {
  const errors: string[] = [];

  // Check file type (empty array = no types allowed, which rejects everything)
  if (options.allowedTypes !== undefined) {
    if (options.allowedTypes.length === 0) {
      errors.push("No allowed types specified — all types are rejected.");
    } else {
      const allowed = options.allowedTypes as string[];
      if (!allowed.includes(file.type)) {
        errors.push(
          `File type "${file.type}" is not allowed. ` +
            `Accepted types: ${options.allowedTypes.join(", ")}`,
        );
      }
    }
  }

  // Check file size
  if (options.maxFileSize !== undefined && file.size > options.maxFileSize) {
    errors.push(
      `File size ${file.size} bytes exceeds maximum of ${options.maxFileSize} bytes`
    );
  }

  // Load image to get dimensions
  let width: number | undefined;
  let height: number | undefined;

  try {
    const loaded = await loadImage(file);
    width = loaded.width;
    height = loaded.height;
    loaded.cleanup();

    validateDimensions(width, height, options, errors);
  } catch {
    errors.push("Failed to load image for dimension validation");
  }

  return {
    valid: errors.length === 0,
    width,
    height,
    errors,
  };
}

/**
 * Validates image dimensions against min/max size constraints.
 */
function validateDimensions(
  width: number,
  height: number,
  options: ValidateImageOptions,
  errors: string[]
): void {
  if (options.minSize) {
    const [minW, minH]: ImageSize = options.minSize;
    if (width < minW || height < minH) {
      errors.push(
        `Image dimensions ${width}x${height} are below minimum ${minW}x${minH}`
      );
    }
  }

  if (options.maxSize) {
    const [maxW, maxH]: ImageSize = options.maxSize;
    if (width > maxW || height > maxH) {
      errors.push(
        `Image dimensions ${width}x${height} exceed maximum ${maxW}x${maxH}`
      );
    }
  }
}

/**
 * Validates an image and throws if validation fails.
 *
 * Convenience wrapper around {@link validateImage} for use cases where
 * throwing is preferred over inspecting a result object.
 *
 * @param file - The image file to validate
 * @param options - Validation constraints
 * @throws {ImageValidationError} If any validation check fails
 */
export async function validateImageOrThrow(
  file: File,
  options: ValidateImageOptions = {}
): Promise<void> {
  const result = await validateImage(file, options);
  if (!result.valid) {
    throw new ImageValidationError(result.errors.join("; "));
  }
}
