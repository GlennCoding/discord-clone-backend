import { randomUUID } from "crypto";

import { env } from "./env";

const sanitizeSegment = (value: string | undefined) => {
  if (!value) return "resource";
  const trimmed = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
  return trimmed.length > 0 ? trimmed.slice(0, 32) : "resource";
};

export const buildObjectKey = (
  folder: string,
  identifier: string | undefined,
  extension?: string,
) => {
  const safeIdentifier = sanitizeSegment(identifier);
  const extPart = extension ? `.${extension}` : "";
  return `${folder}/${Date.now()}-${safeIdentifier}-${randomUUID()}${extPart}`;
};

export const getLocalUrl = (bucketName: string, blobName: string): string => {
  const encodedBlobName = encodeURIComponent(blobName);
  return `${env.GCS_PUBLIC_URL}/storage/v1/b/${bucketName}/o/${encodedBlobName}?alt=media`;
};
