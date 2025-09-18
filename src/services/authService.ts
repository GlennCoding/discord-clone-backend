import { IUser } from "../models/User";
import jwt from "jsonwebtoken";
import getEnvVar from "../utils/getEnvVar";

export const issueAuthToken = (user: IUser) => {
  return jwt.sign(
    {
      UserInfo: {
        userId: user._id,
      },
    },
    getEnvVar("ACCESS_TOKEN_SECRET"),
    {
      expiresIn: "20min",
    }
  );
};

export const issueRefreshToken = (user: IUser) => {
  return jwt.sign({ userId: user._id }, getEnvVar("REFRESH_TOKEN_SECRET"), {
    expiresIn: "1day",
  });
};
