import { IUser } from "../models/User";
import jwt from "jsonwebtoken";
import { env } from "../utils/env";

export const issueAuthToken = (user: IUser) => {
  return jwt.sign(
    {
      UserInfo: {
        userId: user._id,
      },
    },
    env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "20min",
    }
  );
};

export const issueRefreshToken = (user: IUser) => {
  return jwt.sign({ userId: user._id }, env.REFRESH_TOKEN_SECRET as string, {
    expiresIn: "1day",
  });
};
