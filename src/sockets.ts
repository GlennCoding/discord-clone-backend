import "./config/loadEnvironment";
import { Server } from "socket.io";
import http from "http";

import corsOptions from "./config/corsOptions";
import verifySocketJWT from "./middleware/verifySocketJWT";
import { onConnection } from "./socketHandlers";
import { TypedServer } from "./types/sockets";
import { app } from "./app";

const server = http.createServer(app);

const io: TypedServer = new Server(server, {
  cors: corsOptions,
});

// Socket.IO middleware and handlers
io.use(verifySocketJWT);
io.on("connection", (socket) => onConnection(io, socket));

export { server, io };
