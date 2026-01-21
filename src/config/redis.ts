import { createClient } from "redis";
import { logger } from "./logger";

export const redis = createClient({
  url: process.env.REDIS_URL, // e.g. redis://localhost:6379
});

redis.on("error", (err) => {
  logger.error({ err }, "redis_error");
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}
