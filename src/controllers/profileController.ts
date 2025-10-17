import { NextFunction, Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import { UserNotFoundError, CustomError } from "../utils/errors";
import User, { IUser } from "../models/User";
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

// Checck if file is there and has right format and size
// Define File name
// Upload File to bucket -> Return public url
// On success: Save new user model
// On error: Throw error

const uploadFile = (
  file: Express.Multer.File,
  fileName: string
): Promise<string> => {
  const blob = bucket.file(fileName);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype,
  });

  return new Promise((resolve, reject) => {
    blobStream.on("error", (err: any) => {
      reject(err);
    });

    blobStream.on("finish", () =>
      resolve(getPublicProfileImgUrl(bucket.name, blob.name) as string)
    );

    blobStream.end(file.buffer);
  });
};

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

  if (!req.file) {
    res.status(200).json({
      userName: user.userName,
      status: user.status,
      profileImgUrl: user.avatar?.url,
    } as ProfileDTO);
    return;
  }

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

  const handleFinish = async () => {
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
      profileImgUrl: user.avatar?.url,
    } as ProfileDTO);
  };

  blobStream.on("finish", () => {
    handleFinish().catch(next);
  });

  blobStream.end(req.file.buffer);

  res.status(200).json({
    userName: user.userName,
    status: user.status,
    profileImgUrl: user.avatar?.url,
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
