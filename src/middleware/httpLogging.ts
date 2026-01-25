import { randomUUID } from "crypto";

import pinoHttp from "pino-http";

import { logger } from "../config/logger";
import { isProdOrProdLocalEnv } from "../utils/helper";

import type { NextFunction, RequestHandler, Request, Response } from "express";


export const httpLogger = pinoHttp({
  logger,
  enabled: isProdOrProdLocalEnv,
  // genReqId reuses x-request-id from incoming headers if present, otherwise generates a UUID
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = typeof existing === "string" && existing ? existing : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  // maps log severity based on outcome
  customLogLevel: function (req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // trims logged data
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
        userAgent: req.headers["user-agent"],
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  customSuccessMessage: () => "http_request",
  customErrorMessage: () => "http_request_error",
});

export const attachUserIdToHttpLogger: RequestHandler = (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  if ((req as any).user?.id) {
    (req as any).log = (req as any).log.child({ userId: (req as any).user.id });
  }
  next();
};
