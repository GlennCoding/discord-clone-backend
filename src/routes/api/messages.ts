import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  deleteMessageAttachement,
  saveMessageAttachment,
} from "../../controllers/messageController";
import multer from "multer";
import { MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES } from "../../config/upload";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES,
  },
});

router.post(
  "/attachment",
  upload.single("attachment"),
  asyncHandler(saveMessageAttachment)
);

router.delete("/attachment", asyncHandler(deleteMessageAttachement));

export default router;
