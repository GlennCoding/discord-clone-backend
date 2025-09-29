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

      const blob = bucket.file(Date.now() + "-" + req.file.originalname);

      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: req.file.mimetype,
      });

      blobStream.on("error", (err) => next(err));

      blobStream.on("finish", async () => {
        const publicUrl = getPublicUrl(bucket.name, blob.name);

        // Save profileImgUrl to user model
        const user = await User.findById(req.userId as string);
        if (!user) throw new Error(`User with ${req.userId} not found`);
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

export default router;

/**
 * TODOs:
 *
 * - Test it in production
 * - Q: How to handle similar names of avatars
 * - Q: How to save avatar with user name + unique ID
 *
 */
