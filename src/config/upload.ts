const BYTES_PER_MB = 1024 * 1024;

export const MAX_PROFILE_IMAGE_FILE_SIZE_MB = 7;
export const MAX_PROFILE_IMAGE_FILE_SIZE_BYTES =
  MAX_PROFILE_IMAGE_FILE_SIZE_MB * BYTES_PER_MB;

export const MAX_MESSAGE_ATTACHMENT_FILE_SIZE_MB = 7;
export const MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES =
  MAX_MESSAGE_ATTACHMENT_FILE_SIZE_MB * BYTES_PER_MB;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  "application/pdf",
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;
