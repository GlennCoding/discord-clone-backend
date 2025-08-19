import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { server } from "../../app";

let mongoServer;

describe("/register", () => {
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer!.stop();
  });

  it("should response with string", async () => {
    const res = await request(server).get("/").expect(200);
    expect(res.body.message).toBe("Hello wonderful world!");
    // send a request to /register api route
    // return 200 as response
    // test if DB contains new User
  });

  // it("should successfully register a new user", () => {
  //   // request(app).get
  //   // send a request to /register api route
  //   // return 200 as response
  //   // test if DB contains new User
  // });

  // it("should throw an error for a duplicate username", () => {
  //   // input same as existing user
  //   // return error message
  // });

  // it("should throw an error for a missing input", () => {
  //   // invalid input
  //   // return error message
  // });

  // it("should throw an error for a invalid password", () => {
  //   // invalid password input
  //   // return error message
  // });
});
