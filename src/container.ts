import { bucket } from "./config/storage";
import { GcsFileStorage } from "./infrastructure/GcsFileStorage";
import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseChatRepository from "./repositories/mongooseChatRepository";
import MongooseChannelMessageRepository from "./repositories/mongooseChannelMessageRepository";
import MongooseChannelRepository from "./repositories/mongooseChannelRepository";
import MongooseServerRepository from "./repositories/mongooseServerRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";
import ChatMessageAttachmentService from "./services/chatMessageAttachmentService";
import { ChannelMessageService } from "./services/channelMessageService";
import { ChannelService } from "./services/channelService";
import { ChatService } from "./services/chatService";
import { ProfileService } from "./services/profileService";
import { ServerService } from "./services/serverService";
import { UserService } from "./services/userService";

const userRepo = new MongooseUserRepository();
const chatRepo = new MongooseChatRepository();
export const chatMessageRepo = new MongooseChatMessageRepository();
const serverRepo = new MongooseServerRepository();
const channelRepo = new MongooseChannelRepository();
const channelMessageRepo = new MongooseChannelMessageRepository();
const fileStorage = new GcsFileStorage(bucket);

export const userService = new UserService(userRepo);
export const profileService = new ProfileService(fileStorage);
export const chatService = new ChatService(chatRepo, userRepo);
export const serverService = new ServerService(serverRepo);
export const channelService = new ChannelService(channelRepo, serverRepo);
export const channelMessageService = new ChannelMessageService(
  channelMessageRepo,
  channelRepo,
  serverRepo,
);

export const chatMessageAttachmentService = new ChatMessageAttachmentService(
  userRepo,
  chatRepo,
  chatMessageRepo,
  fileStorage,
);

export { fileStorage };
