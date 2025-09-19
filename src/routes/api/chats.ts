import { Router } from "express";
import {
  createChat,
  deleteChat,
  getAllChatsForUser,
} from "../../controllers/chatController";

const router = Router();

router.get("/", getAllChatsForUser);

router.post("/", createChat);

router.delete("/:chatId", deleteChat);

export default router;
