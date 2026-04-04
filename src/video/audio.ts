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
  formatBitrateForFFmpeg,
} from "./ffmpeg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported audio output formats for extraction. */
export type AudioFormat = "mp3" | "aac" | "opus" | "wav";

/** Configuration options for {@link extractAudio}. */
export interface ExtractAudioOptions {
  /** Output audio format. Defaults to "mp3". */
  format?: AudioFormat;
  /** Audio bitrate (e.g. "128k", "192k"). Defaults to "128k". */
  bitrate?: string;
  /** AbortSignal to cancel the operation. */
  signal?: AbortSignal;
  /** Progress callback, called with percentage 0-100. */
  onProgress?: (progress: number) => void;
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

/** Maps audio format to the FFmpeg codec name. */
const FORMAT_TO_CODEC: Record<AudioFormat, string> = {
  mp3: "libmp3lame",
  aac: "aac",
  opus: "libopus",
  wav: "pcm_s16le",
};

/** Maps audio format to the output file extension. */
const FORMAT_TO_EXTENSION: Record<AudioFormat, string> = {
  mp3: "mp3",
  aac: "m4a",
  opus: "ogg",
  wav: "wav",
};

/** Maps audio format to the MIME type for the output Blob. */
const FORMAT_TO_MIME: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  aac: "audio/mp4",
  opus: "audio/ogg",
  wav: "audio/wav",
};

// ---------------------------------------------------------------------------
// extractAudio
// ---------------------------------------------------------------------------

/**
 * Extracts the audio track from a video file using FFmpeg WASM.
 *
 * Returns a `Blob` containing the extracted audio. The video track is
 * discarded entirely (`-vn`). The FFmpeg WASM core (~30MB) is downloaded
 * and cached on the first call.
 *
 * @param file - The video file to extract audio from
 * @param options - Extraction configuration
 * @returns The extracted audio as a Blob
 * @throws {VideoValidationError} If the input file is invalid
 * @throws {VideoTranscodeError} If FFmpeg fails to load or extract audio
 * @throws {VideoAbortError} If the operation is cancelled via AbortSignal
 *
 * @example
 * ```ts
 * import { extractAudio } from "snapblob";
 *
 * const audioBlob = await extractAudio(videoFile, {
 *   format: "mp3",
 *   bitrate: "192k",
 *   onProgress: (p) => console.log(`${p}%`),
 * });
 * ```
 */
export async function extractAudio(
  file: File | Blob,
  options: ExtractAudioOptions = {},
): Promise<Blob> {
  if (file.size === 0) {
    throw new VideoValidationError("Input file is empty (0 bytes).");
  }

  const {
    format = "mp3",
    bitrate = "128k",
    signal,
    onProgress,
    onLog,
    ffmpegBaseUrl,
    ffmpegMTBaseUrl,
  } = options;

  const codec = FORMAT_TO_CODEC[format];
  const extension = FORMAT_TO_EXTENSION[format];
  const mimeType = FORMAT_TO_MIME[format];

  const callId = uniqueId();
  const inputFileName = `audio_input_${callId}.mp4`;
  const outputFileName = `audio_output_${callId}.${extension}`;

  if (signal?.aborted) {
    throw new VideoAbortError("Audio extraction aborted before start.");
  }

  let ffmpeg;
  try {
    ffmpeg = await getFFmpeg(onLog, ffmpegBaseUrl, ffmpegMTBaseUrl);
  } catch (err) {
    if (err instanceof VideoTranscodeError) throw err;
    throw new VideoTranscodeError("Failed to load FFmpeg.", { cause: err });
  }

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(progress * 100);
  };
  ffmpeg.on("progress", progressHandler);

  // Build FFmpeg args: -i input -vn -c:a <codec> -b:a <bitrate> output
  const args: string[] = [
    "-y",
    "-i", inputFileName,
    "-vn",
    "-c:a", codec,
  ];

  // WAV (PCM) doesn't use bitrate
  if (format !== "wav") {
    args.push("-b:a", formatBitrateForFFmpeg(bitrate));
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
        throw new VideoAbortError("Audio extraction aborted.");
      }

      await ffmpeg.exec(args);

      if (signal?.aborted) {
        throw new VideoAbortError("Audio extraction aborted during execution.");
      }
    } finally {
      signal?.removeEventListener("abort", abortHandler);
    }

    const data = await ffmpeg.readFile(outputFileName);

    onProgress?.(100);

    return new Blob([data as BlobPart], { type: mimeType });
  } catch (err) {
    if (err instanceof VideoAbortError) throw err;
    if (signal?.aborted) {
      throw new VideoAbortError("Audio extraction aborted.", { cause: err });
    }

    const logContext =
      lastLogLines.length > 0
        ? `\nFFmpeg logs:\n${lastLogLines.slice(-5).join("\n")}`
        : "";
    throw new VideoTranscodeError(`Audio extraction failed.${logContext}`, {
      cause: err,
    });
  } finally {
    ffmpeg.off("progress", progressHandler);
    await cleanupFiles(ffmpeg, inputFileName, outputFileName);
  }
}
