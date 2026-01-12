import {
  ACCESS_TOKEN_COOKIE_NAME,
  SSR_ACCESS_TOKEN_COOKIE_NAME,
} from "../../config/tokenCookies";

export const buildAccessTokenCookie = (token: string) =>
  `${ACCESS_TOKEN_COOKIE_NAME}=${token}`;

export const buildSsrAccessTokenCookie = (token: string) =>
  `${SSR_ACCESS_TOKEN_COOKIE_NAME}=${token}`;
