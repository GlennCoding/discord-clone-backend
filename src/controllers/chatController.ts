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
import {
  CantStartChatWithOneselfError,
  ChatNotFoundError,
  UserNotPartOfChatError,
  InputMissingError,
  UserNotFoundError,
} from "../utils/errors";

export const getAllChatsForUser = async (req: UserRequest, res: Response) => {
  const userId = req.userId;

  const chats = await getUserChats(userId as string);

  const formattedChats = formatUserChats(chats, userId!);

  res.status(200).json(formattedChats);
};

export const createChat = async (req: UserRequest, res: Response) => {
  const { participant } = req.body || {};

  if (!participant) return new InputMissingError("Participant");

  const otherUser = await findUserWithUserName(participant);

  if (!otherUser) return new UserNotFoundError(participant);

  if (otherUser.id === req.userId) return new CantStartChatWithOneselfError();

  const chat = await findChatBetweenTwoUsers(req.userId as string, otherUser.id);

  if (chat !== null) {
    res.status(200).json({ chatId: chat.id });
    return;
  }

  const newChat = await createChatService(req.userId as string, otherUser.id!);

  res.status(201).json({ chatId: newChat.id });
};

export const deleteChat = async (req: UserRequest, res: Response) => {
  const { chatId } = req.params || {};

  if (!chatId) return new InputMissingError("Chat ID");

  const chat = await findChatWithChatId(chatId);

  if (!chat) return new ChatNotFoundError();

  const userIsPartOfChat = checkIfUserIdPartOfChat(chat, req.userId as string);

  if (!userIsPartOfChat) return new UserNotPartOfChatError();

  await deleteChatService(chat);

  res.sendStatus(204);
};
