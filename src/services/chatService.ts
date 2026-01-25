import mongoose from "mongoose";

import Chat from "../models/Chat";
import Message from "../models/ChatMessage";

import type { IChat } from "../models/Chat";
import type { IUser } from "../models/User";
import type { ChatDTO } from "../types/dto";

export const getUserChats = async (userId: string) => {
  const chats = await Chat.find({ participants: userId })
    .populate<{ participants: IUser[] }>("participants", "userName avatar")
    .exec();

  return chats;
};

export const formatUserChats = (chats: IChat[], userId: string): ChatDTO[] => {
  return chats.map((chat) => {
    const other = chat.participants.find((p) => p._id.toString() !== userId);

    if (!other) {
      throw Error(`Chat ${chat._id} doesn't contain other partipants`);
    }

    const avatarUrl = (other as IUser).avatar && (other as IUser).avatar!.url;

    return {
      chatId: chat.id,
      participant: (other as IUser).userName,
      participantAvatarUrl: avatarUrl,
    };
  });
};

export const findChatBetweenTwoUsers = (
  user1Id: string,
  user2Id: string
): Promise<IChat | null> => {
  return Chat.findOne({
    participants: [user1Id, user2Id],
  });
};

export const findChatWithChatId = (chatId: string): Promise<IChat | null> => {
  return Chat.findOne({ _id: chatId });
};

export const createChat = (user1Id: string, user2Id: string): Promise<IChat> => {
  return Chat.create({ participants: [user1Id, user2Id] });
};

export const checkIfUserIdPartOfChat = (chat: IChat, userId: string) => {
  const userIdAsObjectId = new mongoose.Types.ObjectId(userId);
  return chat.participants.includes(userIdAsObjectId);
};

export const deleteChat = async (chatId: string) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Delete messages belonging to the chat
      await Message.deleteMany({ chat: chatId }, { session });

      // 2. Delete the chat itself
      await Chat.findByIdAndDelete(chatId, { session });
    });
  } catch (err) {
    console.error("Transaction failed:", err);
    throw err;
  } finally {
    await session.endSession();
  }
};
