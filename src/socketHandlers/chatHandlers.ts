import Chat from "../models/Chat";
import Message from "../models/ChatMessage";
import { ERROR_STATUS, EVENT_ERROR } from "../types/sockets";
import { toMessageDTO } from "../utils/dtos/messageDTO";

import type { IUser } from "../models/User";
import type { EventControllerWithAck, EventControllerWithoutAck } from "../types/sockets";

export const handleIncomingNewMessage: EventControllerWithAck<"message:send"> = async (
  socket,
  payload,
  ack,
) => {
  const currentUserId = socket.data.userId as string;

  const { chatId, text } = payload;
  try {
    if (!text) {
      ack(
        new EVENT_ERROR({
          error: ERROR_STATUS["BAD_REQUEST"],
          message: "Text input is missing",
        }),
      );
      return;
    }

    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName");
    const participant = chat?.participants.find((p) => p.id.toString() !== socket.data.userId);

    if (!participant) {
      ack({
        error: ERROR_STATUS["BAD_REQUEST"],
        message: "You're not part of this chat",
      } as EVENT_ERROR);
      return;
    }

    const newMessage = await Message.create({
      chat: chatId,
      sender: currentUserId,
      text,
    });

    const populatedMessage = await newMessage.populate([
      {
        path: "sender",
        select: "userName avatar",
      },
      {
        path: "chat",
        select: "_id",
      },
    ]);

    const messageDTO = toMessageDTO(populatedMessage);

    socket.to(chatId).emit("message:new", {
      message: messageDTO,
    });

    ack({
      status: "OK",
      data: {
        message: messageDTO,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    socket.emit("chat:error", "Failed to fetch chat messages");
  }
};

export const handleJoinChat: EventControllerWithAck<"chat:join"> = async (socket, chatId, ack) => {
  const currentUserId = socket.data.userId as string;
  try {
    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName avatar");

    if (chat === null) {
      ack({
        error: ERROR_STATUS["BAD_REQUEST"],
        message: "This chat doesn't exist",
      } as EVENT_ERROR);
      return;
    }

    const currentUser = chat.participants.find((p) => p.id === currentUserId);
    const userIsPartOfChat = currentUser !== undefined;

    if (!userIsPartOfChat) {
      ack({
        error: ERROR_STATUS["UNAUTHORIZED"],
        message: "You're not part of this chat",
      } as EVENT_ERROR);
      return;
    }

    const otherParticipant = chat.participants.find((p) => p.id !== currentUserId);

    if (otherParticipant === undefined) {
      ack({
        error: ERROR_STATUS["INTERNAL_ERROR"],
        message: "Other chat participant not found",
      } as EVENT_ERROR);
      return;
    }

    void socket.join(chatId);

    const messages = await Message.find({ chat: chatId })
      .populate<{ sender: IUser }>("sender", "userName avatar")
      .sort({ createdAt: 1 });

    ack({
      data: {
        participant: {
          username: otherParticipant.userName,
          avatarUrl: otherParticipant.avatar?.url,
        },
        messages: messages.map((m) => toMessageDTO(m)),
      },
      status: "OK",
    });
  } catch (error) {
    console.error("Something went wrong", { error });
    ack({
      error: ERROR_STATUS["INTERNAL_ERROR"],
      message: "Something went wrong",
    } as EVENT_ERROR);
  }
};

export const handleLeaveChat: EventControllerWithoutAck<"chat:leave"> = (socket, chatId) => {
  void socket.leave(chatId);
};
