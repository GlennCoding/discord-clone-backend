import Chat from '../models/Chat';
import Message from '../models/ChatMessage';
import { parseObjectId } from '../utils/helper';
import { withTransaction } from './transactionHelper';

import type { ChatRepository } from './chatRepository';
import type { IChat } from '../models/Chat';
import type { ChatEntity } from '../types/entities';
import type { FlattenMaps, Types } from 'mongoose';

type LeanChat = FlattenMaps<IChat> & { _id: Types.ObjectId };

const mapChatDocToEntity = (doc: LeanChat): ChatEntity => ({
  id: doc._id.toString(),
  participantIds: (doc.participants as unknown as Types.ObjectId[]).map((p) => p.toString()),
  lastMessage: doc.lastMessage
    ? {
        text: doc.lastMessage.text,
        senderName: doc.lastMessage.senderName,
        sentAt: doc.lastMessage.sentAt,
      }
    : undefined,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const sortIds = (a: Types.ObjectId, b: Types.ObjectId) =>
  a.toString() < b.toString() ? -1 : 1;

class MongooseChatRepository implements ChatRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await Chat.findById(_id).lean<LeanChat>();
    return doc ? mapChatDocToEntity(doc) : null;
  }

  async findByParticipantId(userId: string) {
    const _id = parseObjectId(userId);
    const docs = await Chat.find({ participants: _id }).lean<LeanChat[]>();
    return docs.map(mapChatDocToEntity);
  }

  async findBetweenUsers(user1Id: string, user2Id: string) {
    const ids = [parseObjectId(user1Id), parseObjectId(user2Id)].sort(sortIds);
    const doc = await Chat.findOne({ participants: ids }).lean<LeanChat>();
    return doc ? mapChatDocToEntity(doc) : null;
  }

  async create(user1Id: string, user2Id: string) {
    const ids = [parseObjectId(user1Id), parseObjectId(user2Id)].sort(sortIds);
    const doc = await Chat.create({ participants: ids });
    const lean = await Chat.findById(doc._id).lean<LeanChat>();
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
