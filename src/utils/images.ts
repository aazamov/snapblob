/**
 * Converts image dimensions to a specific aspect ratio while maintaining the original aspect ratio
 * Uses the smallest dimension (width or height) as the base for conversion
 * @param width - Original image width
 * @param height - Original image height
 * @param targetAspectRatio - Target aspect ratio (width/height)
 * @returns Object containing new width and height
 */
export const convertToAspectRatio = (
  width: number,
  height: number,
  targetAspectRatio: number
): { width: number; height: number } => {
  const currentAspectRatio = width / height;

  if (currentAspectRatio === targetAspectRatio) {
    return { width, height };
  }

  // Fit the target aspect ratio within the given bounding box (width x height)
  // by selecting the limiting dimension so the result never exceeds bounds.
  const heightFromWidth = Math.floor(width / targetAspectRatio);
  if (heightFromWidth <= height) {
    return { width, height: heightFromWidth };
  }

  const widthFromHeight = Math.floor(height * targetAspectRatio);
  return { width: widthFromHeight, height };
};
