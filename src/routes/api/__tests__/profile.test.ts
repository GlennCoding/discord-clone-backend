import path from "path";

import request from "supertest";

import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { app } from "../../../app";
import { bucket } from "../../../config/storage";
import User from "../../../models/User";
import { issueAccessToken } from "../../../services/authService";

import type { IUser } from "../../../models/User";

const userData = { userName: "user", password: "pwd" };
let user: IUser;

vi.mock("../../../config/storage", () => {
  const finishHandlers: Function[] = [];

  const mockStream = {
    on: vi.fn((event, handler) => {
      if (event === "finish") finishHandlers.push(handler);
      return mockStream;
    }),
    end: vi.fn(() => {
      // simulate async "finish" event
      setTimeout(() => {
        finishHandlers.forEach((h) => h());
      }, 10);
    }),
  };

  return {
    bucket: {
      name: "mock-bucket",
      file: vi.fn(() => ({
        name: "mock-image",
        createWriteStream: vi.fn(() => mockStream),
        delete: vi.fn(async () => {}), // needed for delete test
      })),
    },
  };
});

beforeEach(async () => {
  await User.deleteMany({});

  user = await User.create({
    userName: userData.userName,
    password: userData.password,
  });

  await user.save();
});

describe("/profile", () => {
  it("can get user profile data", async () => {
    if (!user) throw new Error("User not defined");
    const status = "status";
    user.status = status;
    await user.save();

    const token = issueAccessToken(user);

    const res = await request(app)
      .get("/profile")
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(res.status).toBe(200);
    expect(res.body.userName).toBe(userData.userName);
    expect(res.body.status).toBe(status);
  });

  it("can update user status", async () => {
    if (!user) throw new Error("User not defined");
    const token = issueAccessToken(user);

    const newStatus = "new status";

    const res = await request(app)
      .put("/profile")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .send({ status: newStatus });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(newStatus);
  });

  it("can set a user status to undefined", async () => {
    if (!user) throw new Error("User not defined");
    user.status = "status";
    const token = issueAccessToken(user);

    const newStatus = "";

    const res = await request(app)
      .put("/profile")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .send({ status: newStatus });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("");
  });

  it("should throw an error when user status is too long", async () => {
    if (!user) throw new Error("User not defined");
    const token = issueAccessToken(user);

    const longStatus = "a".repeat(201);

    const res = await request(app)
      .put("/profile")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .send({ status: longStatus });

    expect(res.status).toBe(400);
  });

  it("uploads file", async () => {
    if (!user) throw new Error("User not defined");
    const token = issueAccessToken(user);

    await request(app)
      .put("/profile/avatar")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .attach("profilePicture", path.join(__dirname, "test-image.png"));

    expect(bucket.file).toHaveBeenCalled();
  });

  it("can upload a user profile image", async () => {
    if (!user) throw new Error("User not defined");
    const token = issueAccessToken(user);

    const res = await request(app)
      .put("/profile/avatar")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .attach("profilePicture", path.join(__dirname, "test-image.png"));

    expect(res.status).toBe(200);
    expect(res.body.profileImgUrl).toBeDefined();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.avatar?.url).toBeDefined();
  });

  it("should throw an error when image size is too large", async () => {
    const token = issueAccessToken(user);

    const res = await request(app)
      .put("/profile/avatar")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .attach("profilePicture", path.join(__dirname, "large-test-image.png"));

    expect(res.status).toBe(413);
  });

  it("rejects non image files", async () => {
    const token = issueAccessToken(user);

    const res = await request(app)
      .put("/profile/avatar")
      .set("Cookie", [buildAccessTokenCookie(token)])
      .attach("profilePicture", path.join(__dirname, "invalid-file.txt"));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported file type/i);
  });

  it("can delete a user profile image", async () => {
    if (!user) throw new Error("User not defined");
    const token = issueAccessToken(user);

    user.avatar = { filePath: "path", url: "url" };
    await user.save();

    const res = await request(app)
      .delete("/profile/avatar")
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(res.status).toBe(204);

    const foundUser = await User.findOne({ userName: userData.userName });
    expect(foundUser?.avatar).toBeUndefined();
  });
});
