import { describe, it, expect } from "vitest";
import { convertToAspectRatio } from "../../src/utils/images";

describe("convertToAspectRatio", () => {
  it("returns original dimensions when aspect ratio already matches", () => {
    const result = convertToAspectRatio(1920, 1080, 1920 / 1080);
    expect(result).toEqual({ width: 1920, height: 1080 });
  });

  it("fits width and calculates height for landscape image", () => {
    // 1920x1080 (16:9) -> target 4:3
    const result = convertToAspectRatio(1920, 1080, 4 / 3);
    // heightFromWidth = floor(1920 / (4/3)) = floor(1440) = 1440
    // 1440 > 1080, so use widthFromHeight = floor(1080 * (4/3)) = 1440
    expect(result).toEqual({ width: 1440, height: 1080 });
  });

  it("fits height and calculates width for portrait image", () => {
    // 1080x1920 -> target 16:9
    const result = convertToAspectRatio(1080, 1920, 16 / 9);
    // heightFromWidth = floor(1080 / (16/9)) = floor(607.5) = 607
    // 607 <= 1920, so use width=1080, height=607
    expect(result).toEqual({ width: 1080, height: 607 });
  });

  it("converts square image to landscape ratio", () => {
    // 1000x1000 -> target 16:9
    const result = convertToAspectRatio(1000, 1000, 16 / 9);
    // heightFromWidth = floor(1000 / (16/9)) = floor(562.5) = 562
    // 562 <= 1000, so use width=1000, height=562
    expect(result).toEqual({ width: 1000, height: 562 });
  });

  it("converts square image to portrait ratio", () => {
    // 1000x1000 -> target 9:16
    const result = convertToAspectRatio(1000, 1000, 9 / 16);
    // heightFromWidth = floor(1000 / (9/16)) = floor(1777.7) = 1777
    // 1777 > 1000, so use widthFromHeight = floor(1000 * (9/16)) = 562
    expect(result).toEqual({ width: 562, height: 1000 });
  });

  it("handles very wide panorama aspect ratio", () => {
    // 4000x2000 -> target 21:9
    const result = convertToAspectRatio(4000, 2000, 21 / 9);
    // heightFromWidth = floor(4000 / (21/9)) = floor(1714.28) = 1714
    // 1714 <= 2000, so use width=4000, height=1714
    expect(result).toEqual({ width: 4000, height: 1714 });
  });

  it("handles very tall aspect ratio", () => {
    // 2000x4000 -> target 1:3
    const result = convertToAspectRatio(2000, 4000, 1 / 3);
    // heightFromWidth = floor(2000 / (1/3)) = floor(6000) = 6000
    // 6000 > 4000, so use widthFromHeight = floor(4000 * (1/3)) = 1333
    expect(result).toEqual({ width: 1333, height: 4000 });
  });

  it("handles edge case where width is 1", () => {
    const result = convertToAspectRatio(1, 100, 16 / 9);
    // heightFromWidth = floor(1 / (16/9)) = floor(0.5625) = 0
    // 0 <= 100, so width=1, height=0
    expect(result).toEqual({ width: 1, height: 0 });
  });

  it("handles edge case where height is 1", () => {
    const result = convertToAspectRatio(100, 1, 16 / 9);
    // heightFromWidth = floor(100 / (16/9)) = floor(56.25) = 56
    // 56 > 1, so widthFromHeight = floor(1 * (16/9)) = 1
    expect(result).toEqual({ width: 1, height: 1 });
  });

  it("handles large dimensions (8000x6000)", () => {
    // 8000x6000 -> target 16:9
    const result = convertToAspectRatio(8000, 6000, 16 / 9);
    // heightFromWidth = floor(8000 / (16/9)) = floor(4500) = 4500
    // 4500 <= 6000, so width=8000, height=4500
    expect(result).toEqual({ width: 8000, height: 4500 });
  });
});
