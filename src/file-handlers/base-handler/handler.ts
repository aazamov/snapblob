import axios, { AxiosResponse } from "axios";
import { UploadRequestMethods } from "../../constants/requests";
import { axiosBase } from "../../utils/requests";
import {
  FileHandlerUploadError,
  FileHandlerValidationError,
  ServerSideProcessError,
} from "./errors";
import {
  BaseFileHandlerParams,
  FileHandlerErrorCallback,
  FileHandlerProcessingErrorCallback,
  FileHandlerUploadErrorCallback,
  FileHandlerUploadSSErrorCallback,
  FileHandlerValidationErrorCallback,
  FileProcessedCallback,
  FileUploadFinishedCallback,
  FileUploadProcessCallback,
  FileUploadProgressCallback,
  FileUploadedCallback,
  FileValidatedCallback,
  FileValidationData,
  InputMediaFile,
  MediaUploadResponse,
  ProcessedFile,
  ProcessingConfig,
  ServerSideProcessReport,
  ValidatedDataResult,
  ValidationConfig,
  FileProcessingProgressCallback,
} from "./types";
import { isMediaUploadErrorData } from "../../utils/general";
import { MediaUploadStatus } from "./constants";

/**
 * @deprecated Use the standalone functions from `snapblob/image` or `snapblob/video` instead. Will be removed in v2.0.
 */
export abstract class BaseFileHandler<
  VC extends ValidationConfig,
  PC extends ProcessingConfig,
  FVD extends FileValidationData,
  VR
> {
  // generals
  protected uploadFormKey: string = "file";
  protected uploadRequestMethod: UploadRequestMethods =
    UploadRequestMethods.POST;
  protected reportRequestInterval: number = 2000;
  protected reportEndpointPath: string = "/api/upload/lazy-processing-report";

  //urls
  public baseUrl: string;
  public uploadPath: string;

  // configs
  public validationConfig?: VC;
  public processingConfig?: PC;
  // callbacks
  protected fileValidatedCallback?: FileValidatedCallback<FVD, VR>;
  protected fileProcessingProgressCallback?: FileProcessingProgressCallback;
  protected fileProcessedCallback?: FileProcessedCallback;
  protected fileUploadProgressCallback?: FileUploadProgressCallback;
  protected fileUploadedCallback?: FileUploadedCallback;
  protected fileUploadProcessCallback?: FileUploadProcessCallback;
  protected fileUploadFinishedCallback?: FileUploadFinishedCallback;

  //error callbacks
  protected fileHandlerErrorCallback?: FileHandlerErrorCallback;
  protected fileValidationErrorCallback?: FileHandlerValidationErrorCallback;
  protected fileProcessingErrorCallback?: FileHandlerProcessingErrorCallback;
  protected fileUploadErrorCallback?: FileHandlerUploadErrorCallback;
  protected fileUploadSSErrorCallback?: FileHandlerUploadSSErrorCallback;

  // other props
  protected previousOriginalUrl: string | null = null;
  protected previousFileUrl: string | null = null;

  constructor({
    baseUrl,
    uploadPath,
    validationConfig,
    processingConfig,
    fileValidatedCallback,
    fileProcessingProgressCallback,
    fileProcessedCallback,
    fileUploadProgressCallback,
    fileUploadedCallback,
    fileUploadProcessCallback,
    fileUploadFinishedCallback,
    fileHandlerErrorCallback,
    fileValidationErrorCallback,
    fileProcessingErrorCallback,
    fileUploadErrorCallback,
    fileUploadSSErrorCallback,
  }: BaseFileHandlerParams<VC, PC, FVD, VR>) {
    // urls
    this.baseUrl = baseUrl;
    this.uploadPath = uploadPath;

    // configs
    this.validationConfig = validationConfig;
    this.processingConfig = processingConfig;

    // callbacks
    this.fileValidatedCallback = fileValidatedCallback;
    this.fileProcessingProgressCallback = fileProcessingProgressCallback;
    this.fileProcessedCallback = fileProcessedCallback;
    this.fileUploadProgressCallback = fileUploadProgressCallback;
    this.fileUploadedCallback = fileUploadedCallback;
    this.fileUploadProcessCallback = fileUploadProcessCallback;
    this.fileUploadFinishedCallback = fileUploadFinishedCallback;

    // error callbacks
    this.fileHandlerErrorCallback = fileHandlerErrorCallback;
    this.fileValidationErrorCallback = fileValidationErrorCallback;
    this.fileProcessingErrorCallback = fileProcessingErrorCallback;
    this.fileUploadErrorCallback = fileUploadErrorCallback;
    this.fileUploadSSErrorCallback = fileUploadSSErrorCallback;
  }

  // getters
  get fileUploadEndpoint(): string {
    return new URL(this.uploadPath, this.baseUrl).toString();
  }
  get reportEndpointUrl(): string {
    return new URL(this.reportEndpointPath, this.baseUrl).toString();
  }

  // public methods
  public async handleInputUpload(inputFile: InputMediaFile) {
    this.revokePreviousUrls();

    const fileValidationErrorCallback = this.fileValidationErrorCallback;
    const fileProcessingErrorCallback = this.fileProcessingErrorCallback;
    const fileHandlerErrorCallback = this.fileHandlerErrorCallback;

    const validationData = this.getNewValidationData();
    const fileProcessedCallback = this.fileProcessedCallback;

    let originalFileUrl: string | null = null;
    let processedFileUrl: string | null = null;
    let validatedResult: VR;
    let processedFile: ProcessedFile;

    try {
      ({ validatedResult, fileUrl: originalFileUrl } =
        await this.handleFileValidation({
          inputFile,
          validationData,
        }));

      this.previousOriginalUrl = originalFileUrl;
    } catch (error) {
      if (fileValidationErrorCallback) {
        fileValidationErrorCallback();
      }
      throw error;
    }

    try {
      try {
        processedFile = ((await this.handleFileProcessing({
          inputFile,
          validatedResult,
          validationData,
        })) || inputFile) as ProcessedFile;
      } catch (error) {
        if (fileProcessingErrorCallback) {
          fileProcessingErrorCallback();
        }
        throw error;
      }

      processedFileUrl = URL.createObjectURL(processedFile);
      this.previousFileUrl = processedFileUrl;

      if (fileProcessedCallback) {
        fileProcessedCallback(processedFile, processedFileUrl);
      }
      await this.handleUploadingProcessedFile(processedFile, validationData);
    } catch (error) {
      if (fileHandlerErrorCallback) {
        fileHandlerErrorCallback(error as Error);
      }
      throw error;
    }
  }

  //abstract methods
  protected abstract getValidatedResult(
    inputFile: InputMediaFile
  ): Promise<ValidatedDataResult<VR>>;

  protected abstract handleFileProcessing(params: {
    inputFile: InputMediaFile;
    validatedResult: VR;
    validationData: FVD;
  }): Promise<ProcessedFile | null>;

  // helper methods

  protected revokePreviousUrls() {
    if (this.previousOriginalUrl) {
      URL.revokeObjectURL(this.previousOriginalUrl);
    }
    if (this.previousFileUrl) {
      URL.revokeObjectURL(this.previousFileUrl);
    }
  }

  // validation methods
  protected getNewValidationData(): FVD {
    return {} as FVD;
  }

  protected async handleFileValidation({
    inputFile,
    validationData,
  }: {
    inputFile: InputMediaFile;
    validationData: FVD;
  }): Promise<ValidatedDataResult<VR>> {
    const config = this.validationConfig;

    const validationDataResult = await this.getValidatedResult(inputFile);

    await this.validateUploadedFileName(inputFile, validationData);

    if (config) {
      await this.callValidationMethods({
        config,
        inputFile,
        validationData,
        ...validationDataResult,
      });
    }

    const fileValidatedCallback = this.fileValidatedCallback;

    if (fileValidatedCallback) {
      fileValidatedCallback({
        ...validationDataResult,
        validationData,
      });
    }

    return validationDataResult;
  }

  protected async callValidationMethods({
    config,
    inputFile,
    validationData,
  }: {
    config: VC;
    inputFile: InputMediaFile;
    validationData: FVD;
    validatedResult: VR;
  }) {
    await this.validateFileSize(config, inputFile, validationData);
    await this.validateFileMimeType(config, inputFile, validationData);
  }

  protected async validateUploadedFileName(
    inputFile: InputMediaFile,
    validationData: FVD
  ) {
    if (inputFile instanceof File) {
      const { name: fileName } = inputFile;
      if (fileName) {
        validationData.fileName = fileName.slice(0, 255);
      }
    }
  }

  protected async validateFileSize(
    config: VC,
    inputFile: InputMediaFile,
    validationData: FVD
  ) {
    const { maxFileSize } = config;

    if (maxFileSize) {
      const fileSize = inputFile.size;
      if (fileSize > maxFileSize) {
        throw new FileHandlerValidationError(
          `File size exceeds the maximum allowed size of ${maxFileSize} bytes`
        );
      }
      validationData.fileSize = fileSize;
    }
  }

  protected async validateFileMimeType(
    config: VC,
    inputFile: InputMediaFile,
    validationData: FVD
  ) {
    const { validMimeTypes } = config;

    if (validMimeTypes) {
      const mimeType = inputFile.type;

      if (!validMimeTypes.has(mimeType)) {
        throw new FileHandlerValidationError(
          `Invalid file mime type: ${mimeType}`
        );
      }
      validationData.mimeType = mimeType;
    }
  }

  // upload methods
  protected async handleUploadingProcessedFile(
    processedFile: ProcessedFile,
    validationData: FVD
  ) {
    const fileUploadErrorCallback = this.fileUploadErrorCallback;
    const fileUploadSSErrorCallback = this.fileUploadSSErrorCallback;

    const fileUploadFinishedCallback = this.fileUploadFinishedCallback;

    let responseData: MediaUploadResponse;

    try {
      responseData = await this.uploadProcessedFile(
        processedFile,
        validationData
      );
    } catch (error) {
      if (fileUploadErrorCallback) {
        fileUploadErrorCallback();
      }
      throw error;
    }

    try {
      const uploadDirname = await this.ensureServerSideProcessFinished(
        responseData
      );
      if (fileUploadFinishedCallback) {
        fileUploadFinishedCallback(uploadDirname);
      }
    } catch (error) {
      if (fileUploadSSErrorCallback) {
        fileUploadSSErrorCallback();
      }
      throw error;
    }
  }

  protected async uploadProcessedFile(
    processedFile: ProcessedFile,
    validationData: FVD
  ): Promise<MediaUploadResponse> {
    try {
      const requestMethod = this.uploadRequestMethod;
      const uploadKey = this.uploadFormKey;
      const fileUploadEndpoint = this.fileUploadEndpoint;
      const fileUploadProgressCallback = this.fileUploadProgressCallback;
      const fileUploadedCallback = this.fileUploadedCallback;
      const fileName = validationData.fileName || "original.webp";

      const formData = new FormData();
      formData.append(uploadKey, processedFile, fileName);

      const response = await axiosBase<MediaUploadResponse>({
        method: requestMethod,
        url: fileUploadEndpoint,
        data: formData,
        onUploadProgress: fileUploadProgressCallback,
      });

      const data = response.data;
      if (data && fileUploadedCallback) {
        fileUploadedCallback(data);
      }

      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        console.log(err);
        if (data && isMediaUploadErrorData(data)) {
          throw new FileHandlerUploadError(data.detail);
        }
      }
      throw new FileHandlerUploadError("Upload error");
    }
  }

  protected async ensureServerSideProcessFinished(
    responseData: MediaUploadResponse
  ): Promise<string> {
    const uploadedDirname = responseData["uploaded_dirname"];
    const status = responseData["status"];

    if (status === MediaUploadStatus.PROCESSING) {
      await this.waitServerSideProcessing(uploadedDirname);
    } else if (status === MediaUploadStatus.FAILED) {
      throw new ServerSideProcessError("Server side process failed");
    }
    return uploadedDirname;
  }

  protected async waitServerSideProcessing(uploadDirname: string) {
    return await new Promise((resolve, reject) => {
      const requestInterval = this.reportRequestInterval;
      const fileUploadProcessCallback = this.fileUploadProcessCallback;
      const reportEndpointUrl = this.reportEndpointUrl;
      let sharedPromise: null | Promise<
        AxiosResponse<ServerSideProcessReport>
      > = null;

      const intervalId = setInterval(async () => {
        if (sharedPromise !== null) {
          return;
        }

        sharedPromise = axiosBase.post<ServerSideProcessReport>(
          reportEndpointUrl,
          null,
          { params: { dirname: uploadDirname } }
        );
        const response = await sharedPromise;
        const data = response.data;
        const status = data["status"];

        if (fileUploadProcessCallback) {
          fileUploadProcessCallback(data);
        }
        if (status === MediaUploadStatus.COMPLETED) {
          clearInterval(intervalId);
          resolve(data);
        } else if (status === MediaUploadStatus.FAILED) {
          clearInterval(intervalId);
          reject(new ServerSideProcessError("Server side process failed"));
        }

        sharedPromise = null;
      }, requestInterval);
    });
  }
}
