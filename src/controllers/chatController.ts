import { chatService, userService } from '../container';
import { auditHttp } from '../utils/audit';
import {
  CantStartChatWithOneselfError,
  ChatNotFoundError,
  InputMissingError,
  ParamsMissingError,
  UserNotFoundError,
  UserNotPartOfChatError,
} from '../utils/errors';

import type { UserRequest } from '../middleware/verifyJWT';
import type { Response } from 'express';

export const getAllChatsForUser = async (req: UserRequest, res: Response) => {
  const chats = await chatService.getUserChats(req.userId as string);
  const formattedChats = await chatService.formatUserChats(chats, req.userId as string);
  res.status(200).json(formattedChats);
};

export const createChat = async (req: UserRequest, res: Response) => {
  const { participant } = req.body || {};

  if (!participant) throw new InputMissingError('Participant');

  const otherUser = await userService.findUserWithUserName(participant);
  if (!otherUser) throw new UserNotFoundError(participant);

  if (otherUser.id === req.userId) throw new CantStartChatWithOneselfError();

  const chat = await chatService.findChatBetweenTwoUsers(req.userId as string, otherUser.id);
  if (chat !== null) {
    res.status(200).json({ chatId: chat.id });
    return;
  }

  const newChat = await chatService.createChat(req.userId as string, otherUser.id);
  res.status(201).json({ chatId: newChat.id });
};

export const deleteChat = async (req: UserRequest, res: Response) => {
  const { chatId } = req.params || {};

  if (!chatId) throw new ParamsMissingError('Chat ID');

  const chat = await chatService.findChatWithChatId(chatId);
  if (!chat) throw new ChatNotFoundError();

  if (!chatService.checkIfUserIdPartOfChat(chat, req.userId as string))
    throw new UserNotPartOfChatError();

  await chatService.deleteChat(chat.id);

  auditHttp(req, 'CHAT_DELETED', { directChatId: chatId });

  res.sendStatus(204);
};
