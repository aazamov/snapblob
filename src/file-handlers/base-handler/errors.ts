export class FileHandlerError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class FileHandlerValidationError extends FileHandlerError {}
export class FileHandlerCompressionError extends FileHandlerError {}
export class FileHandlerUploadError extends FileHandlerError {}
export class ServerSideProcessError extends FileHandlerError {}
