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
import {
  handleChannelMessagesSubscribe,
  handleChannelMessagesUnsubscribe,
  handleIncomingChannelMessage,
} from "./channelMessageHandlers";

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

  socket.on("channelMessages:subscribe", (channelId: string, ack: any) =>
    handleChannelMessagesSubscribe(socket, channelId, ack)
  );

  socket.on("channelMessages:unsubscribe", (channelId: string, ack: any) =>
    handleChannelMessagesUnsubscribe(socket, channelId, ack)
  );

  socket.on("channelMessage:new", (payload, ack) =>
    handleIncomingChannelMessage(socket, payload, ack)
  );
};

export { onConnection };
