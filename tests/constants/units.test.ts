import { describe, it, expect } from "vitest";
import { DataSize, BitrateUnit, StreamDuration } from "../../src/constants/units";

describe("DataSize", () => {
  it("has B equal to 1", () => {
    expect(DataSize.B).toBe(1);
  });

  it("has KB equal to 1000", () => {
    expect(DataSize.KB).toBe(1000);
  });

  it("has MB equal to 1_000_000", () => {
    expect(DataSize.MB).toBe(1_000_000);
  });

  it("has GB equal to 1_000_000_000", () => {
    expect(DataSize.GB).toBe(1_000_000_000);
  });

  it("has TB equal to 1_000_000_000_000", () => {
    expect(DataSize.TB).toBe(1_000_000_000_000);
  });

  it("has KiB equal to 1024", () => {
    expect(DataSize.KiB).toBe(1024);
  });

  it("has MiB equal to 1_048_576", () => {
    expect(DataSize.MiB).toBe(1_048_576);
  });

  it("has GiB equal to 1_073_741_824", () => {
    expect(DataSize.GiB).toBe(1_073_741_824);
  });

  it("has TiB equal to 1_099_511_627_776", () => {
    expect(DataSize.TiB).toBe(1_099_511_627_776);
  });

  it("supports arithmetic for max file size calculation (20 * MB)", () => {
    const maxFileSize = 20 * DataSize.MB;
    expect(maxFileSize).toBe(20_000_000);
  });

  it("supports arithmetic for KiB-based calculations", () => {
    const size = 5 * DataSize.MiB;
    expect(size).toBe(5_242_880);
  });
});

describe("BitrateUnit", () => {
  it("has BPS equal to 1", () => {
    expect(BitrateUnit.BPS).toBe(1);
  });

  it("has KBS equal to 1000", () => {
    expect(BitrateUnit.KBS).toBe(1000);
  });

  it("has MBS equal to 1_000_000", () => {
    expect(BitrateUnit.MBS).toBe(1_000_000);
  });

  it("has GBS equal to 1_000_000_000", () => {
    expect(BitrateUnit.GBS).toBe(1_000_000_000);
  });

  it("supports arithmetic for bitrate calculation", () => {
    const bitrate = 2.5 * BitrateUnit.MBS;
    expect(bitrate).toBe(2_500_000);
  });
});

describe("StreamDuration", () => {
  it("has SECOND equal to 1", () => {
    expect(StreamDuration.SECOND).toBe(1);
  });

  it("has MINUTE equal to 60", () => {
    expect(StreamDuration.MINUTE).toBe(60);
  });

  it("has HOUR equal to 3600", () => {
    expect(StreamDuration.HOUR).toBe(3600);
  });

  it("supports arithmetic for duration calculations", () => {
    const duration = 1.5 * StreamDuration.HOUR;
    expect(duration).toBe(5400);
  });
});
