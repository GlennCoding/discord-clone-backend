import { parseEnv } from "znv";
import { z } from "zod";

export const env = parseEnv(process.env, {
  DATABASE_URI: z.string(),
  DB_NAME: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  PORT: z.coerce.number().default(8000),
});
