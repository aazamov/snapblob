import { describe, it, expect } from "vitest";
import {
  FileHandlerError,
  FileHandlerValidationError,
  FileHandlerCompressionError,
  FileHandlerUploadError,
  ServerSideProcessError,
} from "../../../src/file-handlers/base-handler/errors";

describe("FileHandlerError", () => {
  it("is an instance of Error", () => {
    const error = new FileHandlerError("test error");
    expect(error).toBeInstanceOf(Error);
  });

  it("is an instance of FileHandlerError", () => {
    const error = new FileHandlerError("test error");
    expect(error).toBeInstanceOf(FileHandlerError);
  });

  it("preserves the error message", () => {
    const error = new FileHandlerError("something went wrong");
    expect(error.message).toBe("something went wrong");
  });

  it("has the correct name", () => {
    const error = new FileHandlerError("test");
    expect(error.name).toBe("Error");
  });
});

describe("FileHandlerValidationError", () => {
  it("is an instance of Error", () => {
    const error = new FileHandlerValidationError("validation failed");
    expect(error).toBeInstanceOf(Error);
  });

  it("is an instance of FileHandlerError", () => {
    const error = new FileHandlerValidationError("validation failed");
    expect(error).toBeInstanceOf(FileHandlerError);
  });

  it("is an instance of FileHandlerValidationError", () => {
    const error = new FileHandlerValidationError("validation failed");
    expect(error).toBeInstanceOf(FileHandlerValidationError);
  });

  it("preserves the error message", () => {
    const error = new FileHandlerValidationError("invalid file");
    expect(error.message).toBe("invalid file");
  });
});

describe("FileHandlerCompressionError", () => {
  it("is an instance of FileHandlerError", () => {
    const error = new FileHandlerCompressionError("compression failed");
    expect(error).toBeInstanceOf(FileHandlerError);
  });

  it("is an instance of Error", () => {
    const error = new FileHandlerCompressionError("compression failed");
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves the error message", () => {
    const error = new FileHandlerCompressionError("codec error");
    expect(error.message).toBe("codec error");
  });
});

describe("FileHandlerUploadError", () => {
  it("is an instance of FileHandlerError", () => {
    const error = new FileHandlerUploadError("upload failed");
    expect(error).toBeInstanceOf(FileHandlerError);
  });

  it("is an instance of Error", () => {
    const error = new FileHandlerUploadError("upload failed");
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves the error message", () => {
    const error = new FileHandlerUploadError("network error");
    expect(error.message).toBe("network error");
  });
});

describe("ServerSideProcessError", () => {
  it("is an instance of FileHandlerError", () => {
    const error = new ServerSideProcessError("server error");
    expect(error).toBeInstanceOf(FileHandlerError);
  });

  it("is an instance of Error", () => {
    const error = new ServerSideProcessError("server error");
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves the error message", () => {
    const error = new ServerSideProcessError("processing failed");
    expect(error.message).toBe("processing failed");
  });
});
