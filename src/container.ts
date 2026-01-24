import MongooseChatMessageRepository from "./repositories/mongooseChatMessageRepository";
import ChatMessageService from "./services/chatMessageService";

const chatMessageRepo = new MongooseChatMessageRepository();

export const chatMessageService = new ChatMessageService(chatMessageRepo);
