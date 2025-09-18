import { parseEnv } from "znv";
import { z } from "zod";

export const env = parseEnv(process.env, {
  PORT: z.number().default(3000),
});
