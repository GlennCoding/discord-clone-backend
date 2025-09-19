import Message from "../models/Message";
import Chat from "../models/Chat";
import { IUser } from "../models/User";
import { ERROR_STATUS, EVENT_ERROR } from "../types/events";
import { MessageDTO } from "../types/events";
import { EventController } from "../types/sockets";

export const handleIncomingNewMessage: EventController<"message:send"> = async (
  socket,
  payload,
  ack
) => {
  const { chatId, text } = payload;
  try {
    if (!text) {
      ack({
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
      ack({
        error: ERROR_STATUS["BAD_REQUEST"],
        message: "You're not part of this chat",
      } as EVENT_ERROR);
      return;
    }

    const newMessage = await Message.create({
      chat: chatId,
      sender: socket.data.userId,
      text,
    });

    const formatMessage = (sender: "self" | "other"): MessageDTO => ({
      text: newMessage.text,
      chatId: newMessage.chat.toString(),
      sender,
      createdAt: newMessage.createdAt.toISOString(),
      id: newMessage.id.toString(),
    });

    socket.to(chatId).emit("message:new", {
      message: formatMessage("other"),
    });

    ack({
      status: "OK",
      data: {
        message: formatMessage("self"),
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    socket.emit("chat:error", "Failed to fetch chat messages");
  }
};

export const handleJoinChat: EventController<"chat:join"> = async (
  socket,
  chatId,
  ack
) => {
  const currentUserId = socket.data.userId as string;
  try {
    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName");

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
        } as MessageDTO)
    );

    ack({
      data: {
        participant: otherParticipant.userName,
        messages: formattedMessages,
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

export const handleLeaveChat: EventController<"chat:leave"> = (socket, chatId) => {
  socket.leave(chatId);
};
