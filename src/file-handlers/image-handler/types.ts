import { MediaImageSize } from "../../types/media-types";
import { MediaImageMimeType } from "../constants/mimes";
import { PicaResizeFilter } from "./constants";
import {
  BaseFileHandlerParams,
  FileValidationData,
  ProcessingConfig,
  ValidationConfig,
} from "../base-handler/types";

// validation types //
export interface ImageValidationConfig extends ValidationConfig {
  minImageSize?: MediaImageSize;
  maxImageSize?: MediaImageSize;
}

export interface ImageValidationData extends FileValidationData {
  imageSize?: MediaImageSize;
}

// processing types //
export interface ImageProcessingConfig extends ProcessingConfig {
  imageSize?: MediaImageSize;
  imageMimeType?: MediaImageMimeType;
  resizeQuality?: number;
  resizeFilter?: PicaResizeFilter;
  adjustOrientation?: boolean;
}

// handler param types //
export interface ImageHandlerParams<
  VC extends ImageValidationConfig,
  PC extends ImageProcessingConfig,
  FVD extends ImageValidationData,
  VR extends HTMLImageElement
> extends BaseFileHandlerParams<VC, PC, FVD, VR> {}
