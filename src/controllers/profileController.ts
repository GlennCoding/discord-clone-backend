
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PROFILE_IMAGE_FILE_SIZE_BYTES,
} from "../config/upload";
import User from "../models/User";
import {
  deleteProfileImgFromBucket,
  uploadProfileImgToBucket,
} from "../services/profileService";
import { findUserWithUserId } from "../services/userService";
import { auditHttp } from "../utils/audit";
import { UserNotFoundError, CustomError, InputMissingError } from "../utils/errors";
import { validateUploadedFile } from "../utils/fileValidation";
import { buildObjectKey } from "../utils/storage";
import { validateStatus } from "../utils/validators";

import type { UserRequest } from "../middleware/verifyJWT";
import type { ProfileDTO } from "../types/dto";
import type { NextFunction, Response } from "express";

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

  auditHttp(req, "PROFILE_UPDATED");

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
  next: NextFunction,
) => {
  const { file } = req;

  const validatedFile = await validateUploadedFile(file, {
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    maxFileSizeBytes: MAX_PROFILE_IMAGE_FILE_SIZE_BYTES,
  });

  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  const previousAvatarFilePath = user.avatar?.filePath;
  const fileName = buildObjectKey("avatars", user.userName, validatedFile.ext);

  if (!file) throw new InputMissingError("File");

  const publicUrl = await uploadProfileImgToBucket(
    file,
    fileName,
    validatedFile.mime,
  );

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

  auditHttp(req, "PROFILE_IMGAGE_UPLOADED");

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

  auditHttp(req, "PROFILE_IMGAGE_DELETED");

  res.sendStatus(204);
};
