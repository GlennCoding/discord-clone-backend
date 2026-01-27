import ChatMessage from "../models/ChatMessage";
import { parseObjectId } from "../utils/helper";

import type { ChatMessageRepository } from "./chatMessageRepository";
import type { ChatMessageEntity } from "../types/entities";
import type { PopulatedChatMessage } from "../types/misc";

const map = (doc: PopulatedChatMessage): ChatMessageEntity => {
  return {
    id: doc._id.toString(),
    chatId: doc.chat._id.toString(),
    sender: {
      id: doc.sender._id.toString(),
      username: doc.sender.userName,
      avatarUrl: doc.sender.avatar?.url,
    },
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
    const _id = parseObjectId(id);
    const doc = await ChatMessage.findById(_id)
      .populate("sender", "userName avatar")
      .lean<PopulatedChatMessage | null>();
    return doc ? map(doc) : null;
  }

  async deleteById(id: string) {
    const _id = parseObjectId(id);
    await ChatMessage.findByIdAndDelete({ _id });
  }

  async create(newMessage: {
    chatId: string;
    senderId: string;
    text: string | undefined;
    attachments: Array<{ path: string; downloadUrl: string }>;
  }) {
    const { chatId, senderId, text, attachments } = newMessage;
    const _chatId = parseObjectId(chatId);
    const _senderId = parseObjectId(senderId);

    const saved = await new ChatMessage({
      chat: _chatId,
      sender: _senderId,
      text: text,
      attachments,
    }).save();
    const doc = await ChatMessage.findById(saved._id)
      .populate("sender", "userName avatar")
      .lean<PopulatedChatMessage | null>();

    if (!doc) throw new Error("Created message not found after save");

    return map(doc);
  }

  async updateAttachments(id: string, attachments: Array<{ path: string; downloadUrl: string }>) {
    const _id = parseObjectId(id);
    await ChatMessage.updateOne({ _id }, { $set: { attachments } }, { runValidators: true });
  }
}

export default MongooseChatMessageRepository;
