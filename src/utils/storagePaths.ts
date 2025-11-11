import { randomUUID } from "crypto";

const sanitizeSegment = (value: string | undefined) => {
  if (!value) return "resource";
  const trimmed = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
  return trimmed.length > 0 ? trimmed.slice(0, 32) : "resource";
};

export const buildObjectKey = (
  folder: string,
  identifier: string | undefined,
  extension?: string
) => {
  const safeIdentifier = sanitizeSegment(identifier);
  const extPart = extension ? `.${extension}` : "";
  return `${folder}/${Date.now()}-${safeIdentifier}-${randomUUID()}${extPart}`;
};
