/** Options for error construction, providing a `cause` chain. */
interface ImageErrorOptions {
  cause?: unknown;
}

/** Base error for all image processing failures. */
export class ImageProcessingError extends Error {
  override name = "ImageProcessingError" as const;
  readonly cause?: unknown;

  constructor(message: string, options?: ImageErrorOptions) {
    super(message);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/** Thrown when image validation constraints are violated. */
export class ImageValidationError extends Error {
  override name = "ImageValidationError" as const;
  readonly cause?: unknown;

  constructor(message: string, options?: ImageErrorOptions) {
    super(message);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
