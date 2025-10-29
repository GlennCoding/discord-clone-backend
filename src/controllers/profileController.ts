import { NextFunction, Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import { UserNotFoundError, CustomError } from "../utils/errors";
import User from "../models/User";
import { ProfileDTO } from "../types/dto";
import { validateStatus } from "../utils/validators";
import {
  deleteProfileImgFromBucket,
  uploadProfileImgToBucket,
} from "../services/profileService";
import { findUserWithUserId } from "../services/userService";
import { randomUUID } from "crypto";
import { fileTypeFromFile } from "file-type";

export const getProfile = async (req: UserRequest, res: Response) => {
  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    profileImgUrl: user.avatar?.url,
  } as ProfileDTO);
};

export const updateProfile = async (req: UserRequest, res: Response) => {
  const { status } = req.body;
  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (status === undefined) throw new CustomError(400, "Status is missing");

  validateStatus(status);
  user.status = status;
  await user.save();

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    profileImgUrl: user.avatar?.url,
  } as ProfileDTO);
  return;
};

export const updateProfileImg = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { file } = req;

  if (!file) throw new CustomError(400, "No file attached");

  if (!file.mimetype.startsWith("image/"))
    throw new CustomError(400, "File must be an image");

  // TODO: Implement file-type check
  // const detected = await fileTypeFromFile(file); // Don't know what to input here

  // if (!detected || !detected.mime.startsWith("image/")) {
  //   throw new Error("Uploaded file is not a valid image");
  // }

  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  const previousAvatarFilePath = user.avatar?.filePath;
  const fileName = `avatars/${Date.now()}-${user.userName}-${randomUUID()}`;

  const publicUrl = await uploadProfileImgToBucket(file, fileName);

  user.avatar = { filePath: fileName, url: publicUrl };

  try {
    await user.save();
  } catch (err) {
    await deleteProfileImgFromBucket(fileName);
    return next(err);
  }

  if (previousAvatarFilePath) {
    try {
      await deleteProfileImgFromBucket(previousAvatarFilePath);
    } catch (err) {
      console.warn("Failed to delete old profile image:", err);
    }
  }

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    profileImgUrl: user.avatar.url,
  } as ProfileDTO);
};

export const deleteProfileImg = async (req: UserRequest, res: Response) => {
  const user = await User.findById(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (user.avatar) {
    await deleteProfileImgFromBucket(user.avatar.filePath);
    user.avatar = undefined;
    await user.save();
  }

  res.sendStatus(204);
};
