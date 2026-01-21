import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/redis";
import { auditHttp } from "../utils/audit";
import { UserRequest } from "./verifyJWT";

type CreateLimiterOptions = {
  windowMs: number;
  max: number;
  prefix: string; // namespace per endpoint
  message?: string;
};

function getClientIp(req: any): string {
  // If you're behind a reverse proxy/load balancer, you MUST configure `app.set("trust proxy", ...)`
  // or req.ip will be wrong.
  return req.ip ?? req.headers["x-forwarded-for"] ?? "unknown";
}

export function createLimiter(opts: CreateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,

    // Recommended modern headers (RateLimit-Limit/Remaining/Reset + Retry-After)
    standardHeaders: true,
    legacyHeaders: false,

    // Store counters in Redis (shared across instances)
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.sendCommand(args),
      prefix: opts.prefix,
    }),

    keyGenerator: (req) => {
      return (req as UserRequest).userId ?? getClientIp(req);
    },

    handler: (req, res) => {
      auditHttp(req, "RATE_LIMITED", { metadata: { prefix: opts.prefix } });
      res.status(429).json({
        error: "RATE_LIMITED",
        message: opts.message ?? "Too many requests, please try again later.",
      });
    },
  });
}

export const globalLimiter = createLimiter({
  windowMs: 60_000,
  max: 300, // 300 req/min/IP
  prefix: "rl:global:",
});

export const authLoginLimiter = createLimiter({
  windowMs: 15 * 60_000,
  max: 10, // 10 attempts / 15 min / IP
  prefix: "rl:auth:login:",
  message: "Too many login attempts. Please wait and try again.",
});

export const authRefreshLimiter = createLimiter({
  windowMs: 5 * 60_000,
  max: 30,
  prefix: "rl:auth:refresh:",
});

export const sendMessageLimiter = createLimiter({
  windowMs: 60_000,
  max: 60, // 60 messages/min/IP (starter; later switch to userId!)
  prefix: "rl:messages:send:",
});

export const uploadMessageAttachmentLimiter = createLimiter({
  windowMs: 5 * 60_000,
  max: 40,
  prefix: "rl:auth:refresh:",
});

export const uploadProfileImgLimiter = createLimiter({
  windowMs: 5 * 60_000,
  max: 10,
  prefix: "rl:auth:refresh:",
});

// What else to rate limit? -> message attachement upload, profile pic upload
