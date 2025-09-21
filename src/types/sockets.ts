import { Server, Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./events";

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
