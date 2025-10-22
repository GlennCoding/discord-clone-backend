import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { saveMessageAttachment } from "../../controllers/messageController";
import multer from "multer";

const router = Router();

const MAX_FILE_SIZE_IN_MB = 7;
const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024; // 7 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

router.post(
  "/attachment",
  upload.single("attachment"),
  asyncHandler(saveMessageAttachment)
);

// router.delete("/:chatId", asyncHandler(deleteChat));

export default router;
