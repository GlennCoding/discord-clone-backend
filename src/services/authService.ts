import jwt from "jsonwebtoken";

import { env } from "../utils/env";

import type { IUser } from "../models/User";

export const issueAuthTokens = (user: IUser) => {
  const accessToken = issueAccessToken(user);
  const ssrAccessToken = issueSsrAccessToken(user);
  const refreshToken = issueRefreshToken(user);

  return { accessToken, ssrAccessToken, refreshToken };
};

export const issueAccessToken = (user: IUser) => {
  return jwt.sign(
    {
      UserInfo: {
        userId: user._id,
      },
    },
    env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "15min",
    },
  );
};

export const issueSsrAccessToken = (user: IUser) => {
  return jwt.sign(
    {
      UserInfo: {
        userId: user._id,
      },
    },
    env.SSR_ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "24hrs",
    },
  );
};

export const issueRefreshToken = (user: IUser) => {
  return jwt.sign({ userId: user._id }, env.REFRESH_TOKEN_SECRET as string, {
    expiresIn: "7days",
  });
};
