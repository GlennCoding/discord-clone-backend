import { NextFunction, Response, Router } from "express";
import multer from "multer";
import { bucket } from "../../config/storage";
import User from "../../models/User";
import { UserRequest } from "../../middleware/verifyJWT";
import {
  CustomError,
  InputMissingError,
  UserNotFoundError,
} from "../../utils/errors";
import { env } from "../../utils/env";
import { ProfileDTO } from "../../types/dto";

const MAX_FILE_SIZE_IN_MB = 7;
const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024; // 7 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const router = Router();

const getPublicUrl = (buketName: string, blobName: string) => {
  const encodedBlobName = encodeURIComponent(blobName);

  const localUrl = `${env.GCS_PUBLIC_URL}/storage/v1/b/${buketName}/o/${encodedBlobName}?alt=media`;
  const productionUrl = `${env.GCS_PUBLIC_URL}/${buketName}/${encodedBlobName}`;

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return localUrl;

  return productionUrl;
};

router.post(
  "/picture",
  upload.single("profilePicture"),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new CustomError(400, "File is missing");

      if (!req.file.mimetype.startsWith("image/"))
        throw new CustomError(400, "File must be an image");

      if (req.file.size >= MAX_FILE_SIZE)
        throw new CustomError(
          400,
          `Image must be smaller than ${MAX_FILE_SIZE_IN_MB}MB`
        );

      const user = await User.findById(req.userId as string);
      if (!user) throw new UserNotFoundError();

      const blob = bucket.file(Date.now() + "-" + user.userName);

      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: req.file.mimetype,
      });

      blobStream.on("error", (err) => next(err));

      blobStream.on("finish", async () => {
        const publicUrl = getPublicUrl(bucket.name, blob.name);

        user.avatar = {
          filePath: blob.name,
          url: publicUrl,
        };

        await user.save();

        res.status(200).json({ url: publicUrl });
      });

      // Write file data to the stream
      blobStream.end(req.file.buffer);
    } catch (e) {
      console.log(e);
      res.status(500).json(e);
    }
  }
);

router.delete(
  "/picture",
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.userId as string);
      if (!user) throw new UserNotFoundError();

      if (user.avatar) {
        await bucket.file(user.avatar.filePath).delete();
      }

      user.avatar = undefined;
      await user.save();

      res.sendStatus(204);
    } catch (e) {
      console.log(e);
      res.status(500).json(e);
    }
  }
);

router.get("/", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId as string);
    if (!user) throw new UserNotFoundError();

    res.status(200).json({
      userName: user.userName,
      status: user.status,
      avatar: user.avatar,
    } as ProfileDTO);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

router.post("/", async (req: UserRequest, res: Response, next: NextFunction) => {
  const MAX_STATUS_LENGTH = 200;

  try {
    const { status } = req.body;

    if (!status) throw new InputMissingError("status");

    if (status.length >= MAX_STATUS_LENGTH)
      throw new CustomError(400, "Status length should not exceed 200 chars");

    const user = await User.findById(req.userId as string);
    if (!user) throw new UserNotFoundError();

    user.status = status;
    await user.save();

    res.status(200).json({
      userName: user.userName,
      status: user.status,
      avatar: user.avatar,
    } as ProfileDTO);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

export default router;
