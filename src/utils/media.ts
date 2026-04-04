import { MediaImageSize } from "../types/media-types";

export const adjustOrientationWith = (
  source: MediaImageSize,
  target: MediaImageSize
): MediaImageSize => {
  return source[0] >= source[1] != target[0] >= target[1]
    ? [target[1], target[0]]
    : target;
};
