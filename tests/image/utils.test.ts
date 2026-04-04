import { describe, it, expect, vi } from "vitest";
import {
  convertToAspectRatio,
  adjustOrientationWith,
  createCanvas,
} from "../../src/image/utils";

// Ensure OffscreenCanvas is available for createCanvas tests
vi.stubGlobal(
  "OffscreenCanvas",
  class MockOffscreenCanvas {
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
    }
  },
);

describe("convertToAspectRatio", () => {
  it("normal case: fits within bounding box", () => {
    // 16:9 aspect ratio in a 1000x1000 box
    const result = convertToAspectRatio(1000, 1000, 16 / 9);

    expect(result.width).toBe(1000);
    expect(result.height).toBeLessThanOrEqual(1000);
    expect(result.height).toBeGreaterThan(0);
  });

  it("same ratio returns same dimensions", () => {
    const result = convertToAspectRatio(1600, 900, 1600 / 900);

    expect(result.width).toBe(1600);
    expect(result.height).toBe(900);
  });

  it("landscape to portrait aspect ratio", () => {
    // Tall aspect ratio (9:16) in a 1000x1000 box
    const result = convertToAspectRatio(1000, 1000, 9 / 16);

    expect(result.width).toBeLessThanOrEqual(1000);
    expect(result.height).toBe(1000);
    expect(result.width).toBeGreaterThan(0);
  });

  it("zero width returns safe defaults", () => {
    const result = convertToAspectRatio(0, 500, 16 / 9);

    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("zero height returns safe defaults", () => {
    const result = convertToAspectRatio(500, 0, 16 / 9);

    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("NaN inputs return safe defaults", () => {
    const result = convertToAspectRatio(NaN, NaN, 16 / 9);

    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("Infinity inputs return safe defaults", () => {
    const result = convertToAspectRatio(Infinity, 500, 16 / 9);

    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("negative aspect ratio returns safe defaults", () => {
    const result = convertToAspectRatio(800, 600, -1);

    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe("adjustOrientationWith", () => {
  it("same orientation is unchanged", () => {
    // Both landscape
    const result = adjustOrientationWith([1600, 900], [800, 600]);

    expect(result).toEqual([800, 600]);
  });

  it("both portrait is unchanged", () => {
    const result = adjustOrientationWith([600, 900], [400, 800]);

    expect(result).toEqual([400, 800]);
  });

  it("different orientation swaps dimensions", () => {
    // Source is landscape, target is portrait
    const result = adjustOrientationWith([1600, 900], [600, 800]);

    expect(result).toEqual([800, 600]);
  });

  it("source portrait, target landscape swaps dimensions", () => {
    const result = adjustOrientationWith([600, 900], [800, 600]);

    expect(result).toEqual([600, 800]);
  });

  it("square source (equal w/h) is treated as landscape", () => {
    // Square (w >= h) is landscape; landscape target stays the same
    const result = adjustOrientationWith([500, 500], [800, 600]);

    expect(result).toEqual([800, 600]);
  });
});

describe("createCanvas", () => {
  it("returns canvas with correct dimensions", () => {
    const canvas = createCanvas(640, 480);

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
  });

  it("returns canvas for different dimensions", () => {
    const canvas = createCanvas(1920, 1080);

    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
  });
});
