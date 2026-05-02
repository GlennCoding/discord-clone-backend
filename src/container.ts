import { bucket } from "./config/storage";
import { GcsFileStorage } from "./infrastructure/GcsFileStorage";
import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseChatRepository from "./repositories/mongooseChatRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";
import ChatMessageAttachmentService from "./services/chatMessageAttachmentService";
import { ChatService } from "./services/chatService";
import { ProfileService } from "./services/profileService";
import { UserService } from "./services/userService";

const userRepo = new MongooseUserRepository();
const chatRepo = new MongooseChatRepository();
const chatMessageRepo = new MongooseChatMessageRepository();
const fileStorage = new GcsFileStorage(bucket);

export const userService = new UserService(userRepo);
export const profileService = new ProfileService(fileStorage);
export const chatService = new ChatService(chatRepo, userRepo);

export const chatMessageAttachmentService = new ChatMessageAttachmentService(
  userRepo,
  chatRepo,
  chatMessageRepo,
  fileStorage,
);

export { fileStorage };
