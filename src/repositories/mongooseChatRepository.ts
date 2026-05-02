import Chat from '../models/Chat';
import Message from '../models/ChatMessage';
import { parseObjectId } from '../utils/helper';
import { withTransaction } from './transactionHelper';

import type { ChatRepository } from './chatRepository';
import type { IChat } from '../models/Chat';
import type { ChatEntity } from '../types/entities';
import type { FlattenMaps } from 'mongoose';

const mapChatDocToEntity = (doc: FlattenMaps<IChat>): ChatEntity => ({
  id: doc._id.toString(),
  participantIds: doc.participants.map((p) => p._id.toString()),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

class MongooseChatRepository implements ChatRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await Chat.findById(_id).lean();
    return doc ? mapChatDocToEntity(doc) : null;
  }

  async findByParticipantId(userId: string) {
    const _id = parseObjectId(userId);
    const docs = await Chat.find({ participants: _id }).lean();
    return docs.map(mapChatDocToEntity);
  }

  async findBetweenUsers(user1Id: string, user2Id: string) {
    const _id1 = parseObjectId(user1Id);
    const _id2 = parseObjectId(user2Id);
    const doc = await Chat.findOne({ participants: [_id1, _id2] }).lean();
    return doc ? mapChatDocToEntity(doc) : null;
  }

  async create(user1Id: string, user2Id: string) {
    const _id1 = parseObjectId(user1Id);
    const _id2 = parseObjectId(user2Id);
    const doc = await Chat.create({ participants: [_id1, _id2] });
    const lean = await Chat.findById(doc._id).lean();
    if (!lean) throw new Error('Chat not found after create');
    return mapChatDocToEntity(lean);
  }

  async deleteWithMessages(chatId: string) {
    const _id = parseObjectId(chatId);
    await withTransaction(async (session) => {
      await Message.deleteMany({ chat: _id }, { session });
      await Chat.findByIdAndDelete(_id, { session });
    });
  }
}

export default MongooseChatRepository;
