export enum EVENTS {
  CHAT_ERROR = "chat:error",
  CHAT_NEW_MESSAGE = "chat:newMessage",
  CHAT_MESSAGE = "chat:message",
  CHAT_LEAVE = "chat:leave",
  CHAT_JOIN = "chat:join",
  CHAT_MESSAGES = "chat:messages",
  UNAUTHORIZED = "unauthorized",
}

export enum ERROR_STATUS {
  UNAUTHORIZED = "Unauthorized",
  BAD_REQUEST = "Bad request",
  INTERNAL_ERROR = "Internal error",
}

export interface EVENT_ERROR {
  error: ERROR_STATUS;
  message: String;
}

export type EVENT_SUCCESS<T> = {
  status: "OK";
  data: T;
};
