import { server } from "./app";
import { connectDB } from "./config/dbConn";
import "./config/loadEnvironment";
import { env } from "./utils/env";
import "./sockets";
import { ensureBucket } from "./config/storage";

const start = async () => {
  await connectDB();
  await ensureBucket("profile-pictures");

  server.listen(env.PORT, () => {
    console.log(`🚀 Server (HTTP + Socket.IO) is running on port ${env.PORT}`);
  });
};

start();
