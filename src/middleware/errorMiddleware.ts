// src/middleware/errorMiddleware.ts

import multer from "multer";

import { CustomError } from "../utils/errors";

import type { UserRequest } from "./verifyJWT";
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";

const getRequestContext = (request: Request | UserRequest) => ({
  userId: "userId" in request ? request.userId : undefined,
  requestId: "requestId" in request ? request.requestId : undefined,
});

export const errorMiddleware: ErrorRequestHandler = (
  err: Error,
  req: Request | UserRequest,
  res: Response,
  _next: NextFunction,
) => {
  const requestContext = getRequestContext(req);

  if (err instanceof CustomError) {
    req.log.error(
      {
        err: { name: err?.name, message: err?.message, stack: err?.stack },
        ...requestContext,
      },
      "custom_error",
    );

    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    req.log?.error(
      {
        err: { name: err?.name, message: err?.message, stack: err?.stack },
        ...requestContext,
      },
      "multer_error",
    );

    res.status(status).json({ error: err.message });
    return;
  }
  if ((err as any)?.status) {
    const status = (err as any).status;
    req.log.error(
      {
        err: { name: err?.name, message: err?.message, stack: err?.stack },
        ...requestContext,
      },
      "http_error",
    );
    res.status(status).json({ error: err.message });
    return;
  }

  req.log.error(
    {
      err: { name: err?.name, message: err?.message, stack: err?.stack },
      ...requestContext,
    },
    "unhandled_error",
  );
  res.status(500).json({ error: "Internal server error" });
};
