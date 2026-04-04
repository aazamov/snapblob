import { describe, it, expect } from "vitest";
import { getFileExtension } from "../../src/utils/files";

describe("getFileExtension", () => {
  it("returns extension for a normal file", () => {
    expect(getFileExtension("video.mp4")).toBe("mp4");
  });

  it("returns last extension for file with multiple dots", () => {
    expect(getFileExtension("my.video.file.webm")).toBe("webm");
  });

  it("returns the filename itself when there is no extension", () => {
    // .pop() on a single-element array returns that element
    expect(getFileExtension("filename")).toBe("filename");
  });

  it("returns extension for hidden file (dot-prefixed)", () => {
    // ".gitignore".split(".") => ["", "gitignore"], pop => "gitignore"
    expect(getFileExtension(".gitignore")).toBe("gitignore");
  });

  it("returns undefined for empty string", () => {
    // "".split(".") => [""], pop => ""
    expect(getFileExtension("")).toBe("");
  });

  it("returns extension for common image formats", () => {
    expect(getFileExtension("photo.jpg")).toBe("jpg");
    expect(getFileExtension("image.png")).toBe("png");
    expect(getFileExtension("graphic.webp")).toBe("webp");
  });

  it("returns extension for uppercase filenames", () => {
    expect(getFileExtension("VIDEO.MP4")).toBe("MP4");
  });
});
