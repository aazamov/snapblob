import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { BaseFileHandler } from "../base-handler/handler";
import {
  FileProcessingProgressCallback,
  FileValidationData,
  InputMediaFile,
  ProcessedFile,
  ValidatedDataResult,
  ValidationConfig,
} from "../base-handler/types";
import { FFMPEGHandlerValidationError } from "./errors";
import {
  FFMPEGHandlerParams,
  FFMPEGProcessingConfig,
  FFMPEGProcessingTask,
  FFMPEGTaskOptions,
} from "./types";

// import workerUrl from "@ffmpeg/ffmpeg/dist/esm/worker.js?worker&url";

import { getFileExtension } from "../../utils/files";

/**
 * @deprecated Use `transcodeVideo()` from `snapblob/video` instead. Will be removed in v2.0.
 */
export class FFMPEGHandler<
  VC extends ValidationConfig,
  PC extends FFMPEGProcessingConfig,
  FVD extends FileValidationData,
  VR extends HTMLVideoElement
> extends BaseFileHandler<VC, PC, FVD, VR> {
  public static ffmpegInstance = new FFmpeg();
  public static readonly DEFAULT_FFMPEG_BASE_URL: string =
    "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  public static readonly DEFAULT_FFMPEG_MT_BASE_URL: string =
    "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";

  private static ffmpegInstanceLoaded: boolean = false;

  // Instance URLs (optional overrides)
  protected ffmpegBaseURL?: string;
  protected ffmpegMTBaseURL?: string;

  constructor(params: FFMPEGHandlerParams<VC, PC, FVD, VR>) {
    super(params);
    this.ffmpegBaseURL = params.ffmpegBaseURL;
    this.ffmpegMTBaseURL = params.ffmpegMTBaseURL;
  }

  // abstract methods
  protected async getValidatedResult(
    inputFile: InputMediaFile
  ): Promise<ValidatedDataResult<VR>> {
    try {
      return await this.getLoadedVideo(inputFile);
    } catch (error) {
      throw new FFMPEGHandlerValidationError("Failed to load input stream.");
    }
  }
  protected async handleFileProcessing({
    inputFile,
    validationData,
  }: {
    inputFile: InputMediaFile;
    validatedResult: VR;
    validationData: FVD;
  }): Promise<ProcessedFile | null> {
    let processedMedia = null;
    const config = this.processingConfig;

    if (config) {
      const { ffmpegTask } = config;

      if (ffmpegTask) {
        processedMedia = await this.processMediaWithFFMPEG(
          inputFile,
          ffmpegTask,
          validationData
        );
      }
    }

    return processedMedia;
  }

  // validation methods
  protected async getLoadedVideo(
    inputFile: InputMediaFile
  ): Promise<ValidatedDataResult<VR>> {
    const videoUrl = URL.createObjectURL(inputFile);
    return await new Promise<ValidatedDataResult<VR>>((resolve, reject) => {
      const loadedVideo = document.createElement("video");
      loadedVideo.src = videoUrl;
      loadedVideo.load();

      loadedVideo.onloadeddata = () => {
        resolve({ validatedResult: loadedVideo as VR, fileUrl: videoUrl });
      };

      loadedVideo.onerror = () => {
        reject(new Error("Failed to load media."));
      };
    });
  }

  // processing methods
  protected async processMediaWithFFMPEG(
    inputFile: InputMediaFile,
    ffmpegTask: FFMPEGProcessingTask,
    validationData: FVD
  ): Promise<ProcessedFile> {
    await FFMPEGHandler.loadFFMPEGInstance(
      this.fileProcessingProgressCallback,
      this.ffmpegBaseURL,
      this.ffmpegMTBaseURL
    );

    return await this.transcodeFFMPEGMedia(
      ffmpegTask,
      inputFile,
      validationData
    );
  }

  public static async loadFFMPEGInstance(
    progressCallback?: FileProcessingProgressCallback,
    customBaseURL?: string,
    customMTBaseURL?: string
  ) {
    if (!this.ffmpegInstanceLoaded) {
      const ffmpeg = this.ffmpegInstance;
      // Use provided URLs or fall back to defaults
      let baseURL = customBaseURL || this.DEFAULT_FFMPEG_BASE_URL;
      const ffmpegLoadConfig: Record<string, string> = {};

      if (window.crossOriginIsolated) {
        console.log("multithread is enabled");
        baseURL = customMTBaseURL || this.DEFAULT_FFMPEG_MT_BASE_URL;
        ffmpegLoadConfig.workerURL = await toBlobURL(
          `${baseURL}/ffmpeg-core.worker.js`,
          "text/javascript"
        );
      }
      ffmpeg.on("log", ({ message }) => {
        console.log(message, "ffmpeg log");
      });
      ffmpeg.on("progress", ({ progress, time }) => {
        console.log(
          `${progress * 100} % (transcoded time: ${time / 1000000} s)`
        );
        progressCallback?.(progress * 100);
      });

      console.log(`${baseURL}/ffmpeg-core.wasm`);
      await ffmpeg.load({
        ...ffmpegLoadConfig,
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        // classWorkerURL: new URL(workerUrl, import.meta.url).toString(),
      });
      this.ffmpegInstanceLoaded = true;
    }
  }

  protected async transcodeFFMPEGMedia(
    ffmpegTask: FFMPEGProcessingTask,
    inputFile: InputMediaFile,
    validationData: FVD
  ): Promise<ProcessedFile> {
    const { fileName } = validationData;
    const ffmpeg = FFMPEGHandler.ffmpegInstance;
    const { outputName, outputMimeType } = ffmpegTask;
    const inputFileName = `input.${getFileExtension(fileName || "mp4")}`;
    const execCommands = this.convertFFMPEGTaskToCommand(
      inputFileName,
      ffmpegTask
    );

    console.log(execCommands, "execCommands");

    await ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));
    await ffmpeg.exec(execCommands);
    const data = await ffmpeg.readFile(outputName);

    return new Blob([data as BlobPart], { type: outputMimeType });
  }

  protected convertFFMPEGTaskToCommand(
    inputFileName: string,
    ffmpegTask: FFMPEGProcessingTask
  ): string[] {
    const { inputOptions, outputName, outputOptions } = ffmpegTask;

    const inputCommands = this.convertFFMPEGTaskOptionsToCommand({
      i: inputFileName,
      threads: 5,
      ...(inputOptions || {}),
    });

    const outputCommands = this.convertFFMPEGTaskOptionsToCommand({
      ...(outputOptions || {}),
    });

    return [...inputCommands, ...outputCommands, outputName];
  }

  protected convertFFMPEGTaskOptionsToCommand(
    taskOptions: FFMPEGTaskOptions
  ): string[] {
    const commands = [];

    for (const [key, value] of Object.entries(taskOptions)) {
      commands.push(`-${key.replace(/^-+/g, "").toLowerCase()}`);
      if (value != null) {
        commands.push(value.toString());
      }
    }
    return commands;
  }
}

/**
 * @deprecated Use `transcodeVideo()` from `snapblob/video` instead. Will be removed in v2.0.
 */
export const TypedFFMPEGHandler: typeof FFMPEGHandler<
  ValidationConfig,
  FFMPEGProcessingConfig,
  FileValidationData,
  HTMLVideoElement
> = FFMPEGHandler<
  ValidationConfig,
  FFMPEGProcessingConfig,
  FileValidationData,
  HTMLVideoElement
>;
