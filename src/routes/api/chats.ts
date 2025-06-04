import { Router, Response, Request } from "express";
import { UserRequest } from "../../middleware/verifyJWT";
import User, { IUser } from "../../models/User";
import Chat from "../../models/Chat";
import mongoose from "mongoose";

const router = Router();

router.get("/", async (req: UserRequest, res: Response) => {
  console.log("test");
  try {
    const userId = req.userId;

    const chats = await Chat.find({ participants: userId })
      .populate<{ participants: IUser[] }>("participants", "userName")
      .exec();

    const result = chats.map((chat) => {
      const other = chat.participants.find((p) => p._id.toString() !== userId);

      if (!other) {
        return res.status(404).json({ message: "Chat not found" });
      }

      return {
        chatId: chat.id,
        participant: other.userName,
      };
    });

    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/", async (req: UserRequest, res: Response) => {
  // get userName from body
  const { participant } = req.body || {};

  if (!participant) {
    res.status(404).json({ message: "Participant is required" });
    return;
  }

  // check if userName isn't own and exists in DB
  try {
    const foundUser = await User.findOne({ userName: participant });

    if (!foundUser) {
      res
        .status(400)
        .json({ message: `A user with the username ${participant} doesn't exist` });
      return;
    }

    if (foundUser.id === req.userId) {
      res.status(400).json({ message: `You can't start a chat with yourself` });
      return;
    }

    // see if a chat doesn't exist already
    const chatExists = await Chat.findOne({
      participants: [req.userId, foundUser._id],
    });

    if (chatExists) {
      res.status(200).json({ chatId: chatExists.id });
      return;
    }

    // create a chat document with this user and other user
    const newChat = await Chat.create({ participants: [req.userId, foundUser._id] });

    res.status(201).json({ chatId: newChat.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/", async (req: UserRequest, res: Response) => {
  const { chatId } = req.body || {};

  if (!chatId) {
    res.status(404).json({ message: "Chat ID is required" });
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

    await foundChat.deleteOne();

    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
