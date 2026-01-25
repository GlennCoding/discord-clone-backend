import type { ClientToServerEvents, ServerToClientEvents } from "./events";
import type { Server, Socket } from "socket.io";
import type { Socket as ClientSocket } from "socket.io-client";


export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export type TypedClientSocket = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>;

type EventParamsWithAck<T> = T extends (payload: infer P, ack: infer A) => void
  ? [payload: P, ack: A]
  : T extends (payload: infer P) => void
  ? [payload: P]
  : [];

type EventParamsWithoutAck<T> = T extends (payload: infer P) => void
  ? [payload: P]
  : [];

export type EventControllerWithAck<E extends keyof ClientToServerEvents> = (
  socket: TypedSocket,
  ...args: EventParamsWithAck<ClientToServerEvents[E]>
) => Promise<void> | void;

export type EventControllerWithoutAck<E extends keyof ClientToServerEvents> = (
  socket: TypedSocket,
  ...args: EventParamsWithoutAck<ClientToServerEvents[E]>
) => Promise<void> | void;

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

export type Ack<T> = (res: EVENT_SUCCESS<T> | EVENT_ERROR) => void;
