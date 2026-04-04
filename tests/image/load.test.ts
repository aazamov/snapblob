import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockClose = vi.fn();
const mockBitmap = {
  width: 800,
  height: 600,
  close: mockClose,
};

// Start with createImageBitmap available
vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));

import { loadImage } from "../../src/image/load";

describe("loadImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns LoadedImage with width, height, source, and cleanup", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const loaded = await loadImage(file);

    expect(loaded.width).toBe(800);
    expect(loaded.height).toBe(600);
    expect(loaded.source).toBeDefined();
    expect(typeof loaded.cleanup).toBe("function");

    loaded.cleanup();
  });

  it("cleanup calls bitmap.close()", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const loaded = await loadImage(file);

    loaded.cleanup();
    expect(mockClose).toHaveBeenCalled();
  });

  it("falls back to HTMLImageElement when createImageBitmap is unavailable", async () => {
    // Make createImageBitmap not a function so the typeof check fails
    vi.stubGlobal("createImageBitmap", "not-a-function");
    vi.useFakeTimers();

    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const promise = loadImage(file);

    // Catch the rejection to prevent unhandled rejection warnings
    promise.catch(() => {
      // expected
    });

    // Fast-forward past the 30s image load timeout
    await vi.advanceTimersByTimeAsync(31_000);

    await expect(promise).rejects.toThrow("timed out");
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("falls back when createImageBitmap throws", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("Unsupported")),
    );
    vi.useFakeTimers();

    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const promise = loadImage(file);

    // Catch the rejection to prevent unhandled rejection warnings
    promise.catch(() => {
      // expected
    });

    // Fast-forward past the 30s image load timeout
    await vi.advanceTimersByTimeAsync(31_000);

    await expect(promise).rejects.toThrow("timed out");
    expect(mockClose).not.toHaveBeenCalled();
  });
});
