import { env } from "./env";

export const idsEqual = (a: any, b: any): boolean => {
  return a?.toString() === b?.toString();
};

export const isProdEnv =
  env.NODE_ENV === "production" || env.NODE_ENV === "production.local";
