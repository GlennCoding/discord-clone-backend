import { Server, Socket } from "socket.io";
import { EVENTS } from "../types/events";
import {
  handleJoinChat,
  handleLeaveChat,
  handleIncomingNewMessage,
} from "./chatHandlers";

const onConnection = (io: Server, socket: Socket) => {
  socket.on(EVENTS["CHAT_JOIN"], (chatId: string, callback) =>
    handleJoinChat(socket, chatId, callback)
  );

  socket.on(EVENTS["CHAT_LEAVE"], (chatId: string) =>
    handleLeaveChat(socket, chatId)
  );

  socket.on(
    EVENTS["CHAT_NEW_MESSAGE"],
    (payload: { chatId: string; text: string }, callback) =>
      handleIncomingNewMessage(socket, payload, callback)
  );
};

export { onConnection };
