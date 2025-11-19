import {
  SendMessageInput,
  MessageDTO,
  JoinChatDTO,
  ServerDTO,
  UpdatedServerDTO,
  ChannelDTO,
  ChannelSubscribeDTO,
  ChannelMessageDTO,
  SendChannelMessageInput,
} from "./dto";
import { Ack } from "./sockets";

export interface ClientToServerEvents {
  "message:send": (
    payload: SendMessageInput,
    ack: Ack<{ message: MessageDTO }>
  ) => void;
  "chat:join": (chatId: string, ack: Ack<JoinChatDTO>) => void;
  "chat:leave": (chatId: string) => void;
  "server:subscribe": (serverId: string, ack: Ack<ServerDTO>) => void;
  "server:unsubscribe": (serverId: string) => void;
  "channelMessages:subscribe": (
    channelId: string,
    ack: Ack<ChannelSubscribeDTO>
  ) => void;
  "channelMessages:unsubscribe": (
    channelId: string,
    ack: Ack<{ success: true }>
  ) => void;
  "channelMessage:new": (
    payload: SendChannelMessageInput,
    ack: Ack<{ message: ChannelMessageDTO }>
  ) => void;
}

export type ServerToClientEvents = {
  "message:new": (message: { message: MessageDTO }) => void;
  "chat:error": (error: string) => void;
  "server:updated": (server: UpdatedServerDTO) => void;
  "server:deleted": (serverId: string) => void;
  "channel:created": (channel: ChannelDTO) => void;
  "channel:updated": (channel: ChannelDTO) => void;
  "channel:deleted": (channelId: string) => void;
  "channelMessage:new": (message: ChannelMessageDTO) => void;
  connect: () => void;
  connect_error: (e: string) => void;
};
