// src/middleware/errorMiddleware.ts
import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/errors";
import multer from "multer";

export const errorMiddleware: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const request = req as any;

  if (err instanceof CustomError) {
    request.log?.error(
      {
        err: { name: err?.name, message: err?.message, stack: err?.stack },
        userId: request.user?.id,
      },
      "custom_error",
    );

    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    request.log?.error(
      {
        err: { name: err?.name, message: err?.message, stack: err?.stack },
        userId: request.user?.id,
      },
      "multer_error",
    );

    res.status(status).json({ error: err.message });
    return;
  }

  request.log?.error(
    {
      err: { name: err?.name, message: err?.message, stack: err?.stack },
      userId: request.user?.id,
    },
    "unhandled_error",
  );
  res.status(500).json({ error: "Internal server error" });
};
