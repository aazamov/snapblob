import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageHandlerValidationError } from "../../../src/file-handlers/image-handler/errors";

// Mock pica
const mockResize = vi.fn().mockResolvedValue({});
const mockToBlob = vi
  .fn()
  .mockResolvedValue(new Blob(["test"], { type: "image/webp" }));

vi.mock("pica", () => {
  return {
    default: class MockPica {
      resize = mockResize;
      toBlob = mockToBlob;
    },
  };
});

// Mock axios
vi.mock("axios", () => ({
  default: {
    isAxiosError: vi.fn(() => false),
  },
}));

vi.mock("../../../src/utils/requests", () => ({
  axiosBase: vi.fn(),
}));

import { ImageHandler } from "../../../src/file-handlers/image-handler/handler";
import {
  ImageValidationConfig,
  ImageProcessingConfig,
  ImageValidationData,
} from "../../../src/file-handlers/image-handler/types";

type TestImageHandler = ImageHandler<
  ImageValidationConfig,
  ImageProcessingConfig,
  ImageValidationData,
  HTMLImageElement
>;

function createHandler(
  overrides: Partial<{
    validationConfig: ImageValidationConfig;
    processingConfig: ImageProcessingConfig;
  }> = {}
): TestImageHandler {
  return new ImageHandler({
    baseUrl: "http://localhost:3000",
    uploadPath: "/api/upload",
    ...overrides,
  }) as TestImageHandler;
}

function createMockFile(
  type: string = "image/webp",
  size: number = 1000
): File {
  const content = new Uint8Array(size);
  return new File([content], "test.webp", { type });
}

describe("ImageHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    // Mock document.createElement for "img" and "canvas"
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "img") {
        const img = {
          src: "",
          width: 800,
          height: 600,
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          set _src(val: string) {
            this.src = val;
            // Trigger onload asynchronously
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          },
        };
        // Intercept src setter to trigger onload
        const proxy = new Proxy(img, {
          set(target, prop, value) {
            if (prop === "src") {
              target.src = value;
              setTimeout(() => {
                if (target.onload) target.onload();
              }, 0);
              return true;
            }
            (target as any)[prop] = value;
            return true;
          },
        });
        return proxy as unknown as HTMLElement;
      }
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            drawImage: vi.fn(),
          })),
        } as unknown as HTMLElement;
      }
      return document.createElement(tag);
    });
  });

  it("creates an instance with config", () => {
    const handler = createHandler({
      validationConfig: {
        maxFileSize: 5_000_000,
        validMimeTypes: new Set(["image/webp", "image/png"]),
        minImageSize: [100, 100],
        maxImageSize: [4000, 4000],
      },
    });
    expect(handler).toBeDefined();
    expect(handler.baseUrl).toBe("http://localhost:3000");
    expect(handler.uploadPath).toBe("/api/upload");
    expect(handler.validationConfig?.maxFileSize).toBe(5_000_000);
  });

  it("validates image dimensions within min/max bounds", async () => {
    const handler = createHandler({
      validationConfig: {
        minImageSize: [100, 100],
        maxImageSize: [4000, 4000],
      },
    });

    // Access the protected validateImageSize via any cast
    const validateImageSize = (handler as any).validateImageSize.bind(handler);
    const config = handler.validationConfig!;
    const mockImage = { width: 800, height: 600 } as HTMLImageElement;
    const validationData: ImageValidationData = {};

    await expect(
      validateImageSize(config, mockImage, validationData)
    ).resolves.toBeUndefined();
    expect(validationData.imageSize).toEqual([800, 600]);
  });

  it("rejects image below minimum size", async () => {
    const handler = createHandler({
      validationConfig: {
        minImageSize: [200, 200],
        maxImageSize: [4000, 4000],
      },
    });

    const validateImageSize = (handler as any).validateImageSize.bind(handler);
    const config = handler.validationConfig!;
    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const validationData: ImageValidationData = {};

    await expect(
      validateImageSize(config, mockImage, validationData)
    ).rejects.toThrow(ImageHandlerValidationError);
    await expect(
      validateImageSize(config, mockImage, validationData)
    ).rejects.toThrow("Image size is less than the minimum allowed size");
  });

  it("rejects image above maximum size", async () => {
    const handler = createHandler({
      validationConfig: {
        minImageSize: [100, 100],
        maxImageSize: [2000, 2000],
      },
    });

    const validateImageSize = (handler as any).validateImageSize.bind(handler);
    const config = handler.validationConfig!;
    const mockImage = { width: 3000, height: 3000 } as HTMLImageElement;
    const validationData: ImageValidationData = {};

    await expect(
      validateImageSize(config, mockImage, validationData)
    ).rejects.toThrow(ImageHandlerValidationError);
    await expect(
      validateImageSize(config, mockImage, validationData)
    ).rejects.toThrow("Image size is greater than the maximum allowed size");
  });

  it("validates accepted MIME types", async () => {
    const handler = createHandler({
      validationConfig: {
        validMimeTypes: new Set(["image/webp", "image/png", "image/jpeg"]),
      },
    });

    const validateFileMimeType = (handler as any).validateFileMimeType.bind(
      handler
    );
    const config = handler.validationConfig!;
    const mockFile = createMockFile("image/webp");
    const validationData: ImageValidationData = {};

    await expect(
      validateFileMimeType(config, mockFile, validationData)
    ).resolves.toBeUndefined();
    expect(validationData.mimeType).toBe("image/webp");
  });

  it("rejects invalid MIME types", async () => {
    const handler = createHandler({
      validationConfig: {
        validMimeTypes: new Set(["image/webp", "image/png"]),
      },
    });

    const validateFileMimeType = (handler as any).validateFileMimeType.bind(
      handler
    );
    const config = handler.validationConfig!;
    const mockFile = createMockFile("image/bmp");
    const validationData: ImageValidationData = {};

    await expect(
      validateFileMimeType(config, mockFile, validationData)
    ).rejects.toThrow("Invalid file mime type: image/bmp");
  });

  it("validates file size within limit", async () => {
    const handler = createHandler({
      validationConfig: {
        maxFileSize: 5_000_000,
      },
    });

    const validateFileSize = (handler as any).validateFileSize.bind(handler);
    const config = handler.validationConfig!;
    const mockFile = createMockFile("image/webp", 1000);
    const validationData: ImageValidationData = {};

    await expect(
      validateFileSize(config, mockFile, validationData)
    ).resolves.toBeUndefined();
    expect(validationData.fileSize).toBe(1000);
  });

  it("rejects file exceeding max file size", async () => {
    const handler = createHandler({
      validationConfig: {
        maxFileSize: 500,
      },
    });

    const validateFileSize = (handler as any).validateFileSize.bind(handler);
    const config = handler.validationConfig!;
    const mockFile = createMockFile("image/webp", 1000);
    const validationData: ImageValidationData = {};

    await expect(
      validateFileSize(config, mockFile, validationData)
    ).rejects.toThrow("File size exceeds the maximum allowed size");
  });

  it("constructs the correct upload endpoint URL", () => {
    const handler = createHandler();
    expect(handler.fileUploadEndpoint).toBe("http://localhost:3000/api/upload");
  });
});
