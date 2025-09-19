import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "./events";

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type EventParams<T> = T extends (payload: infer P, ack: infer A) => void
  ? [payload: P, ack?: A]
  : T extends (payload: infer P) => void
  ? [payload: P]
  : [];

export type EventController<E extends keyof ClientToServerEvents> = (
  socket: TypedSocket,
  ...args: EventParams<ClientToServerEvents[E]>
) => Promise<void> | void;
