import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { saveMessageAttachment } from "../../controllers/messageController";

const router = Router();

router.post("/:chatId", asyncHandler(saveMessageAttachment));

// router.delete("/:chatId", asyncHandler(deleteChat));

export default router;
