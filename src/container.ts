import { bucket } from "./config/storage";
import { GcsFileStorage } from "./infrastructure/GcsFileStorage";
import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseChatRepository from "./repositories/mongooseChatRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";
import ChatMessageService from "./services/chatMessageService";

const userRepo = new MongooseUserRepository();
const chatRepo = new MongooseChatRepository();
const chatMessageRepo = new MongooseChatMessageRepository();
const fileStorage = new GcsFileStorage(bucket);

export const chatMessageService = new ChatMessageService(
  userRepo,
  chatRepo,
  chatMessageRepo,
  fileStorage,
);
