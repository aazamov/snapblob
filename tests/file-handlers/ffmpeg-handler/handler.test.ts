import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @ffmpeg/ffmpeg
vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: class MockFFmpeg {
    load = vi.fn().mockResolvedValue(undefined);
    exec = vi.fn().mockResolvedValue(undefined);
    writeFile = vi.fn().mockResolvedValue(undefined);
    readFile = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    on = vi.fn();
  },
}));

// Mock @ffmpeg/util
vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  toBlobURL: vi.fn().mockResolvedValue("blob:mock-url"),
}));

// Mock axios
vi.mock("axios", () => ({
  default: {
    isAxiosError: vi.fn(() => false),
  },
}));

vi.mock("../../../src/utils/requests", () => ({
  axiosBase: vi.fn(),
}));

import { FFMPEGHandler } from "../../../src/file-handlers/ffmpeg-handler/handler";
import {
  FFMPEGProcessingConfig,
  FFMPEGProcessingTask,
} from "../../../src/file-handlers/ffmpeg-handler/types";
import {
  FileValidationData,
  ValidationConfig,
} from "../../../src/file-handlers/base-handler/types";

type TestFFMPEGHandler = FFMPEGHandler<
  ValidationConfig,
  FFMPEGProcessingConfig,
  FileValidationData,
  HTMLVideoElement
>;

function createHandler(
  overrides: Partial<{
    validationConfig: ValidationConfig;
    processingConfig: FFMPEGProcessingConfig;
  }> = {}
): TestFFMPEGHandler {
  return new FFMPEGHandler({
    baseUrl: "http://localhost:3000",
    uploadPath: "/api/upload",
    ...overrides,
  }) as TestFFMPEGHandler;
}

describe("FFMPEGHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("convertFFMPEGTaskToCommand", () => {
    it("produces correct CLI args for a basic task", () => {
      const handler = createHandler();
      const convertFn = (handler as any).convertFFMPEGTaskToCommand.bind(
        handler
      );

      const task: FFMPEGProcessingTask = {
        outputName: "output.mp4",
        outputMimeType: "video/mp4",
      };

      const result = convertFn("input.mp4", task);

      // Should contain -i input.mp4, -threads 5, and output.mp4 as last element
      expect(result).toContain("-i");
      expect(result).toContain("input.mp4");
      expect(result).toContain("-threads");
      expect(result).toContain("5");
      expect(result[result.length - 1]).toBe("output.mp4");
    });

    it("places input options before output options", () => {
      const handler = createHandler();
      const convertFn = (handler as any).convertFFMPEGTaskToCommand.bind(
        handler
      );

      const task: FFMPEGProcessingTask = {
        inputOptions: { ss: "00:00:05" },
        outputOptions: { vcodec: "libx264", acodec: "aac" },
        outputName: "output.mp4",
        outputMimeType: "video/mp4",
      };

      const result = convertFn("input.webm", task);

      const inputIndex = result.indexOf("-i");
      const vcodecIndex = result.indexOf("-vcodec");
      const acodecIndex = result.indexOf("-acodec");

      // Input options (including -i) should come before output options
      expect(inputIndex).toBeLessThan(vcodecIndex);
      expect(inputIndex).toBeLessThan(acodecIndex);
    });

    it("has output name as the last argument", () => {
      const handler = createHandler();
      const convertFn = (handler as any).convertFFMPEGTaskToCommand.bind(
        handler
      );

      const task: FFMPEGProcessingTask = {
        outputOptions: { b: "2M", vcodec: "libx264" },
        outputName: "result.webm",
        outputMimeType: "video/webm",
      };

      const result = convertFn("input.mp4", task);
      expect(result[result.length - 1]).toBe("result.webm");
    });

    it("adds -threads 5 by default", () => {
      const handler = createHandler();
      const convertFn = (handler as any).convertFFMPEGTaskToCommand.bind(
        handler
      );

      const task: FFMPEGProcessingTask = {
        outputName: "output.mp4",
        outputMimeType: "video/mp4",
      };

      const result = convertFn("input.mp4", task);

      const threadsIndex = result.indexOf("-threads");
      expect(threadsIndex).toBeGreaterThanOrEqual(0);
      expect(result[threadsIndex + 1]).toBe("5");
    });

    it("allows overriding threads in inputOptions", () => {
      const handler = createHandler();
      const convertFn = (handler as any).convertFFMPEGTaskToCommand.bind(
        handler
      );

      const task: FFMPEGProcessingTask = {
        inputOptions: { threads: 2 },
        outputName: "output.mp4",
        outputMimeType: "video/mp4",
      };

      const result = convertFn("input.mp4", task);

      // threads from inputOptions overrides the default due to spread order
      const threadsIndex = result.indexOf("-threads");
      expect(threadsIndex).toBeGreaterThanOrEqual(0);
      expect(result[threadsIndex + 1]).toBe("2");
    });

    it("includes all output options as flags", () => {
      const handler = createHandler();
      const convertFn = (handler as any).convertFFMPEGTaskToCommand.bind(
        handler
      );

      const task: FFMPEGProcessingTask = {
        outputOptions: {
          vcodec: "libx264",
          acodec: "aac",
          b: "1M",
          r: 30,
        },
        outputName: "output.mp4",
        outputMimeType: "video/mp4",
      };

      const result = convertFn("input.mp4", task);

      expect(result).toContain("-vcodec");
      expect(result).toContain("libx264");
      expect(result).toContain("-acodec");
      expect(result).toContain("aac");
      expect(result).toContain("-b");
      expect(result).toContain("1M");
      expect(result).toContain("-r");
      expect(result).toContain("30");
    });
  });

  describe("convertFFMPEGTaskOptionsToCommand", () => {
    it("converts key-value pairs to CLI flags", () => {
      const handler = createHandler();
      const convertFn = (
        handler as any
      ).convertFFMPEGTaskOptionsToCommand.bind(handler);

      const result = convertFn({ vcodec: "libx264", b: "2M" });
      expect(result).toEqual(["-vcodec", "libx264", "-b", "2M"]);
    });

    it("strips leading dashes from keys", () => {
      const handler = createHandler();
      const convertFn = (
        handler as any
      ).convertFFMPEGTaskOptionsToCommand.bind(handler);

      const result = convertFn({ "--vcodec": "libx264", "-b": "2M" });
      expect(result).toEqual(["-vcodec", "libx264", "-b", "2M"]);
    });

    it("handles null/undefined values by omitting the value", () => {
      const handler = createHandler();
      const convertFn = (
        handler as any
      ).convertFFMPEGTaskOptionsToCommand.bind(handler);

      const result = convertFn({ an: null, vn: undefined });
      // null/undefined values should result in flag-only entries
      expect(result).toEqual(["-an", "-vn"]);
    });

    it("converts numeric values to strings", () => {
      const handler = createHandler();
      const convertFn = (
        handler as any
      ).convertFFMPEGTaskOptionsToCommand.bind(handler);

      const result = convertFn({ threads: 5, r: 30 });
      expect(result).toEqual(["-threads", "5", "-r", "30"]);
    });
  });

  describe("instance configuration", () => {
    it("creates instance with base URL and upload path", () => {
      const handler = createHandler();
      expect(handler.baseUrl).toBe("http://localhost:3000");
      expect(handler.uploadPath).toBe("/api/upload");
    });

    it("constructs the correct upload endpoint", () => {
      const handler = createHandler();
      expect(handler.fileUploadEndpoint).toBe(
        "http://localhost:3000/api/upload"
      );
    });

    it("has default static FFMPEG base URLs", () => {
      expect(FFMPEGHandler.DEFAULT_FFMPEG_BASE_URL).toBe(
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
      );
      expect(FFMPEGHandler.DEFAULT_FFMPEG_MT_BASE_URL).toBe(
        "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm"
      );
    });
  });
});
