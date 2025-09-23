import { Router } from "express";
import multer from "multer";
import { bucket } from "../../config/storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for example
  },
});

const router = Router();

router.post("/picture", upload.single("profilePicture"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false, // easier for emulator
      contentType: req.file.mimetype,
    });

    blobStream.on("error", (err) => next(err));

    blobStream.on("finish", () => {
      const publicUrl = `${
        process.env.GCS_PUBLIC_URL || "http://localhost:4443"
      }/storage/v1/b/${bucket.name}/o/${encodeURIComponent(blob.name)}?alt=media`;
      res.status(200).json({ url: publicUrl });
    });

    blobStream.end(req.file.buffer);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

export default router;
