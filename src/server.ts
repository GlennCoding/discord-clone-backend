import { server } from "./app";
import { connectDB } from "./config/dbConn";
import "./config/loadEnvironment";
import "./config/storage";
import { logger } from "./config/logger";
import {
  registerMongooseHandlers,
  registerProcessHandlers,
  registerServerHandlers,
} from "./config/opsLogging";
import { connectRedis } from "./config/redis";
import { env } from "./utils/env";

registerProcessHandlers(logger);
registerMongooseHandlers(logger);
registerServerHandlers(server, logger);
logger.info(
  {
    service: process.env.SERVICE_NAME ?? "discord-clone-api",
    env: process.env.NODE_ENV ?? "development",
    pid: process.pid,
    node: process.version,
  },
  "service_start",
);

const start = async () => {
  await connectDB();
  await connectRedis();

  server.listen(env.PORT, () => {
    console.log(`🚀 Server (HTTP + Socket.IO) is running on port ${env.PORT}`);
  });
};

void start();
