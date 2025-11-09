import { ACCESS_TOKEN_COOKIE_NAME } from "../../config/tokenCookies";

export const buildAccessTokenCookie = (token: string) =>
  `${ACCESS_TOKEN_COOKIE_NAME}=${token}`;
