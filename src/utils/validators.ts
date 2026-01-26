import { CustomError, InputMissingError } from "./errors";

import type { ZodSchema } from "zod";

export function validateStatus(status: any) {
  const MAX_STATUS_LENGTH = 200;

  if (typeof status !== "string") {
    throw new CustomError(400, "Status must be a string.");
  }
  if (status.length > MAX_STATUS_LENGTH) {
    throw new CustomError(400, `Status length should not exceed ${MAX_STATUS_LENGTH} chars`);
  }
}

export const parseWithSchema = <T>(schema: ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message =
      result.error.issues.map((issue) => issue.message).join(", ") || "Invalid request body";
    throw new CustomError(400, message);
  }

  return result.data;
};

export const parseUserId = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new InputMissingError("userId");
  }

  return value;
};
