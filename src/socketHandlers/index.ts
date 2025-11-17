import { TypedServer, TypedSocket } from "../types/sockets";
import {
  handleJoinChat,
  handleLeaveChat,
  handleIncomingNewMessage,
} from "./chatHandlers";
import {
  handleServerSubscribe,
  handleServerUnsubscribe,
} from "./serverHandlers";

const onConnection = (_: TypedServer, socket: TypedSocket) => {
  socket.on("chat:join", (chatId: string, ack: any) =>
    handleJoinChat(socket, chatId, ack)
  );

  socket.on("chat:leave", (chatId: string) => handleLeaveChat(socket, chatId));

  socket.on("message:send", (payload: { chatId: string; text: string }, ack) =>
    handleIncomingNewMessage(socket, payload, ack)
  );

  socket.on("server:subscribe", (serverId: string, ack: any) =>
    handleServerSubscribe(socket, serverId, ack)
  );

  socket.on("server:unsubscribe", (serverId: string) =>
    handleServerUnsubscribe(socket, serverId)
  );
};

export { onConnection };
