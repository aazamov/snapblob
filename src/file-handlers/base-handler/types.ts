import { AxiosProgressEvent } from "axios";
import { MediaUploadStatus } from "./constants";

export type InputMediaFile = File | Blob;
export type ProcessedFile = File | Blob;

export interface ProcessingConfig {} // todo: generic

// validation types //
export interface ValidationConfig {
  // todo: generic
  maxFileSize?: number;
  validMimeTypes?: Set<string>;
}
export interface FileValidationData {
  // todo: generic
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
}

export interface ValidatedDataResult<VR> {
  validatedResult: VR;
  fileUrl: string;
}

// uploading types //
export interface ServerSideProcessStage {
  stage: string;
  label: string;
  pct: string;
}

export interface ServerSideProcessProgress {
  current_stage: string;
  stages: ServerSideProcessStage[];
}

export interface MediaUploadResponse {
  uploaded_dirname: string;
  status: MediaUploadStatus;
  progress?: ServerSideProcessProgress;
}

export interface ServerSideProcessReport {
  status: MediaUploadStatus;
  progress?: ServerSideProcessProgress;
}

export interface MediaUploadErrorData {
  detail: string;
}

export type FileValidatedCallback<
  FVD extends FileValidationData,
  VR
> = (params: {
  validatedResult: VR;
  fileUrl: string;
  validationData: FVD;
}) => void;
export type FileProcessingProgressCallback = (pct: number) => void;
export type FileProcessedCallback = (
  file: ProcessedFile,
  fileUrl: string
) => void;
export type FileUploadProgressCallback = (file: AxiosProgressEvent) => void;
export type FileUploadedCallback = (responseData: MediaUploadResponse) => void;
export type FileUploadProcessCallback = (
  responseData: ServerSideProcessReport
) => void;
export type FileUploadFinishedCallback = (uploadDirname: string) => void;

// error callbacks //
export type FileHandlerErrorCallback = (error: Error) => void;
export type FileHandlerValidationErrorCallback = () => void;
export type FileHandlerProcessingErrorCallback = () => void;
export type FileHandlerUploadErrorCallback = () => void;
export type FileHandlerUploadSSErrorCallback = () => void;

export interface BaseFileHandlerParams<
  VC extends ValidationConfig,
  PC extends ProcessingConfig,
  FVD extends FileValidationData,
  VR
> {
  baseUrl: string;
  uploadPath: string;
  validationConfig?: VC;
  processingConfig?: PC;
  fileValidatedCallback?: FileValidatedCallback<FVD, VR>;
  fileProcessingProgressCallback?: FileProcessingProgressCallback;
  fileProcessedCallback?: FileProcessedCallback;
  fileUploadProgressCallback?: FileUploadProgressCallback;
  fileUploadedCallback?: FileUploadedCallback;
  fileUploadProcessCallback?: FileUploadProcessCallback;
  fileUploadFinishedCallback?: FileUploadFinishedCallback;
  fileHandlerErrorCallback?: FileHandlerErrorCallback;
  fileValidationErrorCallback?: FileHandlerValidationErrorCallback;
  fileProcessingErrorCallback?: FileHandlerProcessingErrorCallback;
  fileUploadErrorCallback?: FileHandlerUploadErrorCallback;
  fileUploadSSErrorCallback?: FileHandlerUploadSSErrorCallback;
}
