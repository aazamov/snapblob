import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImageProcessingError } from "../../src/image/errors";

// --- Mocks ---

const mockResize = vi.fn().mockResolvedValue(undefined);
const mockToBlob = vi
  .fn()
  .mockResolvedValue(new Blob(["compressed"], { type: "image/webp" }));

vi.mock("pica", () => {
  return {
    default: class MockPica {
      resize = mockResize;
      toBlob = mockToBlob;
    },
  };
});

// Mock createImageBitmap globally
const mockClose = vi.fn();
vi.stubGlobal(
  "createImageBitmap",
  vi.fn().mockResolvedValue({
    width: 800,
    height: 600,
    close: mockClose,
  }),
);

// Mock OffscreenCanvas so createCanvas works in happy-dom
vi.stubGlobal(
  "OffscreenCanvas",
  class MockOffscreenCanvas {
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return {
        drawImage: vi.fn(),
      };
    }
  },
);

import {
  compressImage,
  destroyPica,
  preloadPica,
} from "../../src/image/compress";

describe("compressImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroyPica();
  });

  afterEach(() => {
    destroyPica();
  });

  it("returns a Blob on basic compression", async () => {
    const file = new File(["test-data"], "photo.jpg", { type: "image/jpeg" });
    const result = await compressImage(file);

    expect(result).toBeInstanceOf(Blob);
  });

  it("respects quality, maxWidth, maxHeight options", async () => {
    const file = new File(["test-data"], "photo.jpg", { type: "image/jpeg" });
    await compressImage(file, {
      quality: 0.5,
      maxWidth: 400,
      maxHeight: 300,
    });

    // resize should be called because we're requesting smaller dimensions
    expect(mockResize).toHaveBeenCalled();
    // toBlob should be called with the quality value
    expect(mockToBlob).toHaveBeenCalled();
  });

  it("skipIfSmaller returns original when compressed is larger", async () => {
    // Create a file smaller than the mock compressed output
    const tinyContent = "x";
    const file = new File([tinyContent], "tiny.jpg", { type: "image/jpeg" });

    // Make the compressed blob larger than the input
    mockToBlob.mockResolvedValueOnce(
      new Blob(["much-larger-compressed-output-data-here"], {
        type: "image/webp",
      }),
    );

    const result = await compressImage(file, { skipIfSmaller: true });

    // Should return original file wrapped as Blob
    expect(result.type).toBe("image/jpeg");
  });

  it("throws ImageProcessingError on empty file (size 0)", async () => {
    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });

    await expect(compressImage(emptyFile)).rejects.toThrow(
      ImageProcessingError,
    );
    await expect(compressImage(emptyFile)).rejects.toThrow(
      "Input file is empty",
    );
  });

  it("throws on invalid quality (negative)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { quality: -0.5 })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("throws on invalid quality (> 1)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { quality: 1.5 })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("throws on invalid quality (NaN)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { quality: NaN })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("throws on invalid maxWidth (0)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { maxWidth: 0 })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("throws on invalid maxWidth (negative)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { maxWidth: -100 })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("throws on invalid maxHeight (0)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { maxHeight: 0 })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("throws on invalid maxHeight (negative)", async () => {
    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    await expect(compressImage(file, { maxHeight: -50 })).rejects.toThrow(
      ImageProcessingError,
    );
  });

  it("calls onProgress callback with values between 0 and 100", async () => {
    const file = new File(["test-data"], "photo.jpg", { type: "image/jpeg" });
    const onProgress = vi.fn();

    await compressImage(file, { onProgress });

    expect(onProgress).toHaveBeenCalled();
    const calls = onProgress.mock.calls.map(
      (c: [number]) => c[0],
    ) as number[];

    // All progress values should be between 0 and 100
    for (const val of calls) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }

    // Last call should be 100
    expect(calls[calls.length - 1]).toBe(100);
  });

  it("works with default options (no args)", async () => {
    const file = new File(["test-data"], "photo.jpg", { type: "image/jpeg" });
    const result = await compressImage(file);

    expect(result).toBeInstanceOf(Blob);
  });
});

describe("destroyPica", () => {
  it("resets singleton without throwing", () => {
    expect(() => destroyPica()).not.toThrow();
    // Call twice to verify idempotent
    expect(() => destroyPica()).not.toThrow();
  });
});

describe("preloadPica", () => {
  it("does not throw", async () => {
    destroyPica();
    await expect(preloadPica()).resolves.toBeUndefined();
  });
});
