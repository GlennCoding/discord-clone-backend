import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PROFILE_IMAGE_FILE_SIZE_BYTES,
} from '../config/upload';
import { profileService, userService } from '../container';
import { auditHttp } from '../utils/audit';
import { UserNotFoundError, CustomError, InputMissingError } from '../utils/errors';
import { validateUploadedFile } from '../utils/fileValidation';
import { buildObjectKey } from '../utils/storage';
import { validateStatus } from '../utils/validators';

import type { UserRequest } from '../middleware/verifyJWT';
import type { ProfileDTO } from '../types/dto';
import type { NextFunction, Response } from 'express';

export const getProfile = async (req: UserRequest, res: Response) => {
  const user = await userService.findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    profileImgUrl: user.avatar?.url,
  } as ProfileDTO);
};

export const updateProfile = async (req: UserRequest, res: Response) => {
  const { status } = req.body;
  const user = await userService.findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (status === undefined) throw new CustomError(400, 'Status is missing');

  validateStatus(status);

  const updated = await userService.updateStatus(user.id, status);
  if (!updated) throw new UserNotFoundError();

  auditHttp(req, 'PROFILE_UPDATED');

  res.status(200).json({
    userName: updated.userName,
    status: updated.status,
    profileImgUrl: updated.avatar?.url,
  } as ProfileDTO);
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

  const user = await userService.findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (!file) throw new InputMissingError('File');

  const previousAvatarFilePath = user.avatar?.filePath;
  const fileName = buildObjectKey('avatars', user.userName, validatedFile.ext);

  const publicUrl = await profileService.uploadProfileImg(file, fileName, validatedFile.mime);

  let updated;
  try {
    updated = await userService.updateAvatar(user.id, { filePath: fileName, url: publicUrl });
  } catch (err) {
    await profileService.deleteProfileImg(fileName);
    return next(err);
  }

  if (!updated) throw new UserNotFoundError();

  if (previousAvatarFilePath) {
    try {
      await profileService.deleteProfileImg(previousAvatarFilePath);
    } catch (err) {
      console.warn('Failed to delete old profile image:', err);
    }
  }

  auditHttp(req, 'PROFILE_IMGAGE_UPLOADED');

  res.status(200).json({
    userName: updated.userName,
    status: updated.status,
    profileImgUrl: updated.avatar?.url,
  } as ProfileDTO);
};

export const deleteProfileImg = async (req: UserRequest, res: Response) => {
  const user = await userService.findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (user.avatar) {
    await profileService.deleteProfileImg(user.avatar.filePath);
    await userService.updateAvatar(user.id, undefined);
  }

  auditHttp(req, 'PROFILE_IMGAGE_DELETED');

  res.sendStatus(204);
};
