// src/middleware/errorMiddleware.ts
import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/errors";
import z from "zod";

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
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};
