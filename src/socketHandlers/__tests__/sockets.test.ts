import { createServer } from "node:http";
import { type AddressInfo } from "node:net";

import { Server, type Socket as ServerSocket } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";

describe("web sockets", () => {
  let io: Server, serverSocket: ServerSocket, clientSocket: ClientSocket;

  beforeAll(
    () =>
      new Promise((resolve, reject) => {
        const httpServer = createServer();
        io = new Server(httpServer);
        httpServer.listen(() => {
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
      }),
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
