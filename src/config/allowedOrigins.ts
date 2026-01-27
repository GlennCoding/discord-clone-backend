import { isProdEnv } from "../utils/helper";

const allowedOrigins = [
  "https://www.discordclone.de",
  "https://discordclone.de",
  "https://epic-discord-clone.vercel.app",
  "https://discord-clone-frontend-glenncodings-projects.vercel.app",
];

if (!isProdEnv) {
  allowedOrigins.push("http://localhost:3000", "http://localhost:3500", "http://127.0.0.1:5500");
}

export default allowedOrigins;
