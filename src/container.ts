import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import MongooseUserRepository from "./repositories/mongooseUserRepository";
import ChatMessageService from "./services/chatMessageService";

const userRepo = new MongooseUserRepository();
const chatMessageRepo = new MongooseChatMessageRepository();

export const chatMessageService = new ChatMessageService(userRepo, chatMessageRepo);
