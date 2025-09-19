import "./config/loadEnvironment";
import { Server, Socket } from "socket.io";
import http from "http";

import corsOptions from "./config/corsOptions";
import verifySocketJWT from "./middleware/verifySocketJWT";
import { onConnection } from "./socketHandlers";

const initSocketServer = (server: http.Server) => {
  const io = new Server(server, {
    cors: corsOptions,
  });

  // Socket.IO middleware and handlers
  io.use(verifySocketJWT);
  io.on("connection", (socket: Socket) => onConnection(io, socket));
};

export { initSocketServer };
