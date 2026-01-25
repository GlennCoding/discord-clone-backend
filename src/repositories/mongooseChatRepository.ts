
import Chat from "../models/Chat";

import type { ChatRepository } from "./chatRepository";
import type { IChat } from "../models/Chat";
import type { ChatEntity } from "../types/entities";
import type { FlattenMaps } from "mongoose";

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
