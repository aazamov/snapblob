import { describe, it, expect } from "vitest";
import { isMediaUploadErrorData } from "../../src/utils/general";

describe("isMediaUploadErrorData", () => {
  it("returns true for valid object with detail property", () => {
    expect(isMediaUploadErrorData({ detail: "Some error" })).toBe(true);
  });

  it("returns true for object with detail and extra properties", () => {
    expect(
      isMediaUploadErrorData({ detail: "Error", code: 400, extra: "info" })
    ).toBe(true);
  });

  it("returns false for object without detail property", () => {
    expect(isMediaUploadErrorData({ message: "Some error" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isMediaUploadErrorData(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isMediaUploadErrorData(undefined)).toBe(false);
  });

  it("returns false for string", () => {
    expect(isMediaUploadErrorData("error string")).toBe(false);
  });

  it("returns false for number", () => {
    expect(isMediaUploadErrorData(42)).toBe(false);
  });

  it("returns false for array", () => {
    expect(isMediaUploadErrorData([1, 2, 3])).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isMediaUploadErrorData({})).toBe(false);
  });

  it("returns false for boolean", () => {
    expect(isMediaUploadErrorData(true)).toBe(false);
  });
});
