import { bucket } from "./config/storage";
import { GcsFileStorage } from "./infrastructure/GcsFileStorage";
import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseChatRepository from "./repositories/mongooseChatRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";
import ChatMessageAttachmentService from "./services/chatMessageAttachmentService";

const userRepo = new MongooseUserRepository();
const chatRepo = new MongooseChatRepository();
const chatMessageRepo = new MongooseChatMessageRepository();
const fileStorage = new GcsFileStorage(bucket);

export const chatMessageAttachmentService = new ChatMessageAttachmentService(
  userRepo,
  chatRepo,
  chatMessageRepo,
  fileStorage,
);

export { fileStorage };
