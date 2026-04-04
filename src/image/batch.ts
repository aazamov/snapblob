import { compressImage } from "./compress";
import type { CompressImageOptions } from "./types";
import { ImageProcessingError } from "./errors";

/**
 * Options for batch image compression.
 * Extends {@link CompressImageOptions} with batch-specific settings.
 */
export interface BatchCompressOptions extends CompressImageOptions {
  /**
   * Number of images to process concurrently.
   * Higher values use more memory but finish faster.
   * Defaults to 3.
   */
  concurrency?: number;

  /**
   * Called after each file completes with the file index, total count,
   * and overall progress percentage (0-100).
   */
  onFileProgress?: (index: number, total: number, progress: number) => void;
}

/**
 * Compresses multiple images concurrently using {@link compressImage}.
 *
 * Files are processed in batches controlled by the `concurrency` option.
 * The per-image `onProgress` callback from {@link CompressImageOptions} is
 * ignored in batch mode; use `onFileProgress` instead to track overall progress.
 *
 * @param files - Array of image files to compress
 * @param options - Batch compression configuration
 * @returns Array of compressed Blobs in the same order as the input files
 * @throws {ImageProcessingError} If any file fails to compress
 *
 * @example
 * ```ts
 * import { compressImages } from "snapblob";
 *
 * const blobs = await compressImages(files, {
 *   maxWidth: 1280,
 *   quality: 0.8,
 *   concurrency: 4,
 *   onFileProgress: (i, total, pct) => {
 *     console.log(`File ${i + 1}/${total}: ${pct.toFixed(0)}%`);
 *   },
 * });
 * ```
 */
export async function compressImages(
  files: (File | Blob)[],
  options: BatchCompressOptions = {},
): Promise<Blob[]> {
  if (files.length === 0) {
    return [];
  }

  const { concurrency = 3, onFileProgress, ...compressOptions } = options;

  if (concurrency < 1 || !Number.isFinite(concurrency)) {
    throw new ImageProcessingError(
      `Invalid concurrency: ${concurrency}. Must be a positive integer.`,
    );
  }

  const total = files.length;
  const results: Blob[] = new Array<Blob>(total);
  let nextIndex = 0;
  let completedCount = 0;

  /**
   * Processes one file at a time from the shared queue.
   * Each worker picks the next available index and compresses it.
   */
  async function worker(): Promise<void> {
    while (nextIndex < total) {
      const index = nextIndex;
      nextIndex += 1;

      const fileOptions: CompressImageOptions = {
        ...compressOptions,
        // Suppress per-image onProgress to avoid confusion in batch mode
        onProgress: undefined,
      };

      results[index] = await compressImage(files[index], fileOptions);

      completedCount += 1;
      const overallProgress = (completedCount / total) * 100;
      onFileProgress?.(index, total, overallProgress);
    }
  }

  // Spawn workers up to concurrency limit (but not more than total files)
  const workerCount = Math.min(concurrency, total);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return results;
}
