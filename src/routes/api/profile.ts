import { NextFunction, Response, Router } from "express";
import multer from "multer";
import { bucket } from "../../config/storage";
import User from "../../models/User";
import { UserRequest } from "../../middleware/verifyJWT";
import { UserNotFoundError } from "../../utils/errors";
import { env } from "../../utils/env";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for example
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
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const user = await User.findById(req.userId as string);
      if (!user) throw new Error(`User with ${req.userId} not found`);

      const blob = bucket.file(Date.now() + "-" + user.userName);

      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: req.file.mimetype,
      });

      blobStream.on("error", (err) => next(err));

      blobStream.on("finish", async () => {
        const publicUrl = getPublicUrl(bucket.name, blob.name);

        // Save profileImgUrl to user model
        user.profileImgUrl = publicUrl;
        await user.save();

        console.log(publicUrl);

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
      if (!user) throw new Error(`User with ${req.userId} not found`);

      user.profileImgUrl = undefined;
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
    if (!user) throw new Error(`User with ${req.userId} not found`);

    res
      .status(200)
      .json({ userName: user.userName, profileImgUrl: user.profileImgUrl });
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

export default router;

/**
 * TODOs:
 *
 * What to include in profile
 * - Change avatar img
 * - Delete avatar img
 *
 * - Delete Acc
 *
 * - Get user data: username + Avatar
 *
 */
