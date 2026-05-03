import { bucket } from "./config/storage";
import { GcsFileStorage } from "./infrastructure/GcsFileStorage";

// Mongoose (MongoDB) repositories
import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseChatRepository from "./repositories/mongooseChatRepository";
import MongooseChannelMessageRepository from "./repositories/mongooseChannelMessageRepository";
import MongooseChannelRepository from "./repositories/mongooseChannelRepository";
import MongooseServerRepository from "./repositories/mongooseServerRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";

// Prisma (PostgreSQL) repositories
import PrismaChatMessageRepository from "./repositories/prismaChatMessageRepository";
import PrismaChatRepository from "./repositories/prismaChatRepository";
import PrismaChannelMessageRepository from "./repositories/prismaChannelMessageRepository";
import PrismaChannelRepository from "./repositories/prismaChannelRepository";
import PrismaServerRepository from "./repositories/prismaServerRepository";
import PrismaUserRepository from "./repositories/prismaUserRepository";

import ChatMessageAttachmentService from "./services/chatMessageAttachmentService";
import { ChannelMessageService } from "./services/channelMessageService";
import { ChannelService } from "./services/channelService";
import { ChatService } from "./services/chatService";
import { ProfileService } from "./services/profileService";
import { ServerService } from "./services/serverService";
import { UserService } from "./services/userService";

const usePostgres = process.env.DB_DRIVER === 'postgres';

const userRepo = usePostgres ? new PrismaUserRepository() : new MongooseUserRepository();
const chatRepo = usePostgres ? new PrismaChatRepository() : new MongooseChatRepository();
export const chatMessageRepo = usePostgres
  ? new PrismaChatMessageRepository()
  : new MongooseChatMessageRepository();
const serverRepo = usePostgres ? new PrismaServerRepository() : new MongooseServerRepository();
const channelRepo = usePostgres ? new PrismaChannelRepository() : new MongooseChannelRepository();
const channelMessageRepo = usePostgres
  ? new PrismaChannelMessageRepository()
  : new MongooseChannelMessageRepository();
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
