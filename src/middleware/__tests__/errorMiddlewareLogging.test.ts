import multer from "multer";
import { describe, expect, it, vi } from "vitest";

import { CustomError } from "../../utils/errors";
import { errorMiddleware } from "../errorMiddleware";

const createMockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("errorMiddleware logging", () => {
  it("logs and responds for CustomError", () => {
    const log = { error: vi.fn() };
    const req: any = { log, userId: "user-123", requestId: "req-abc" };
    const res = createMockRes();

    const err = new CustomError(418, "custom failure");
    errorMiddleware(err, req as any, res as any, vi.fn());

    expect(log.error).toHaveBeenCalledWith(
      {
        err: {
          name: "CustomError",
          message: "custom failure",
          stack: err.stack,
        },
        userId: "user-123",
        requestId: "req-abc",
      },
      "custom_error"
    );
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ error: "custom failure" });
  });

  it("logs multer errors and sets status based on code", () => {
    const log = { error: vi.fn() };
    const req: any = { log, userId: "user-456", requestId: "req-def" };
    const res = createMockRes();

    const err = new multer.MulterError("LIMIT_FILE_SIZE");
    errorMiddleware(err, req as any, res as any, vi.fn());

    expect(log.error).toHaveBeenCalledWith(
      {
        err: {
          name: "MulterError",
          message: err.message,
          stack: err.stack,
        },
        userId: "user-456",
        requestId: "req-def",
      },
      "multer_error"
    );
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: err.message });
  });

  it("logs unhandled errors and returns 500", () => {
    const log = { error: vi.fn() };
    const req: any = { log };
    const res = createMockRes();

    const err = new Error("unexpected");
    errorMiddleware(err, req as any, res as any, vi.fn());

    expect(log.error).toHaveBeenCalledWith(
      {
        err: {
          name: "Error",
          message: "unexpected",
          stack: err.stack,
        },
        userId: undefined,
        requestId: undefined,
      },
      "unhandled_error"
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
