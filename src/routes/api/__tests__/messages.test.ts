import express from "express";
import request from "supertest";

import { MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES } from "../../../config/upload";
import {
  deleteMessageAttachment,
  saveMessageAttachment,
} from "../../../controllers/messageController";
import { errorMiddleware } from "../../../middleware/errorMiddleware";
import messagesRouter from "../messages";

vi.mock("../../../controllers/messageController", () => ({
  saveMessageAttachment: vi.fn((req, res) => res.status(200).json({ ok: true })),
  deleteMessageAttachment: vi.fn((req, res) => res.sendStatus(204)),
}));

const createApp = () => {
  const app = express();

  // Minimal logger so error middleware can safely log
  app.use((req, _res, next) => {
    (req as any).log = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      child: () => ({}),
    };
    next();
  });

  app.use(express.json());
  app.use("/messages", messagesRouter);
  app.use(errorMiddleware);

  return app;
};

describe("/messages/attachment", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it("forwards POST /messages/attachment to saveMessageAttachment with parsed file and fields", async () => {
    const response = await request(app)
      .post("/messages/attachment")
      .attach("attachment", Buffer.from("hello"), "hello.txt")
      .field("chatId", "chat-1")
      .field("text", "hi");

    expect(response.status).toBe(200);
    expect(saveMessageAttachment).toHaveBeenCalledTimes(1);
    const [reqArg] = (saveMessageAttachment as any).mock.calls[0];
    expect(reqArg.file?.originalname).toBe("hello.txt");
    expect(reqArg.body.chatId).toBe("chat-1");
    expect(reqArg.body.text).toBe("hi");
  });

  it("rejects uploads larger than MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES + 1);

    const response = await request(app)
      .post("/messages/attachment")
      .attach("attachment", oversizedBuffer, "too-large.bin")
      .field("chatId", "chat-1");

    expect(response.status).toBe(413);
    expect(saveMessageAttachment).not.toHaveBeenCalled();
  });

  it("forwards DELETE /messages/attachment to deleteMessageAttachment with body payload", async () => {
    const payload = { messageId: "msg-1", attachmentPath: "path/to/file" };

    const response = await request(app).delete("/messages/attachment").send(payload);

    expect(response.status).toBe(204);
    expect(deleteMessageAttachment).toHaveBeenCalledTimes(1);
    const [reqArg] = (deleteMessageAttachment as any).mock.calls[0];
    expect(reqArg.body).toMatchObject(payload);
  });
});
