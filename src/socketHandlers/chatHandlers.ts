import { chatMessageRepo, chatService } from "../container";
import { ERROR_STATUS, EVENT_ERROR } from "../types/sockets";
import { toMessageDTOWithSignedUrls } from "../utils/dtos/messageDTO";
import { fileStorage } from "../container";

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
      ack(new EVENT_ERROR({ error: ERROR_STATUS["BAD_REQUEST"], message: "Text input is missing" }));
      return;
    }

    const chat = await chatService.findChatWithChatId(chatId);

    if (!chat || !chatService.checkIfUserIdPartOfChat(chat, currentUserId)) {
      ack({ error: ERROR_STATUS["BAD_REQUEST"], message: "You're not part of this chat" } as EVENT_ERROR);
      return;
    }

    const newMessage = await chatMessageRepo.create({
      chatId,
      senderId: currentUserId,
      text,
      attachments: [],
    });

    const messageDTO = toMessageDTO(newMessage);

    socket.to(chatId).emit("message:new", { message: messageDTO });
    ack({ status: "OK", data: { message: messageDTO } });
  } catch (error) {
    console.error("Error handling new message:", error);
    socket.emit("chat:error", "Failed to process message");
  }
};

export const handleJoinChat: EventControllerWithAck<"chat:join"> = async (socket, chatId, ack) => {
  const currentUserId = socket.data.userId as string;

  try {
    const chat = await chatService.findChatWithChatId(chatId);

    if (!chat) {
      ack({ error: ERROR_STATUS["BAD_REQUEST"], message: "This chat doesn't exist" } as EVENT_ERROR);
      return;
    }

    if (!chatService.checkIfUserIdPartOfChat(chat, currentUserId)) {
      ack({ error: ERROR_STATUS["UNAUTHORIZED"], message: "You're not part of this chat" } as EVENT_ERROR);
      return;
    }

    const otherParticipantId = chat.participantIds.find((id) => id !== currentUserId);

    if (!otherParticipantId) {
      ack({ error: ERROR_STATUS["INTERNAL_ERROR"], message: "Other chat participant not found" } as EVENT_ERROR);
      return;
    }

    void socket.join(chatId);

    const [messages, otherUser] = await Promise.all([
      chatMessageRepo.findByChatId(chatId),
      chatService.findParticipant(otherParticipantId),
    ]);

    const messagesDTO = await Promise.all(
      messages.map((m) => toMessageDTOWithSignedUrls(m, fileStorage)),
    );

    ack({
      data: {
        participant: {
          username: otherUser?.userName ?? "",
          avatarUrl: otherUser?.avatar?.url,
        },
        messages: messages.map(toMessageDTO),
      },
      status: "OK",
    });
  } catch (error) {
    console.error("Something went wrong", { error });
    ack({ error: ERROR_STATUS["INTERNAL_ERROR"], message: "Something went wrong" } as EVENT_ERROR);
  }
};

export const handleLeaveChat: EventControllerWithoutAck<"chat:leave"> = (socket, chatId) => {
  void socket.leave(chatId);
};
