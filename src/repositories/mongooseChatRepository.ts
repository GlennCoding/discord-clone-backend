import { ChatEntity } from "../types/entities";
import { FlattenMaps } from "mongoose";
import Chat, { IChat } from "../models/Chat";
import { ChatRepository } from "./chatRepository";

const mapChatDocToEntity = (doc: FlattenMaps<IChat>): ChatEntity => {
  return {
    id: doc._id.toString(),
    participantIds: doc.participants.map((p) => p._id.toString()),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

class MongooseChatRepository implements ChatRepository {
  async findById(id: string) {
    const doc = await Chat.findById(id).lean();
    return doc ? mapChatDocToEntity(doc) : null;
  }
}

export default MongooseChatRepository;
