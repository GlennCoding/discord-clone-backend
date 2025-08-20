// src/middleware/errorMiddleware.ts
import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/errors";

export const errorMiddleware: ErrorRequestHandler = (
  error: Error,
  _: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof CustomError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
};
