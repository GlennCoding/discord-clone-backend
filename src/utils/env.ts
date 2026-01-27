import { treeifyError, z } from "zod";

const DEFAULT_PORT = 8000;

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URI: z.string(),
  DB_NAME: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  SSR_ACCESS_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  CSRF_SECRET: z.string(),
  GCS_PUBLIC_URL: z.string(),
  GCS_BUCKET_NAME: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string(),
  PORT: z.coerce.number().default(DEFAULT_PORT),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", treeifyError(parsedEnv.error));
  process.exit(1);
}

export const env = parsedEnv.data;
