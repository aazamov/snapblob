import { describe, it, expect } from "vitest";
import { adjustOrientationWith } from "../../src/utils/media";

describe("adjustOrientationWith", () => {
  it("does not swap when both source and target are landscape", () => {
    const result = adjustOrientationWith([1920, 1080], [1280, 720]);
    expect(result).toEqual([1280, 720]);
  });

  it("does not swap when both source and target are portrait", () => {
    const result = adjustOrientationWith([1080, 1920], [720, 1280]);
    expect(result).toEqual([720, 1280]);
  });

  it("swaps target when source is landscape and target is portrait", () => {
    const result = adjustOrientationWith([1920, 1080], [720, 1280]);
    expect(result).toEqual([1280, 720]);
  });

  it("swaps target when source is portrait and target is landscape", () => {
    const result = adjustOrientationWith([1080, 1920], [1280, 720]);
    expect(result).toEqual([720, 1280]);
  });

  it("does not swap when source is square (landscape target)", () => {
    // source[0] >= source[1] is true (1000 >= 1000)
    // target[0] >= target[1] should also be true for no swap
    const result = adjustOrientationWith([1000, 1000], [1280, 720]);
    expect(result).toEqual([1280, 720]);
  });

  it("swaps when source is square and target is portrait", () => {
    // source[0] >= source[1] is true (1000 >= 1000)
    // target[0] >= target[1] is false (720 >= 1280 is false)
    // true != false => swap
    const result = adjustOrientationWith([1000, 1000], [720, 1280]);
    expect(result).toEqual([1280, 720]);
  });

  it("does not swap when source has equal dimensions", () => {
    const result = adjustOrientationWith([500, 500], [800, 800]);
    expect(result).toEqual([800, 800]);
  });
});
