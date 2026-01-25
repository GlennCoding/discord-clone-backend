import { type AddressInfo } from "node:net";
import { promisify } from "node:util";

import { io as ioc } from "socket.io-client";

import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { io, server } from "../../../app";

import type { TypedClientSocket } from "../../../types/sockets";

let startPromise: Promise<void> | null = null;
let activeSuites = 0;
let port: number | null = null;

const ensureServerStarted = async () => {
  if (!startPromise) {
    startPromise = promisify(server.listen)
      .call(server)
      .then(() => {
        port = (server.address() as AddressInfo).port;
      });
  }
  await startPromise;
};

export const acquireSocketServer = async (): Promise<number> => {
  activeSuites += 1;
  await ensureServerStarted();
  if (port === null) {
    throw new Error("Socket server port unavailable");
  }
  return port;
};

export const releaseSocketServer = async () => {
  activeSuites = Math.max(0, activeSuites - 1);
  if (activeSuites === 0 && startPromise) {
    await io.close();
    await new Promise((resolve) => server.close(resolve));
    startPromise = null;
    port = null;
  }
};

const requirePort = () => {
  if (port === null) throw new Error("Socket server not started");
  return port;
};

export const createTestSocket = (token: string): TypedClientSocket =>
  ioc(`http://localhost:${requirePort()}`, {
    extraHeaders: { cookie: buildAccessTokenCookie(token) },
    reconnectionAttempts: 5,
    transports: ["websocket"],
    withCredentials: true,
  });

export const connectClientSocket = (socket: TypedClientSocket) =>
  new Promise((resolve, reject) => {
    socket.on("connect", () => resolve("connected"));
    socket.on("connect_error", (e) => reject(e));
  });

export const connectSocketWithToken = async (token: string) => {
  const socket = createTestSocket(token);
  await connectClientSocket(socket);
  return socket;
};

export const waitForEvent = <T>(socket: TypedClientSocket, event: string) =>
  new Promise<T>((resolve) => {
    socket.once(event as any, resolve);
  });
