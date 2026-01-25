import { Router } from "express";

import {
  createChat,
  deleteChat,
  getAllChatsForUser,
} from "../../controllers/chatController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllChatsForUser));

router.post("/", asyncHandler(createChat));

router.delete("/:chatId", asyncHandler(deleteChat));

export default router;
