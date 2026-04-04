import { describe, it, expect } from "vitest";
import {
  VideoTranscodeError,
  VideoAbortError,
  VideoValidationError,
} from "../../src/video/errors";

describe("VideoTranscodeError", () => {
  it("has correct name", () => {
    const error = new VideoTranscodeError("test error");

    expect(error.name).toBe("VideoTranscodeError");
    expect(error.message).toBe("test error");
  });

  it("is instance of Error", () => {
    const error = new VideoTranscodeError("test");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VideoTranscodeError);
  });

  it("preserves cause when passed", () => {
    const cause = new Error("root cause");
    const error = new VideoTranscodeError("wrapper", { cause });

    expect(error.cause).toBe(cause);
  });

  it("cause is undefined when not passed", () => {
    const error = new VideoTranscodeError("no cause");

    expect(error.cause).toBeUndefined();
  });
});

describe("VideoAbortError", () => {
  it("has correct name", () => {
    const error = new VideoAbortError("aborted");

    expect(error.name).toBe("VideoAbortError");
  });

  it("extends VideoTranscodeError", () => {
    const error = new VideoAbortError("aborted");

    expect(error).toBeInstanceOf(VideoTranscodeError);
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves cause", () => {
    const cause = new Error("signal");
    const error = new VideoAbortError("aborted", { cause });

    expect(error.cause).toBe(cause);
  });
});

describe("VideoValidationError", () => {
  it("has correct name", () => {
    const error = new VideoValidationError("invalid input");

    expect(error.name).toBe("VideoValidationError");
  });

  it("extends VideoTranscodeError", () => {
    const error = new VideoValidationError("invalid");

    expect(error).toBeInstanceOf(VideoTranscodeError);
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves cause", () => {
    const cause = new TypeError("bad type");
    const error = new VideoValidationError("validation failed", { cause });

    expect(error.cause).toBe(cause);
  });

  it("instanceof checks work correctly across hierarchy", () => {
    const transcodeErr = new VideoTranscodeError("transcode");
    const abortErr = new VideoAbortError("abort");
    const validErr = new VideoValidationError("valid");

    // All are Errors
    expect(transcodeErr).toBeInstanceOf(Error);
    expect(abortErr).toBeInstanceOf(Error);
    expect(validErr).toBeInstanceOf(Error);

    // All are VideoTranscodeError
    expect(transcodeErr).toBeInstanceOf(VideoTranscodeError);
    expect(abortErr).toBeInstanceOf(VideoTranscodeError);
    expect(validErr).toBeInstanceOf(VideoTranscodeError);

    // Only specific ones are their subclass
    expect(transcodeErr).not.toBeInstanceOf(VideoAbortError);
    expect(transcodeErr).not.toBeInstanceOf(VideoValidationError);
    expect(abortErr).not.toBeInstanceOf(VideoValidationError);
    expect(validErr).not.toBeInstanceOf(VideoAbortError);
  });
});
