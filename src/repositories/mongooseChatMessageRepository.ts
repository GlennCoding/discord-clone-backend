import { ChatMessageRepository } from "./chatMessageRepository";
import ChatMessage, { IChatMessage } from "../models/ChatMessage";
import { ChatMessageEntity } from "../types/entities";
import { FlattenMaps } from "mongoose";

const mapMessageDocToEntity = (
  doc: FlattenMaps<IChatMessage>,
): ChatMessageEntity => {
  return {
    id: doc._id.toString(),
    chatId: doc.chat._id.toString(),
    senderId: doc.sender._id.toString(),
    text: doc.text ?? undefined,
    attachments:
      doc.attachments?.map((a) => ({
        path: a.path,
        downloadUrl: a.downloadUrl,
      })) ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

class MongooseChatMessageRepository implements ChatMessageRepository {
  async findById(id: string) {
    const doc = await ChatMessage.findById(id).lean(); // or not lean if you want methods
    return doc ? mapMessageDocToEntity(doc) : null;
  }

  async deleteById(id: string) {
    await ChatMessage.deleteOne({ _id: id });
  }

  async updateAttachments(
    id: string,
    attachments: Array<{ path: string; downloadUrl: string }>,
  ) {
    await ChatMessage.updateOne({ _id: id }, { $set: { attachments } });
  }
}
