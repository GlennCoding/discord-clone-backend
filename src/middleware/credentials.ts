import allowedOrigins from "../config/allowedOrigins";

import type { Request, Response, NextFunction } from "express";


const credentials = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Credentials", "true");
  }
  next();
};

export default credentials;
