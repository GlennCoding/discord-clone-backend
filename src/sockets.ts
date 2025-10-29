import "./config/loadEnvironment";
import { Server } from "socket.io";

import corsOptions from "./config/corsOptions";
import verifySocketJWT from "./middleware/verifySocketJWT";
import { onConnection } from "./socketHandlers";
import { TypedServer } from "./types/sockets";
import { server } from "./app";

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
