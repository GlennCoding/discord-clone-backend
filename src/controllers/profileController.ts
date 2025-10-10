import { NextFunction, Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import { UserNotFoundError, CustomError } from "../utils/errors";
import User from "../models/User";
import { ProfileDTO } from "../types/dto";
import { bucket } from "../config/storage";
import { validateStatus } from "../utils/validators";
import { getPublicProfileImgUrl } from "../services/profileService";

export const getProfile = async (req: UserRequest, res: Response) => {
  const user = await User.findById(req.userId as string);
  if (!user) throw new UserNotFoundError();

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    profileImgUrl: user.avatar?.url,
  } as ProfileDTO);
};

const MAX_FILE_SIZE_IN_MB = 7;
const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024; // 7 MB

export const updateProfile = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { status } = req.body;
  const user = await User.findById(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (status) {
    validateStatus(status);
    user.status = status;
    await user.save();
  }

  if (req.file) {
    if (!req.file.mimetype.startsWith("image/"))
      throw new CustomError(400, "File must be an image");

    if (req.file.size >= MAX_FILE_SIZE)
      throw new CustomError(
        400,
        `Image must be smaller than ${MAX_FILE_SIZE_IN_MB}MB`
      );

    const blob = bucket.file(Date.now() + "-" + user.userName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
    });

    blobStream.on("error", (err) => next(err));

    blobStream.on("finish", async () => {
      const previousAvatarFilePath = user.avatar?.filePath;
      const publicUrl = getPublicProfileImgUrl(bucket.name, blob.name);

      user.avatar = {
        filePath: blob.name,
        url: publicUrl,
      };

      await user.save();

      if (previousAvatarFilePath) {
        await bucket.file(previousAvatarFilePath).delete();
      }

      res.status(200).json({
        userName: user.userName,
        status: user.status,
        avatarUrl: user.avatar?.url,
      } as ProfileDTO);
    });

    blobStream.end(req.file.buffer);

    return;
  }

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    avatarUrl: user.avatar?.url,
  } as ProfileDTO);
};

export const deleteProfileImg = async (req: UserRequest, res: Response) => {
  const user = await User.findById(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (user.avatar) {
    await bucket.file(user.avatar.filePath).delete();
  }

  user.avatar = undefined;
  await user.save();

  res.sendStatus(204);
};
