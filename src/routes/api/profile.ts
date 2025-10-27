import { Router } from "express";
import multer from "multer";
import {
  deleteProfileImg,
  getProfile,
  updateProfile,
  updateProfileImg,
} from "../../controllers/profileController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

const MAX_FILE_SIZE_IN_MB = 7;
const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024; // 7 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

router.get("/", asyncHandler(getProfile));
router.put("/", asyncHandler(updateProfile));
router.put(
  "/avatar",
  upload.single("profilePicture"),
  asyncHandler(updateProfileImg)
);
router.delete("/avatar", asyncHandler(deleteProfileImg));

export default router;
