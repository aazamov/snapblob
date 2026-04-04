import { MediaUploadErrorData } from "../file-handlers/base-handler/types";

export const isMediaUploadErrorData = (
  data: unknown
): data is MediaUploadErrorData => {
  if (typeof data === "object" && data !== null) {
    return "detail" in data;
  }
  return false;
};
