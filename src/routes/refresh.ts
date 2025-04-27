import { Router, Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { getEnvVar } from "../utils/getEnvVar";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    res.status(401).json({ message: "Refresh Token required" });
    return;
  }
  const refreshToken = cookies.jwt;
  console.log(refreshToken);

  // check if refresh token in DB
  const foundUser = await User.findOne({ refreshTokens: refreshToken }).exec();
  if (!foundUser) {
    res.sendStatus(401);
    return;
  }
  console.log(foundUser);

  // jwt.verify refresh token
  // generate new access token

  const onSuccessfulVerify = () => {
    const newAccessToken = jwt.sign(
      {
        UserInfo: {
          userId: foundUser._id,
        },
      },
      getEnvVar("ACCESS_TOKEN_SECRET"),
      { expiresIn: "10min" }
    );

    res.status(200).json({ token: newAccessToken });
  };

  jwt.verify(
    refreshToken,
    getEnvVar("REFRESH_TOKEN_SECRET"),
    (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
      if (err || decoded === undefined) return res.sendStatus(403);
      onSuccessfulVerify();
    }
  );
});

export default router;
