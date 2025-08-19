import { server } from "./app";
import { connectDB } from "./config/dbConn";
import "./config/loadEnvironment";

import getEnvVar from "./utils/getEnvVar";

// Load PORT from environment
const PORT = getEnvVar("PORT") || 8000;

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server (HTTP + Socket.IO) is running on port ${PORT}`);
  });
};

start();
