import { GcsFileStorage } from "./infrastructure/GcsFileStorage";
import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";
import ChatMessageService from "./services/chatMessageService";

const userRepo = new MongooseUserRepository();
const chatMessageRepo = new MongooseChatMessageRepository();
const fileStorage = new GcsFileStorage();

export const chatMessageService = new ChatMessageService(
  userRepo,
  chatMessageRepo,
  fileStorage,
);
