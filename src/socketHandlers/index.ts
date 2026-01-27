import { defaultSocketRateLimiter, withSocketRateLimit } from "../middleware/socketRateLimit";

import {
  handleChannelMessagesSubscribe,
  handleChannelMessagesUnsubscribe,
  handleIncomingChannelMessage,
} from "./channelMessageHandlers";
import { handleJoinChat, handleLeaveChat, handleIncomingNewMessage } from "./chatHandlers";
import { handleServerSubscribe, handleServerUnsubscribe } from "./serverHandlers";

import type { TypedServer, TypedSocket } from "../types/sockets";

const onConnection = (_: TypedServer, socket: TypedSocket) => {
  const limit =
    (eventName: string) =>
    <Args extends any[]>(handler: (...args: Args) => void) =>
      socket.on(
        eventName as any,
        withSocketRateLimit(defaultSocketRateLimiter, eventName)(socket, handler),
      );

  limit("chat:join")((chatId: string, ack: any) => handleJoinChat(socket, chatId, ack));

  limit("chat:leave")((chatId: string) => handleLeaveChat(socket, chatId));

  limit("message:send")((payload: { chatId: string; text: string }, ack: any) =>
    handleIncomingNewMessage(socket, payload, ack),
  );

  limit("server:subscribe")((serverId: string, ack: any) =>
    handleServerSubscribe(socket, serverId, ack),
  );

  limit("server:unsubscribe")((serverId: string) => handleServerUnsubscribe(socket, serverId));

  limit("channelMessages:subscribe")((channelId: string, ack: any) =>
    handleChannelMessagesSubscribe(socket, channelId, ack),
  );

  limit("channelMessages:unsubscribe")((channelId: string, ack: any) =>
    handleChannelMessagesUnsubscribe(socket, channelId, ack),
  );

  limit("channelMessage:new")((payload: any, ack: any) =>
    handleIncomingChannelMessage(socket, payload, ack),
  );
};

export { onConnection };
