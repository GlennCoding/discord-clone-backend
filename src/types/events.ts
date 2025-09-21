export class EVENT_ERROR {
  constructor({ error, message }: { error: ERROR_STATUS; message: string }) {
    this.error = error;
    this.message = message;
  }
}

export interface MessageDTO {
  text: string;
  chatId: string;
  sender: "self" | "other";
  createdAt: string;
  id: string;
}

export interface ChatDTO {
  chatId: string;
  participant: string;
}

export interface JoinChatResponse {
  participant: string;
  messages: MessageDTO[];
}

export interface SendMessagePayload {
  chatId: string;
  text: string;
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
    payload: SendMessagePayload,
    ack: Ack<{ message: MessageDTO }>
  ) => void;
  "chat:join": (chatId: string, ack: Ack<JoinChatResponse>) => void;
  "chat:leave": (chatId: string) => void;
}

export type ServerToClientEvents = {
  "message:new": (message: { message: MessageDTO }) => void;
  "chat:error": (error: string) => void;
  connect: () => void;
  connect_error: (e: string) => void;
};
