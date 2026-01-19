import pino from "pino";
import { isProdOrProdLocalEnv } from "../utils/helper";
import {
  SSR_ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from "./tokenCookies";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProdOrProdLocalEnv ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      ACCESS_TOKEN_COOKIE_NAME,
      REFRESH_TOKEN_COOKIE_NAME,
      SSR_ACCESS_TOKEN_COOKIE_NAME,
    ],
    remove: true,
  },
  base: {
    service: process.env.SERVICE_NAME ?? "discord-clone-api",
    env: process.env.NODE_ENV ?? "development",
  },
});
