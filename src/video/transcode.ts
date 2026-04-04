import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { TranscodeVideoOptions, VideoInfo } from "./types";
import {
  VideoTranscodeError,
  VideoValidationError,
  VideoAbortError,
} from "./errors";
import { applyPreset } from "./presets";
import {
  getFFmpeg,
  markForReload,
  lastLogLines,
  uniqueId,
  getFileExtension,
  formatBitrateForFFmpeg,
  cleanupFiles,
} from "./ffmpeg";

export { destroyFFmpeg, preloadFFmpeg } from "./ffmpeg";

// ---------------------------------------------------------------------------
// transcodeVideo
// ---------------------------------------------------------------------------

/**
 * Transcode a video file using FFmpeg WASM.
 *
 * Returns a `Blob` containing the transcoded output. The FFmpeg WASM core
 * (~30MB) is downloaded and cached on the first call.
 *
 * @param file - The video file to transcode
 * @param options - Transcoding configuration
 * @returns The transcoded video as a Blob
 * @throws {VideoValidationError} If input file is invalid
 * @throws {VideoTranscodeError} If FFmpeg fails to load or transcode
 * @throws {VideoAbortError} If the operation is cancelled via AbortSignal
 *
 * @example
 * ```ts
 * import { transcodeVideo, applyPreset } from "snapblob/video";
 *
 * const blob = await transcodeVideo(file, {
 *   ...applyPreset("balanced"),
 *   outputFormat: "mp4",
 *   onProgress: (p) => console.log(`${p}%`),
 *   signal: abortController.signal,
 * });
 * ```
 */
export async function transcodeVideo(
  file: File | Blob,
  options: TranscodeVideoOptions = {},
): Promise<Blob> {
  // --- Input validation ---
  if (file.size === 0) {
    throw new VideoValidationError("Input file is empty (0 bytes).");
  }

  // --- Merge preset defaults with explicit options ---
  const merged: TranscodeVideoOptions = options.presetName
    ? { ...applyPreset(options.presetName), ...stripUndefined(options) }
    : { ...options };

  const {
    codec = "libx264",
    preset,
    crf,
    maxBitrate,
    audioBitrate,
    audioCodec,
    pixelFormat = "yuv420p",
    outputFormat,
    threads = 0,
    signal,
    onProgress,
    onLog,
    ffmpegBaseUrl,
    ffmpegMTBaseUrl,
  } = merged;

  // --- Determine file names (unique per call to prevent concurrent corruption) ---
  const callId = uniqueId();
  const inputName = file instanceof File ? file.name : "input.mp4";
  const inputExt = getFileExtension(inputName) || "mp4";
  const outExt = outputFormat ?? inputExt;
  const inputFileName = `input_${callId}.${inputExt}`;
  const outputFileName = `output_${callId}.${outExt}`;

  // --- Check abort before heavy work ---
  if (signal?.aborted) {
    throw new VideoAbortError("Transcode aborted before start.");
  }

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await getFFmpeg(onLog, ffmpegBaseUrl, ffmpegMTBaseUrl);
  } catch (err) {
    if (err instanceof VideoTranscodeError) throw err;
    throw new VideoTranscodeError("Failed to load FFmpeg.", { cause: err });
  }

  // --- Wire up progress (per-call, so we forward to the right callback) ---
  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(progress * 100);
  };
  ffmpeg.on("progress", progressHandler);

  // --- Build command args ---
  const args: string[] = ["-y"]; // overwrite output without prompting

  // Input
  args.push("-i", inputFileName);

  // Threads
  args.push("-threads", `${threads}`);

  // Video codec
  args.push("-c:v", codec);

  // Encoder preset
  if (preset) {
    args.push("-preset", preset);
  }

  // CRF
  if (crf != null) {
    args.push("-crf", `${crf}`);
  }

  // Max bitrate
  if (maxBitrate != null) {
    const br = formatBitrateForFFmpeg(maxBitrate);
    args.push("-maxrate", br, "-bufsize", br);
  }

  // Audio codec
  if (audioCodec) {
    args.push("-c:a", audioCodec);
  }

  // Audio bitrate
  if (audioBitrate != null) {
    args.push("-b:a", formatBitrateForFFmpeg(audioBitrate));
  }

  // Pixel format
  if (pixelFormat) {
    args.push("-pix_fmt", pixelFormat);
  }

  // Output file
  args.push(outputFileName);

  // --- Run FFmpeg ---
  try {
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Wire up abort — terminate FFmpeg and mark for reload
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
        throw new VideoAbortError("Transcode aborted.");
      }

      await ffmpeg.exec(args);

      if (signal?.aborted) {
        throw new VideoAbortError("Transcode aborted during execution.");
      }
    } finally {
      signal?.removeEventListener("abort", abortHandler);
    }

    const data = await ffmpeg.readFile(outputFileName);
    const mimeType = outExt === "webm" ? "video/webm" : "video/mp4";

    // Ensure progress reaches 100%
    onProgress?.(100);

    return new Blob([data as BlobPart], { type: mimeType });
  } catch (err) {
    if (err instanceof VideoAbortError) throw err;
    if (signal?.aborted)
      throw new VideoAbortError("Transcode aborted.", { cause: err });

    // Include FFmpeg log context in the error message
    const logContext =
      lastLogLines.length > 0
        ? `\nFFmpeg logs:\n${lastLogLines.slice(-5).join("\n")}`
        : "";
    throw new VideoTranscodeError(`Transcoding failed.${logContext}`, {
      cause: err,
    });
  } finally {
    ffmpeg.off("progress", progressHandler);
    await cleanupFiles(ffmpeg, inputFileName, outputFileName);
  }
}

// ---------------------------------------------------------------------------
// getVideoInfo
// ---------------------------------------------------------------------------

/** Default timeout for loading video metadata (ms). */
const VIDEO_INFO_TIMEOUT = 30_000;

/**
 * Returns basic video metadata by loading the file into an HTML `<video>` element.
 * Does **not** perform any transcoding.
 *
 * @param file - The video file to inspect
 * @returns Video metadata (duration, dimensions, file size, MIME type)
 * @throws {VideoValidationError} If the file is empty or cannot be loaded
 *
 * @example
 * ```ts
 * const info = await getVideoInfo(file);
 * console.log(info.duration, info.width, info.height);
 * ```
 */
export async function getVideoInfo(file: File | Blob): Promise<VideoInfo> {
  if (file.size === 0) {
    throw new VideoValidationError("Input file is empty (0 bytes).");
  }

  const url = URL.createObjectURL(file);

  try {
    return await new Promise<VideoInfo>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;

      const timer = setTimeout(() => {
        reject(
          new VideoValidationError(
            `Video metadata loading timed out after ${VIDEO_INFO_TIMEOUT / 1000}s.`,
          ),
        );
      }, VIDEO_INFO_TIMEOUT);

      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fileSize: file.size,
          mimeType: file.type || "video/mp4",
        });
      };

      video.onerror = () => {
        clearTimeout(timer);
        reject(
          new VideoValidationError(
            "Failed to load video metadata. The file may be corrupted or in an unsupported format.",
          ),
        );
      };
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/** Remove keys whose value is `undefined` so they don't override preset defaults. */
function stripUndefined(
  obj: TranscodeVideoOptions,
): Partial<TranscodeVideoOptions> {
  const result: Partial<TranscodeVideoOptions> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
