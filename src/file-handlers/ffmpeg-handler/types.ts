import {
  BaseFileHandlerParams,
  FileValidationData,
  ProcessingConfig,
  ValidationConfig,
} from "../base-handler/types";

export type FFMPEGTaskOptions = { [key: string]: unknown };

export interface FFMPEGProcessingTask {
  globalOptions?: FFMPEGTaskOptions;
  inputOptions?: FFMPEGTaskOptions;
  outputOptions?: FFMPEGTaskOptions;
  outputMimeType: string;
  outputName: string;
}

export interface FFMPEGProcessingConfig extends ProcessingConfig {
  ffmpegTask?: FFMPEGProcessingTask;
}

export interface FFMPEGHandlerParams<
  VC extends ValidationConfig,
  PC extends FFMPEGProcessingConfig,
  FVD extends FileValidationData,
  VR extends HTMLVideoElement
> extends BaseFileHandlerParams<VC, PC, FVD, VR> {
  ffmpegBaseURL?: string;
  ffmpegMTBaseURL?: string;
}
