import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VideoTranscodeError,
  VideoValidationError,
  VideoAbortError,
} from "../../src/video/errors";

// --- FFmpeg mock setup ---

const mockLoad = vi.fn().mockResolvedValue(undefined);
const mockExec = vi.fn().mockResolvedValue(0);
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockReadFile = vi
  .fn()
  .mockResolvedValue(new Uint8Array([0, 0, 0, 1]));
const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
const mockTerminate = vi.fn();

type EventHandler = (data: Record<string, unknown>) => void;
const eventHandlers: Record<string, EventHandler[]> = {};

const mockOn = vi.fn((event: string, handler: EventHandler) => {
  if (!eventHandlers[event]) eventHandlers[event] = [];
  eventHandlers[event].push(handler);
});

const mockOff = vi.fn((event: string, handler: EventHandler) => {
  if (eventHandlers[event]) {
    eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
  }
});

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: class MockFFmpeg {
    load = mockLoad;
    exec = mockExec;
    writeFile = mockWriteFile;
    readFile = mockReadFile;
    deleteFile = mockDeleteFile;
    on = mockOn;
    off = mockOff;
    terminate = mockTerminate;
  },
}));

vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  toBlobURL: vi.fn().mockResolvedValue("blob:mock-url"),
}));

import {
  transcodeVideo,
  destroyFFmpeg,
  preloadFFmpeg,
} from "../../src/video/transcode";

describe("transcodeVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroyFFmpeg();
    // Reset event handlers
    for (const key in eventHandlers) {
      delete eventHandlers[key];
    }
  });

  afterEach(() => {
    destroyFFmpeg();
  });

  it("returns a Blob on basic transcode", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    const result = await transcodeVideo(file);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("video/mp4");
  });

  it("throws VideoValidationError on empty file", async () => {
    const emptyFile = new File([], "empty.mp4", { type: "video/mp4" });

    await expect(transcodeVideo(emptyFile)).rejects.toThrow(
      VideoValidationError,
    );
    await expect(transcodeVideo(emptyFile)).rejects.toThrow(
      "Input file is empty",
    );
  });

  it("uses unique filenames (writeFile called with input_*.ext pattern)", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    await transcodeVideo(file);

    expect(mockWriteFile).toHaveBeenCalled();
    const inputFileName = mockWriteFile.mock.calls[0][0] as string;
    expect(inputFileName).toMatch(/^input_[a-z0-9]+\.mp4$/);
  });

  it("applies preset options via presetName", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    await transcodeVideo(file, { presetName: "balanced" });

    expect(mockExec).toHaveBeenCalled();
    const args = mockExec.mock.calls[0][0] as string[];
    // The balanced preset uses "medium" preset and crf 23
    expect(args).toContain("-preset");
    expect(args).toContain("medium");
    expect(args).toContain("-crf");
    expect(args).toContain("23");
  });

  it("passes custom codec/crf/preset options to exec args", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    await transcodeVideo(file, {
      codec: "libx265",
      crf: 20,
      preset: "slow",
    });

    expect(mockExec).toHaveBeenCalled();
    const args = mockExec.mock.calls[0][0] as string[];
    expect(args).toContain("-c:v");
    expect(args).toContain("libx265");
    expect(args).toContain("-crf");
    expect(args).toContain("20");
    expect(args).toContain("-preset");
    expect(args).toContain("slow");
  });

  it("throws VideoAbortError when signal is already aborted", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    const controller = new AbortController();
    controller.abort();

    await expect(
      transcodeVideo(file, { signal: controller.signal }),
    ).rejects.toThrow(VideoAbortError);
  });

  it("calls onProgress callback", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    const onProgress = vi.fn();

    // Simulate progress emission during exec
    mockExec.mockImplementationOnce(async () => {
      // Trigger progress event handlers
      if (eventHandlers["progress"]) {
        for (const handler of eventHandlers["progress"]) {
          handler({ progress: 0.5 });
        }
      }
      return 0;
    });

    await transcodeVideo(file, { onProgress });

    // onProgress should be called at least once (the 100% at end)
    expect(onProgress).toHaveBeenCalled();
    // The final call should be 100
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(lastCall[0]).toBe(100);
  });

  it("calls onLog callback with FFmpeg log messages", async () => {
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    const onLog = vi.fn();

    await transcodeVideo(file, { onLog });

    // The "log" event handler should have been registered
    expect(mockOn).toHaveBeenCalledWith("log", expect.any(Function));
  });
});

describe("destroyFFmpeg", () => {
  it("calls terminate and resets singleton", async () => {
    // First load an instance
    const file = new File(["video-data"], "test.mp4", { type: "video/mp4" });
    await transcodeVideo(file);

    destroyFFmpeg();

    expect(mockTerminate).toHaveBeenCalled();
  });

  it("is idempotent (calling twice does not throw)", () => {
    destroyFFmpeg();
    expect(() => destroyFFmpeg()).not.toThrow();
  });
});

describe("preloadFFmpeg", () => {
  beforeEach(() => {
    destroyFFmpeg();
    vi.clearAllMocks();
  });

  it("loads FFmpeg without transcoding", async () => {
    await preloadFFmpeg();

    expect(mockLoad).toHaveBeenCalled();
    // exec should NOT have been called (no transcoding)
    expect(mockExec).not.toHaveBeenCalled();
  });
});
