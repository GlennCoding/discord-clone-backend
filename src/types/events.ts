import {
  SendMessageInput,
  MessageDTO,
  JoinChatDTO,
  ServerDTO,
  UpdatedServerDTO,
  ChannelDTO,
} from "./dto";

export class EVENT_ERROR {
  constructor({ error, message }: { error: ERROR_STATUS; message: string }) {
    this.error = error;
    this.message = message;
  }
}

export enum ERROR_STATUS {
  UNAUTHORIZED = "Unauthorized",
  BAD_REQUEST = "Bad request",
  INTERNAL_ERROR = "Internal error",
}

export interface EVENT_ERROR {
  error: ERROR_STATUS;
  message: string;
}

export interface EVENT_SUCCESS<T> {
  status: "OK";
  data: T;
}

type Ack<T> = (res: EVENT_SUCCESS<T> | EVENT_ERROR) => void;

export interface ClientToServerEvents {
  "message:send": (
    payload: SendMessageInput,
    ack: Ack<{ message: MessageDTO }>
  ) => void;
  "chat:join": (chatId: string, ack: Ack<JoinChatDTO>) => void;
  "chat:leave": (chatId: string) => void;
  "server:subscribe": (serverId: string, ack: Ack<ServerDTO>) => void;
  "server:unsubscribe": (serverId: string) => void;
}

export type ServerToClientEvents = {
  "message:new": (message: { message: MessageDTO }) => void;
  "chat:error": (error: string) => void;
  "server:updated": (server: UpdatedServerDTO) => void;
  "server:deleted": (serverId: string) => void;
  "channel:created": (channel: ChannelDTO) => void;
  "channel:updated": (channel: ChannelDTO) => void;
  "channel:deleted": (channelId: string) => void;
  connect: () => void;
  connect_error: (e: string) => void;
};
