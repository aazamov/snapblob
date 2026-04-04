import { fetchFile } from "@ffmpeg/util";
import {
  VideoTranscodeError,
  VideoValidationError,
  VideoAbortError,
} from "./errors";
import {
  getFFmpeg,
  markForReload,
  lastLogLines,
  uniqueId,
  cleanupFiles,
} from "./ffmpeg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported thumbnail output formats. */
export type ThumbnailFormat = "jpeg" | "png" | "webp";

/** Configuration options for {@link getVideoThumbnail}. */
export interface VideoThumbnailOptions {
  /** Time in seconds to seek to before capturing the frame. Defaults to 0. */
  time?: number;
  /** Optional output width in pixels. Height is computed to preserve aspect ratio. */
  width?: number;
  /** Output image format. Defaults to "jpeg". */
  format?: ThumbnailFormat;
  /**
   * JPEG quality (1-31, lower is better quality).
   * Only applies when format is "jpeg". Defaults to 5.
   */
  quality?: number;
  /** AbortSignal to cancel the operation. */
  signal?: AbortSignal;
  /** Optional logger for FFmpeg messages. */
  onLog?: (message: string) => void;
  /** Custom FFmpeg base URL for core files. */
  ffmpegBaseUrl?: string;
  /** Custom FFmpeg multi-thread base URL. */
  ffmpegMTBaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Format mappings
// ---------------------------------------------------------------------------

const FORMAT_TO_EXTENSION: Record<ThumbnailFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const FORMAT_TO_MIME: Record<ThumbnailFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// ---------------------------------------------------------------------------
// getVideoThumbnail
// ---------------------------------------------------------------------------

/**
 * Extracts a single frame from a video as an image thumbnail using FFmpeg WASM.
 *
 * Seeks to the specified time, captures one frame, and optionally scales it
 * to the given width (preserving aspect ratio). The FFmpeg WASM core (~30MB)
 * is downloaded and cached on the first call.
 *
 * @param file - The video file to extract a thumbnail from
 * @param options - Thumbnail extraction configuration
 * @returns The thumbnail image as a Blob
 * @throws {VideoValidationError} If the input file is invalid
 * @throws {VideoTranscodeError} If FFmpeg fails to load or extract the thumbnail
 * @throws {VideoAbortError} If the operation is cancelled via AbortSignal
 *
 * @example
 * ```ts
 * import { getVideoThumbnail } from "snapblob";
 *
 * const thumbnail = await getVideoThumbnail(videoFile, {
 *   time: 5,
 *   width: 320,
 *   format: "jpeg",
 *   quality: 3,
 * });
 *
 * const url = URL.createObjectURL(thumbnail);
 * ```
 */
export async function getVideoThumbnail(
  file: File | Blob,
  options: VideoThumbnailOptions = {},
): Promise<Blob> {
  if (file.size === 0) {
    throw new VideoValidationError("Input file is empty (0 bytes).");
  }

  const {
    time = 0,
    width,
    format = "jpeg",
    quality = 5,
    signal,
    onLog,
    ffmpegBaseUrl,
    ffmpegMTBaseUrl,
  } = options;

  const extension = FORMAT_TO_EXTENSION[format];
  const mimeType = FORMAT_TO_MIME[format];

  const callId = uniqueId();
  const inputFileName = `thumb_input_${callId}.mp4`;
  const outputFileName = `thumb_output_${callId}.${extension}`;

  if (signal?.aborted) {
    throw new VideoAbortError("Thumbnail extraction aborted before start.");
  }

  let ffmpeg;
  try {
    ffmpeg = await getFFmpeg(onLog, ffmpegBaseUrl, ffmpegMTBaseUrl);
  } catch (err) {
    if (err instanceof VideoTranscodeError) throw err;
    throw new VideoTranscodeError("Failed to load FFmpeg.", { cause: err });
  }

  // Build FFmpeg args: -i input -ss <time> -frames:v 1 [-vf scale=w:-1] [-q:v quality] output
  const args: string[] = ["-y"];

  // Seek before input for faster seeking
  args.push("-ss", `${time}`);
  args.push("-i", inputFileName);
  args.push("-frames:v", "1");

  // Build video filters
  const filters: string[] = [];
  if (width) {
    filters.push(`scale=${width}:-1`);
  }

  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }

  // JPEG quality (qscale)
  if (format === "jpeg") {
    args.push("-q:v", `${quality}`);
  }

  args.push(outputFileName);

  try {
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    const abortHandler = () => {
      markForReload();
      try {
        ffmpeg.terminate();
      } catch {
        // Ignore terminate errors during abort
      }
    };
    signal?.addEventListener("abort", abortHandler, { once: true });

    try {
      if (signal?.aborted) {
        throw new VideoAbortError("Thumbnail extraction aborted.");
      }

      await ffmpeg.exec(args);

      if (signal?.aborted) {
        throw new VideoAbortError(
          "Thumbnail extraction aborted during execution.",
        );
      }
    } finally {
      signal?.removeEventListener("abort", abortHandler);
    }

    const data = await ffmpeg.readFile(outputFileName);

    return new Blob([data as BlobPart], { type: mimeType });
  } catch (err) {
    if (err instanceof VideoAbortError) throw err;
    if (signal?.aborted) {
      throw new VideoAbortError("Thumbnail extraction aborted.", {
        cause: err,
      });
    }

    const logContext =
      lastLogLines.length > 0
        ? `\nFFmpeg logs:\n${lastLogLines.slice(-5).join("\n")}`
        : "";
    throw new VideoTranscodeError(
      `Thumbnail extraction failed.${logContext}`,
      { cause: err },
    );
  } finally {
    await cleanupFiles(ffmpeg, inputFileName, outputFileName);
  }
}
