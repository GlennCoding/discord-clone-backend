import http from "http";
import { app } from "./app";
import { connectDB } from "./config/dbConn";
import "./config/loadEnvironment";
import { env } from "./utils/env";
import { initSocketServer } from "./sockets";

export const server = http.createServer(app);

const start = async () => {
  await connectDB();

  initSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`🚀 Server (HTTP + Socket.IO) is running on port ${env.PORT}`);
  });
};

start();
