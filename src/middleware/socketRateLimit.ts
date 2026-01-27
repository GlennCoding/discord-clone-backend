import { connectRedis, redis } from "../config/redis";
import { ERROR_STATUS, EVENT_ERROR } from "../types/sockets";
import { auditSocket } from "../utils/audit";
import { env } from "../utils/env";
import { SocketRateLimitError } from "../utils/errors";

import type { TypedSocket } from "../types/sockets";

type SocketRateLimitOptions = {
  windowSeconds: number;
  max: number;
  prefix: string;
};

type CounterStore = {
  increment: (key: string, windowSeconds: number) => Promise<number> | number;
};

const memoryStore: CounterStore = (() => {
  const buckets = new Map<string, { count: number; expiresAt: number }>();
  return {
    increment: (key, windowSeconds) => {
      const now = Date.now();
      const record = buckets.get(key);
      if (!record || record.expiresAt < now) {
        buckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
        return 1;
      }
      record.count += 1;
      return record.count;
    },
  };
})();

const redisStore: CounterStore = {
  increment: async (key, windowSeconds) => {
    await connectRedis();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return count;
  },
};

export const createSocketRateLimiter = (options: SocketRateLimitOptions) => {
  const store = env.NODE_ENV === "test" ? memoryStore : redisStore;

  return async (socket: TypedSocket, eventName: string) => {
    const id = socket.data.userId ?? socket.handshake.address ?? "unknown";
    const key = `${options.prefix}${eventName}:${id}`;
    const hits = await store.increment(key, options.windowSeconds);

    if (hits > options.max) {
      auditSocket(socket, "RATE_LIMITED", { metadata: { eventName } });
      throw new SocketRateLimitError();
    }
  };
};

export const withSocketRateLimit =
  (limiter: ReturnType<typeof createSocketRateLimiter>, eventName: string) =>
  (socket: TypedSocket, handler: (...args: any[]) => Promise<any> | any) =>
  async (...args: any[]) => {
    const maybeAck = args[args.length - 1];
    const ack = typeof maybeAck === "function" ? maybeAck : undefined;

    try {
      await limiter(socket, eventName);
    } catch (err) {
      if (ack) {
        ack(
          new EVENT_ERROR({
            error: ERROR_STATUS.RATE_LIMITED,
            message: "Too many requests, slow down.",
          }),
        );
      } else {
        socket.emit("chat:error", "Rate limit exceeded");
      }
      return;
    }

    return handler(...args);
  };

export const defaultSocketRateLimiter = createSocketRateLimiter({
  windowSeconds: 60,
  max: 120, // per user per event per minute
  prefix: "srl:",
});
