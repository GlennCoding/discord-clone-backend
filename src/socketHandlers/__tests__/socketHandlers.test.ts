/**
 * First: Connect server & client socket (beforeAll)
 * 1) Get a token
 * - /register & /login via super-test
 * 2) connect server from app with token
 *
 * After all:
 * - close server & client socket
 *
 * Test (should work):
 * - Random test -> Check beforeAll
 *
 */

import { type AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { type Socket as ServerSocket } from "socket.io";
import { server, io, app } from "../../app";
import request from "supertest";
import { setupMongoDB, teardownMongoDB } from "../../__tests__/setup";
import User from "../../models/User";

let token: string;
const userData = { userName: "John", password: "Cena" };

beforeAll(async () => {
  await setupMongoDB();
  await request(app).post("/register").send(userData);
  const loginRes = await request(app).post("/login").send(userData);
  token = loginRes.body.token;
});

afterAll(async () => {
  await teardownMongoDB();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("web sockets", () => {
  let serverSocket: ServerSocket, clientSocket: ClientSocket;

  beforeAll(
    () =>
      new Promise((resolve, reject) => {
        server;

        server.listen(async () => {
          const port = (server.address() as AddressInfo).port;
          clientSocket = ioc(`http://localhost:${port}`, {
            auth: { token },
            reconnectionAttempts: 5,
          });

          io.on("connection", (socket) => {
            serverSocket = socket;
          });

          clientSocket.on("connect", () => {
            resolve("Connection successful");
          });

          clientSocket.on("connect_error", (e) => {
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

  // it("should send a message", () => new Promise((done) => {}));
});
