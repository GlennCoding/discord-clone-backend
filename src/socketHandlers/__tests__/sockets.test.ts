/**
 * Before all:
 * 1) Create server socket
 * 2) Create client socket
 * - Wait for connection confirmation (Promise)
 *
 * After all:
 * 1) Close server & client socket
 *
 * Tests ---------
 * 1) Client send event & server receives
 * - Send event via client
 * - Server emits ("hello world back")
 */

/**
 * Connect actual io server
 *
 * Test sending a message and getting 401
 */

import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Server, type Socket as ServerSocket } from "socket.io";

describe("web sockets", () => {
  let io: Server, serverSocket: ServerSocket, clientSocket: ClientSocket;

  beforeAll(
    () =>
      new Promise((resolve, reject) => {
        const httpServer = createServer();
        io = new Server(httpServer);
        httpServer.listen(async () => {
          const port = (httpServer.address() as AddressInfo).port;
          clientSocket = ioc(`http://localhost:${port}`);

          io.on("connection", (socket) => {
            serverSocket = socket;
          });

          clientSocket.on("connect", () => {
            resolve("Connection successful");
          });

          clientSocket.on("connection_error", (e) => {
            reject(e);
          });
        });
      })
  );

  afterAll(async () => {
    await io.close();
    clientSocket.disconnect();
  });

  it("should work", () =>
    new Promise((done) => {
      if (!clientSocket || !serverSocket) {
        throw new Error("clientSocket or serverSocket is undefined");
      }

      clientSocket.on("hello", (arg) => {
        expect(arg).toBe("world");
        done(true);
      });
      serverSocket.emit("hello", "world");
    }));
});
