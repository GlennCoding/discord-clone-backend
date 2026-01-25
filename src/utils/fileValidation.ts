import { fileTypeFromBuffer } from "file-type";

import { CustomError } from "./errors";

interface FileValidationOptions {
  allowedMimeTypes: readonly string[];
  maxFileSizeBytes: number;
}

export interface FileValidationResult {
  ext: string;
  mime: string;
}

export const validateUploadedFile = async (
  file: Express.Multer.File | undefined,
  options: FileValidationOptions
): Promise<FileValidationResult> => {
  if (!file) {
    throw new CustomError(400, "No file attached");
  }

  if (!file.buffer?.length) {
    throw new CustomError(400, "File is empty");
  }

  if (file.size > options.maxFileSizeBytes) {
    throw new CustomError(413, "File size exceeds allowed limit");
  }

  const detectedType = await fileTypeFromBuffer(file.buffer);

  if (!detectedType || !options.allowedMimeTypes.includes(detectedType.mime)) {
    throw new CustomError(400, "Unsupported file type");
  }

  return detectedType;
};
