import mongoose from "mongoose";
import Chat, { IChat } from "../models/Chat";
import { IUser } from "../models/User";
import Message from "../models/ChatMessage";
import { ChatDTO } from "../types/dto";

export const getUserChats = async (userId: string) => {
  const chats = await Chat.find({ participants: userId })
    .populate<{ participants: IUser[] }>("participants", "userName")
    .exec();

  return chats;
};

export const formatUserChats = (chats: IChat[], userId: string): ChatDTO[] => {
  return chats.map((chat) => {
    const other = chat.participants.find((p) => p._id.toString() !== userId);

    if (!other) {
      throw Error(`Chat ${chat._id} doesn't contain other partipants`);
    }

    return {
      chatId: chat.id,
      participant: (other as IUser).userName,
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

export const deleteChat = async (chat: IChat) => {
  await Message.deleteMany({ chat: chat._id });
  await chat.deleteOne();
};
