import "./config/loadEnvironment";
import { Server } from "socket.io";

import { server } from "./app";
import corsOptions from "./config/corsOptions";
import verifySocketJWT from "./middleware/verifySocketJWT";
import { onConnection } from "./socketHandlers";

import type { TypedServer } from "./types/sockets";

let io: TypedServer;

// Socket.IO middleware and handlers

export const initSocket = () => {
  io = new Server(server, {
    cors: corsOptions,
  });

  io.use(verifySocketJWT);
  io.on("connection", (socket) => onConnection(io, socket));

  return io;
};
