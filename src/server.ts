import { server } from "./app";
import { connectDB } from "./config/dbConn";
import "./config/loadEnvironment";
import { env } from "./utils/env";

const start = async () => {
  await connectDB();
  server.listen(env.PORT, () => {
    console.log(`🚀 Server (HTTP + Socket.IO) is running on port ${env.PORT}`);
  });
};

start();
