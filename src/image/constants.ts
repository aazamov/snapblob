/** MIME types supported for image processing. */
export enum ImageMimeType {
  PNG = "image/png",
  JPEG = "image/jpeg",
  WEBP = "image/webp",
  GIF = "image/gif",
  SVG = "image/svg+xml",
  TIFF = "image/tiff",
  BMP = "image/bmp",
  ICO = "image/x-icon",
}

/** Resize filter algorithms available for Pica-based resizing. */
export enum ResizeFilter {
  BOX = "box",
  HAMMING = "hamming",
  LANCZOS2 = "lanczos2",
  LANCZOS3 = "lanczos3",
  MKS2013 = "mks2013",
}
