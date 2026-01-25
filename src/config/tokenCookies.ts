import { isProdEnv } from "../utils/helper";

import type { CookieOptions, Response } from "express";


export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const SSR_ACCESS_TOKEN_COOKIE_NAME = "ssr_access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions: CookieOptions = {
  domain: isProdEnv ? ".discordclone.de" : undefined,
  httpOnly: true,
  secure: isProdEnv,
  sameSite: isProdEnv ? "lax" : false,
  path: "/",
};

const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...baseCookieOptions,
  maxAge: FIFTEEN_MINUTES_MS,
};

const SSR_ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...baseCookieOptions,
  maxAge: TWENTY_FOUR_HOURS_MS,
};

const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...baseCookieOptions,
  maxAge: SEVEN_DAYS_MS,
  path: "/refresh",
};

export const setAccessTokenCookie = (res: Response, token: string) => {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const setSsrAccessTokenCookie = (res: Response, token: string) => {
  res.cookie(SSR_ACCESS_TOKEN_COOKIE_NAME, token, SSR_ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, REFRESH_TOKEN_COOKIE_OPTIONS);
};

export const clearAccessTokenCookie = (res: Response) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const clearSsrAccessTokenCookie = (res: Response) => {
  res.clearCookie(SSR_ACCESS_TOKEN_COOKIE_NAME, SSR_ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS);
};
