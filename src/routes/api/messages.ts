import { Router } from "express";
import multer from "multer";

import { MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES } from "../../config/upload";
import {
  deleteMessageAttachment,
  saveMessageAttachment,
} from "../../controllers/messageController";
import { uploadMessageAttachmentLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES,
  },
});

router.post(
  "/attachment",
  uploadMessageAttachmentLimiter,
  upload.single("attachment"),
  asyncHandler(saveMessageAttachment),
);

router.delete("/attachment", asyncHandler(deleteMessageAttachment));

export default router;
