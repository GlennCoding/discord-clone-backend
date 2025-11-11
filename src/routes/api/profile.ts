import { Router } from "express";
import multer from "multer";
import {
  deleteProfileImg,
  getProfile,
  updateProfile,
  updateProfileImg,
} from "../../controllers/profileController";
import { asyncHandler } from "../../utils/asyncHandler";
import { MAX_PROFILE_IMAGE_FILE_SIZE_BYTES } from "../../config/upload";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_IMAGE_FILE_SIZE_BYTES,
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
