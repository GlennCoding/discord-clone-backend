import Chat from "../models/Chat";
import { parseObjectId } from "../utils/helper";

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
    const _id = parseObjectId(id);
    const doc = await Chat.findById(_id).lean();
    return doc ? mapChatDocToEntity(doc) : null;
  }
}

export default MongooseChatRepository;
