import { Router, Response } from "express";
import { UserRequest } from "../../middleware/verifyJWT";
import Chat from "../../models/Chat";
import mongoose from "mongoose";
import Message from "../../models/Message";

const router = Router();

router.post("/", async (req: UserRequest, res: Response) => {
  const { text, chatId } = req.body || {};

  if (!text || !chatId) {
    res.status(404).json({ message: "Text or chatId missing" });
    return;
  }

  try {
    const foundChat = await Chat.findOne({ _id: chatId });

    if (!foundChat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);

    if (!foundChat.participants.includes(userId)) {
      res.status(403).json({ message: "You're not part of this chat" });
      return;
    }

    const newMessage = await Message.create({
      chat: foundChat._id,
      sender: req.userId,
      text,
    });

    console.log(newMessage);

    res.sendStatus(201);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
