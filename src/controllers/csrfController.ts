import { generateCsrfToken } from "../config/csrf";

import type { Request, Response } from "express";

export const handleGetCsrfToken = (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  return res.status(200).json({ csrfToken: token });
};
