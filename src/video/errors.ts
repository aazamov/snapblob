/**
 * Base error for video transcoding failures.
 */
export class VideoTranscodeError extends Error {
  override name = "VideoTranscodeError";
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Thrown when the input file fails validation before transcoding.
 */
export class VideoValidationError extends VideoTranscodeError {
  override name = "VideoValidationError";
}

/**
 * Thrown when the user aborts the transcoding operation.
 */
export class VideoAbortError extends VideoTranscodeError {
  override name = "VideoAbortError";
}
