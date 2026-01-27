import { doubleCsrf } from "csrf-csrf";

import { env } from "../utils/env";
import { isProdEnv } from "../utils/helper";

export const CSRF_COOKIE_NAME = "x-csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  getSessionIdentifier: (req) =>
    `${req.ip ?? "unknown-ip"}|${req.headers["user-agent"] ?? "unknown-ua"}`,
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    sameSite: isProdEnv ? "lax" : "none",
    path: "/",
    secure: isProdEnv,
    httpOnly: false,
  },
  getCsrfTokenFromRequest: (req) => req.headers[CSRF_HEADER_NAME] as string,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  size: 64,
});

export { doubleCsrfProtection, generateCsrfToken };
