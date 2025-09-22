import "./config/loadEnvironment";
import { Server } from "socket.io";

import corsOptions from "./config/corsOptions";
import verifySocketJWT from "./middleware/verifySocketJWT";
import { onConnection } from "./socketHandlers";
import { TypedServer } from "./types/sockets";
import { server } from "./app";

const io: TypedServer = new Server(server, {
  cors: corsOptions,
});

// Socket.IO middleware and handlers
io.use(verifySocketJWT);
io.on("connection", (socket) => onConnection(io, socket));

export { io };
