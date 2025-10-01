import request from "supertest";
import User from "../../../models/User";
import { setupMongoDB, teardownMongoDB } from "../../../__tests__/setup";

const user1Data = { userName: "John", password: "Cena" };

beforeAll(async () => {
  await setupMongoDB();
});

afterAll(async () => {
  await teardownMongoDB();
});

describe("/register", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("can get user profile data", async () => {});
  it("can update user status", async () => {});
  it("should throw an error when user status is too long", async () => {});
  it("can upload a user profile image", async () => {});
  it("should throw an error when image size is too large", async () => {});
  it("can delete a user profile image", async () => {});
});
