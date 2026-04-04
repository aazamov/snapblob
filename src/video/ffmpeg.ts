import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { VideoTranscodeError } from "./errors";

// ---------------------------------------------------------------------------
// Helpers (shared across video modules)
// ---------------------------------------------------------------------------

/** Generate a short unique ID for temp file naming. */
export function uniqueId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Format a bitrate value for FFmpeg command-line arguments.
 * - Numbers are passed as-is (e.g. 2500000 -> "2500000").
 * - Strings with k/M suffix are passed through (e.g. "2500k").
 * - Strings ending with "bps" are stripped of the suffix.
 */
export function formatBitrateForFFmpeg(value: string | number): string {
  if (typeof value === "number") return `${value}`;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?[kKmM]$/.test(trimmed)) return trimmed;
  if (/bps$/i.test(trimmed)) return trimmed.replace(/bps$/i, "");
  return trimmed;
}

/**
 * Best-effort cleanup of temporary files inside the FFmpeg virtual FS.
 * Failures are silently ignored (the FS is ephemeral anyway).
 */
export async function cleanupFiles(
  ffmpeg: FFmpeg,
  ...files: string[]
): Promise<void> {
  await Promise.allSettled(files.map((f) => ffmpeg.deleteFile(f)));
}

/** Extract file extension from a filename. */
export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop() ?? "";
}

// ---------------------------------------------------------------------------
// FFmpeg singleton management
// ---------------------------------------------------------------------------

const DEFAULT_FFMPEG_BASE_URL =
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
const DEFAULT_FFMPEG_MT_BASE_URL =
  "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;
/** When true the next call to `getFFmpeg` will create a fresh instance. */
export let needsReload = false;

/** Set the needsReload flag (used by abort handlers). */
export function markForReload(): void {
  needsReload = true;
}

/** Captured FFmpeg log lines for error diagnostics. */
export let lastLogLines: string[] = [];
const MAX_LOG_LINES = 30;

export async function getFFmpeg(
  onLog?: (message: string) => void,
  baseUrl?: string,
  mtBaseUrl?: string,
): Promise<FFmpeg> {
  if (needsReload || !ffmpegInstance) {
    // Terminate previous instance if it exists
    if (ffmpegInstance) {
      try {
        ffmpegInstance.terminate();
      } catch {
        // Ignore terminate errors on stale instance
      }
    }
    ffmpegInstance = new FFmpeg();
    ffmpegLoaded = false;
    needsReload = false;
  }

  const ffmpeg = ffmpegInstance;

  if (!ffmpegLoaded) {
    let resolvedBase = baseUrl ?? DEFAULT_FFMPEG_BASE_URL;
    const loadConfig: Record<string, string> = {};

    if (typeof window !== "undefined" && window.crossOriginIsolated) {
      resolvedBase = mtBaseUrl ?? DEFAULT_FFMPEG_MT_BASE_URL;
      loadConfig.workerURL = await toBlobURL(
        `${resolvedBase}/ffmpeg-core.worker.js`,
        "text/javascript",
      );
    }

    // Reset log buffer
    lastLogLines = [];

    ffmpeg.on("log", ({ message }) => {
      // Capture for error diagnostics
      lastLogLines.push(message);
      if (lastLogLines.length > MAX_LOG_LINES) {
        lastLogLines.shift();
      }
      // Forward to user's optional logger
      onLog?.(message);
    });

    try {
      await ffmpeg.load({
        ...loadConfig,
        coreURL: await toBlobURL(
          `${resolvedBase}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${resolvedBase}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });

      ffmpegLoaded = true;
    } catch (err) {
      // Reset so next call creates a fresh instance
      ffmpegInstance = null;
      ffmpegLoaded = false;
      throw new VideoTranscodeError("Failed to load FFmpeg.", { cause: err });
    }
  }

  return ffmpeg;
}

/**
 * Destroys the cached FFmpeg instance and frees WASM memory.
 * Call this when you're done with video processing (e.g. navigating away
 * from a video page in an SPA) to reclaim ~30MB+ of memory.
 */
export function destroyFFmpeg(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // Ignore terminate errors
    }
    ffmpegInstance = null;
    ffmpegLoaded = false;
    needsReload = false;
    lastLogLines = [];
  }
}

/**
 * Preloads FFmpeg WASM so the first `transcodeVideo` call is faster.
 * The ~30MB core is downloaded and cached on first call.
 *
 * @param options - Optional custom URLs for FFmpeg core files
 *
 * @example
 * ```ts
 * // Preload during idle time
 * await preloadFFmpeg();
 * ```
 */
export async function preloadFFmpeg(options?: {
  baseUrl?: string;
  mtBaseUrl?: string;
}): Promise<void> {
  await getFFmpeg(undefined, options?.baseUrl, options?.mtBaseUrl);
}
