import { TypedServer, TypedSocket } from "../types/sockets";
import {
  handleJoinChat,
  handleLeaveChat,
  handleIncomingNewMessage,
} from "./chatHandlers";

const onConnection = (_: TypedServer, socket: TypedSocket) => {
  socket.on("chat:join", (chatId: string, ack: any) =>
    handleJoinChat(socket, chatId, ack)
  );

  socket.on("chat:leave", (chatId: string) => handleLeaveChat(socket, chatId));

  socket.on("message:send", (payload: { chatId: string; text: string }, ack) =>
    handleIncomingNewMessage(socket, payload, ack)
  );
};

export { onConnection };
