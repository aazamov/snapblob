import Pica from "pica";
import { MediaImageSize } from "../../types/media-types";
import { BaseFileHandler } from "../base-handler/handler";
import {
  InputMediaFile,
  ProcessedFile,
  ValidatedDataResult,
} from "../base-handler/types";
import { ImageHandlerValidationError } from "./errors";
import { ImageProcessingConfig, ImageValidationData } from "./types";

import { ImageValidationConfig } from "./types";
import { adjustOrientationWith } from "../../utils/media";
import { convertToAspectRatio } from "../../utils/images";
import { PicaResizeFilter } from "./constants";
import { MediaImageMimeType } from "../constants/mimes";

/**
 * @deprecated Use `compressImage()` from `snapblob/image` instead. Will be removed in v2.0.
 */
export class ImageHandler<
  VC extends ImageValidationConfig,
  PC extends ImageProcessingConfig,
  FVD extends ImageValidationData,
  VR extends HTMLImageElement
> extends BaseFileHandler<VC, PC, FVD, VR> {
  protected picaInstance = new Pica();

  protected async getValidatedResult(
    inputFile: InputMediaFile
  ): Promise<ValidatedDataResult<VR>> {
    try {
      return await this.getLoadedImage(inputFile);
    } catch (error) {
      throw new ImageHandlerValidationError("Failed to load image");
    }
  }

  protected async handleFileProcessing(params: {
    inputFile: InputMediaFile;
    validatedResult: VR;
    validationData: FVD;
  }): Promise<ProcessedFile | null> {
    let processedImage = null;
    const config = this.processingConfig;

    if (config) {
      const { imageSize } = config;
      if (imageSize) {
        processedImage = await this.processImageWithPica(
          params.validatedResult,
          imageSize,
          config
        );
      }
    }

    return processedImage;
  }

  // validation methods
  protected async callValidationMethods(params: {
    config: VC;
    inputFile: InputMediaFile;
    validationData: FVD;
    validatedResult: VR;
  }): Promise<void> {
    await super.callValidationMethods(params);

    const { config, validatedResult, validationData } = params;

    await this.validateImageSize(config, validatedResult, validationData);
  }

  protected async getLoadedImage(
    inputFile: InputMediaFile
  ): Promise<ValidatedDataResult<VR>> {
    const imageUrl = URL.createObjectURL(inputFile);
    return await new Promise<ValidatedDataResult<VR>>((resolve, reject) => {
      const loadedImage = document.createElement("img");
      loadedImage.src = imageUrl;

      loadedImage.onload = () => {
        resolve({ validatedResult: loadedImage as VR, fileUrl: imageUrl });
      };

      loadedImage.onerror = () => {
        reject(new Error("Failed to load image."));
      };
    });
  }

  protected async validateImageSize(
    config: VC,
    validatedResult: VR,
    validationData: FVD
  ) {
    const { minImageSize, maxImageSize } = config;

    if (minImageSize || maxImageSize) {
      const imageSize: MediaImageSize = [
        validatedResult.width,
        validatedResult.height,
      ];
      if (
        minImageSize &&
        !(imageSize[0] >= minImageSize[0] && imageSize[1] >= minImageSize[1])
      ) {
        throw new ImageHandlerValidationError(
          `Image size is less than the minimum allowed size of ${minImageSize[0]}x${minImageSize[1]}`
        );
      }

      if (
        maxImageSize &&
        !(imageSize[0] <= maxImageSize[0] && imageSize[1] <= maxImageSize[1])
      ) {
        throw new ImageHandlerValidationError(
          `Image size is greater than the maximum allowed size of ${maxImageSize[0]}x${maxImageSize[1]}`
        );
      }
      validationData.imageSize = imageSize;
    }
  }

  // processing methods
  private async processImageWithPica(
    validatedResult: VR,
    imageSize: MediaImageSize,
    config: PC
  ): Promise<ProcessedFile | null> {
    try {
      return await new Promise<ProcessedFile>(async (resolve) => {
        const picaInstance = this.picaInstance;
        const ogSize: MediaImageSize = [
          validatedResult.width,
          validatedResult.height,
        ];
        const [ogWidth, ogHeight] = ogSize;

        if (config?.adjustOrientation !== false) {
          imageSize = adjustOrientationWith(ogSize, imageSize);
        }

        let [width, height] = imageSize;
        let ogAspectRatio = ogWidth / ogHeight;
        ({ width, height } = convertToAspectRatio(
          width,
          height,
          ogAspectRatio
        ));

        const {
          resizeQuality = 0.8,
          resizeFilter = PicaResizeFilter.MKS2013,
          imageMimeType = MediaImageMimeType.WEBP,
        } = config;

        const targetCanvas = document.createElement("canvas");
        targetCanvas.width = width;
        targetCanvas.height = height;

        await picaInstance.resize(validatedResult, targetCanvas, {
          filter: resizeFilter,
        });

        const blob = await picaInstance.toBlob(
          targetCanvas,
          imageMimeType,
          resizeQuality
        );

        resolve(blob);
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

/**
 * @deprecated Use `compressImage()` from `snapblob/image` instead. Will be removed in v2.0.
 */
export const TypedImageHandler = ImageHandler<
  ImageValidationConfig,
  ImageProcessingConfig,
  ImageValidationData,
  HTMLImageElement
>;
