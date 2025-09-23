import { Router } from "express";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = Router();

router.post("/picture", upload.single("profilePicture"), (req, res, next) => {
  console.log(req.body);
});

export default router;
