import { describe, it, expect } from "vitest";
import {
  VIDEO_PRESETS,
  applyPreset,
  type VideoPresetName,
} from "../../src/video/presets";

describe("VIDEO_PRESETS", () => {
  const presetNames: VideoPresetName[] = [
    "high-quality",
    "balanced",
    "small-file",
    "social-media",
    "instagram-feed",
    "instagram-story",
    "tiktok",
    "youtube-1080p",
    "youtube-4k",
    "twitter",
  ];

  it("all 10 presets exist", () => {
    for (const name of presetNames) {
      expect(VIDEO_PRESETS[name]).toBeDefined();
    }
    expect(Object.keys(VIDEO_PRESETS)).toHaveLength(10);
  });

  it.each(presetNames)(
    "preset '%s' has all required fields",
    (name) => {
      const preset = VIDEO_PRESETS[name];

      expect(preset.codec).toBeTypeOf("string");
      expect(preset.preset).toBeTypeOf("string");
      expect(preset.crf).toBeTypeOf("number");
      expect(preset.maxBitrate).toBeTypeOf("string");
      expect(preset.audioBitrate).toBeTypeOf("string");
      expect(preset.pixelFormat).toBeTypeOf("string");
    },
  );

  it("high-quality has lowest CRF", () => {
    const crfs = presetNames.map((n) => VIDEO_PRESETS[n].crf);
    const minCrf = Math.min(...crfs);

    expect(VIDEO_PRESETS["high-quality"].crf).toBe(minCrf);
  });

  it("small-file has highest CRF", () => {
    const crfs = presetNames.map((n) => VIDEO_PRESETS[n].crf);
    const maxCrf = Math.max(...crfs);

    expect(VIDEO_PRESETS["small-file"].crf).toBe(maxCrf);
  });
});

describe("applyPreset", () => {
  it("returns partial TranscodeVideoOptions", () => {
    const result = applyPreset("balanced");

    expect(result).toHaveProperty("codec");
    expect(result).toHaveProperty("preset");
    expect(result).toHaveProperty("crf");
    expect(result).toHaveProperty("maxBitrate");
    expect(result).toHaveProperty("audioBitrate");
    expect(result).toHaveProperty("pixelFormat");
  });

  it("output can be spread with overrides", () => {
    const base = applyPreset("balanced");
    const overridden = { ...base, crf: 30, codec: "libx265" };

    expect(overridden.crf).toBe(30);
    expect(overridden.codec).toBe("libx265");
    // Other fields from preset remain
    expect(overridden.preset).toBe("medium");
  });

  it("high-quality preset returns correct values", () => {
    const result = applyPreset("high-quality");

    expect(result.codec).toBe("libx264");
    expect(result.preset).toBe("slow");
    expect(result.crf).toBe(18);
  });

  it("small-file preset returns correct values", () => {
    const result = applyPreset("small-file");

    expect(result.codec).toBe("libx264");
    expect(result.preset).toBe("fast");
    expect(result.crf).toBe(28);
  });
});
