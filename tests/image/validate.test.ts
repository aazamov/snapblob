import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageMimeType } from "../../src/image/constants";
import { ImageValidationError } from "../../src/image/errors";

// Mock createImageBitmap
const mockClose = vi.fn();
vi.stubGlobal(
  "createImageBitmap",
  vi.fn().mockResolvedValue({
    width: 800,
    height: 600,
    close: mockClose,
  }),
);

import {
  validateImage,
  validateImageOrThrow,
} from "../../src/image/validate";

describe("validateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valid image passes all checks", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      allowedTypes: [ImageMimeType.JPEG],
      maxFileSize: 1024 * 1024,
      minSize: [100, 100],
      maxSize: [2000, 2000],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("file too large fails maxFileSize check", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      maxFileSize: 1, // 1 byte
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(
      true,
    );
  });

  it("dimensions too small fails minSize check", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      minSize: [1000, 1000], // larger than 800x600
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("below minimum"))).toBe(true);
  });

  it("dimensions too large fails maxSize check", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      maxSize: [400, 400], // smaller than 800x600
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exceed maximum"))).toBe(true);
  });

  it("wrong MIME type fails allowedTypes check", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      allowedTypes: [ImageMimeType.PNG, ImageMimeType.WEBP],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("not allowed"))).toBe(true);
  });

  it("empty allowedTypes array rejects everything", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      allowedTypes: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("No allowed types"))).toBe(
      true,
    );
  });

  it("collects multiple errors", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file, {
      allowedTypes: [ImageMimeType.PNG], // wrong type
      maxFileSize: 1, // too large
      minSize: [1000, 1000], // too small
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("result contains width and height when image loads", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await validateImage(file);

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});

describe("validateImageOrThrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ImageValidationError on failure", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await expect(
      validateImageOrThrow(file, {
        allowedTypes: [ImageMimeType.PNG],
      }),
    ).rejects.toThrow(ImageValidationError);
  });

  it("passes without throwing on valid input", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await expect(
      validateImageOrThrow(file, {
        allowedTypes: [ImageMimeType.JPEG],
        maxFileSize: 1024 * 1024,
      }),
    ).resolves.toBeUndefined();
  });
});
