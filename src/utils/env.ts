import { z } from "zod";

const envSchema = z.object({
  DATABASE_URI: z.string(),
  DB_NAME: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  PORT: z.coerce.number().default(8000),
});

export const env = envSchema.parse(process.env);
