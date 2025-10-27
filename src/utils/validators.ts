import { CustomError } from "./errors";

export function validateStatus(status: any) {
  const MAX_STATUS_LENGTH = 200;

  if (typeof status !== "string") {
    throw new CustomError(400, "Status must be a string.");
  }
  if (status.length > MAX_STATUS_LENGTH) {
    throw new CustomError(
      400,
      `Status length should not exceed ${MAX_STATUS_LENGTH} chars`
    );
  }
}
