import { CookieOptions, Response } from "express";
import { isProdEnv } from "../utils/helper";

export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions: CookieOptions = {
  domain: isProdEnv ? ".discordclone.de" : undefined,
  httpOnly: true,
  secure: isProdEnv,
  sameSite: isProdEnv ? "lax" : "none",
  path: "/",
};

const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...baseCookieOptions,
  maxAge: FIFTEEN_MINUTES_MS,
};

const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...baseCookieOptions,
  maxAge: SEVEN_DAYS_MS,
  path: "/refresh",
};

export const setAccessTokenCookie = (res: Response, token: string) => {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, REFRESH_TOKEN_COOKIE_OPTIONS);
};

export const clearAccessTokenCookie = (res: Response) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS);
};
