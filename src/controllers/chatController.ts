import { Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import {
  findChatBetweenTwoUsers,
  formatUserChats,
  getUserChats,
  createChat as createChatService,
  findChatWithChatId,
  checkIfUserIdPartOfChat,
  deleteChat as deleteChatService,
} from "../services/chatService";
import { findUserWithUserName } from "../services/userService";

export const getAllChatsForUser = async (req: UserRequest, res: Response) => {
  try {
    const userId = req.userId;

    const chats = await getUserChats(userId as string);

    const formattedChats = formatUserChats(chats, userId!);

    res.status(200).json(formattedChats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
};

export const createChat = async (req: UserRequest, res: Response) => {
  const { participant } = req.body || {};

  if (!participant) {
    res.status(404).json({ message: "Participant is required" });
    return;
  }

  try {
    const otherUser = await findUserWithUserName(participant);

    if (!otherUser) {
      res
        .status(400)
        .json({ error: `A user with the username ${participant} doesn't exist` });
      return;
    }

    if (otherUser.id === req.userId) {
      res.status(400).json({ error: "You can't start a chat with yourself" });
      return;
    }

    const chat = await findChatBetweenTwoUsers(req.userId as string, otherUser.id);

    if (chat !== null) {
      res.status(200).json({ chatId: chat.id });
      return;
    }

    const newChat = await createChatService(req.userId as string, otherUser.id!);

    res.status(201).json({ chatId: newChat.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
};

export const deleteChat = async (req: UserRequest, res: Response) => {
  const { chatId } = req.params || {};

  if (!chatId) {
    res.status(404).json({ message: "Chat ID is required" });
    return;
  }

  try {
    const chat = await findChatWithChatId(chatId);

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    const userIsPartOfChat = checkIfUserIdPartOfChat(chat, req.userId as string);

    if (!userIsPartOfChat) {
      res.status(403).json({ message: "You're not part of this chat" });
      return;
    }

    await deleteChatService(chat);

    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
};
