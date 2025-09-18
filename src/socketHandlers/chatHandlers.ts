import { Socket } from "socket.io";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { IUser } from "../models/User";
import { ERROR_STATUS, EVENT_ERROR, EVENT_SUCCESS, EVENTS } from "../types/events";
import { IMessageAPI } from "../types/sockets";

export const handleIncomingNewMessage = async (
  socket: Socket,
  payload: { chatId: string; text: string },
  callback: (data: EVENT_SUCCESS<{ message: IMessageAPI }> | EVENT_ERROR) => void
) => {
  const { chatId, text } = payload;
  try {
    if (!text) {
      callback({
        error: ERROR_STATUS["BAD_REQUEST"],
        message: "Text input is missing",
      } as EVENT_ERROR);
      return;
    }

    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName");
    const participant = chat?.participants.find(
      (p) => p.id.toString() !== socket.data.userId
    );

    if (!participant) {
      socket.emit(EVENTS["CHAT_ERROR"], "You're not part of this chat");
      return;
    }

    const newMessage = await Message.create({
      chat: chatId,
      sender: socket.data.userId,
      text,
    });

    const resMessage = (sender: "self" | "other"): IMessageAPI => ({
      text: newMessage.text,
      chatId: newMessage.chat.toString(),
      sender,
      createdAt: newMessage.createdAt.toISOString(),
      id: newMessage.id.toString(),
    });

    socket.to(chatId).emit(EVENTS["CHAT_NEW_MESSAGE"], {
      message: resMessage("other"),
    });

    callback({
      data: {
        message: resMessage("self"),
      },
      status: "OK",
    } as EVENT_SUCCESS<{
      message: IMessageAPI;
    }>);
  } catch (error) {
    console.error("Error fetching messages:", error);
    socket.emit("chat:error", "Failed to fetch chat messages");
  }
};

export const handleJoinChat = async (
  socket: Socket,
  chatId: string,
  callback: (
    data:
      | EVENT_SUCCESS<{ participant: string; messages: IMessageAPI[] }>
      | EVENT_ERROR
  ) => void
) => {
  const currentUserId = socket.data.userId as string;
  try {
    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName");

    if (chat === null) {
      callback({
        error: ERROR_STATUS["BAD_REQUEST"],
        message: "This chat doesn't exist",
      } as EVENT_ERROR);
      return;
    }

    const currentUser = chat.participants.find((p) => p.id === currentUserId);
    const userIsPartOfChat = currentUser !== undefined;

    if (!userIsPartOfChat) {
      callback({
        error: ERROR_STATUS["UNAUTHORIZED"],
        message: "You're not part of this chat",
      } as EVENT_ERROR);
      return;
    }

    const otherParticipant = chat.participants.find((p) => p.id !== currentUserId);

    if (otherParticipant === undefined) {
      callback({
        error: ERROR_STATUS["INTERNAL_ERROR"],
        message: "Other chat participant not found",
      } as EVENT_ERROR);
      return;
    }

    socket.join(chatId);

    const messages = await Message.find({ chat: chatId })
      .populate<{ sender: IUser }>("sender", "userName")
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map(
      (message) =>
        ({
          text: message.text,
          chatId: message.chat.toString(),
          sender: message.sender.id === currentUserId ? "self" : "other",
          createdAt: message.createdAt.toISOString(),
          id: message.id.toString(),
        } as IMessageAPI)
    );

    callback({
      data: {
        participant: otherParticipant.userName,
        messages: formattedMessages,
      },
      status: "OK",
    });
  } catch (error) {
    console.error("Something went wrong", { error });
    callback({
      error: ERROR_STATUS["INTERNAL_ERROR"],
      message: "Something went wrong",
    } as EVENT_ERROR);
  }
};

export const handleLeaveChat = (socket: Socket, chatId: string) => {
  socket.leave(chatId);
};
