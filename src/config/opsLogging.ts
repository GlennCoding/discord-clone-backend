import mongoose from "mongoose";

import type { Server } from "http";
import type { Logger } from "pino";

let processHandlersRegistered = false;
let mongooseHandlersRegistered = false;
let serverHandlersRegistered = false;

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { error };
};

export const registerProcessHandlers = (logger: Logger) => {
  if (processHandlersRegistered) return;
  processHandlersRegistered = true;

  process.on("unhandledRejection", (reason) => {
    logger.fatal(
      { err: serializeError(reason) },
      "unhandled_rejection"
    );
  });

  process.on("uncaughtException", (error) => {
    logger.fatal(
      { err: serializeError(error) },
      "uncaught_exception"
    );
  });

  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.once(signal, () => {
      logger.info({ signal }, "process_signal_received");
      process.exit(0);
    });
  });
};

export const registerMongooseHandlers = (logger: Logger) => {
  if (mongooseHandlersRegistered) return;
  mongooseHandlersRegistered = true;

  const connection = mongoose.connection;

  connection.on("connected", () => {
    logger.info({ component: "db", db: "mongo" }, "mongo_connected");
  });

  connection.on("disconnected", () => {
    logger.warn({ component: "db", db: "mongo" }, "mongo_disconnected");
  });

  connection.on("reconnected", () => {
    logger.info({ component: "db", db: "mongo" }, "mongo_reconnected");
  });

  connection.on("error", (error) => {
    logger.error(
      { component: "db", db: "mongo", err: serializeError(error) },
      "mongo_error"
    );
  });
};

export const registerServerHandlers = (server: Server, logger: Logger) => {
  if (serverHandlersRegistered) return;
  serverHandlersRegistered = true;

  server.on("listening", () => {
    logger.info({ component: "http" }, "http_server_listening");
  });

  server.on("close", () => {
    logger.info({ component: "http" }, "http_server_closed");
  });

  server.on("error", (error) => {
    logger.error(
      { component: "http", err: serializeError(error) },
      "http_server_error"
    );
  });
};
