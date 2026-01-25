import { ChatMessageRepository } from "./chatMessageRepository";
import ChatMessage from "../models/ChatMessage";
import { ChatMessageEntity } from "../types/entities";
import { PopulatedChatMessage } from "../types/misc";

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
    const doc = await ChatMessage.findById(id)
      .populate("sender", "userName avatar")
      .lean<PopulatedChatMessage | null>();
    return doc ? map(doc) : null;
  }

  async deleteById(id: string) {
    await ChatMessage.deleteOne({ _id: id });
  }

  async create(newMessage: {
    chatId: string;
    senderId: string;
    text: string | undefined;
    attachments: Array<{ path: string; downloadUrl: string }>;
  }) {
    const { chatId, senderId, text, attachments } = newMessage;
    const saved = await new ChatMessage({
      chat: chatId,
      sender: senderId,
      text: text,
      attachments,
    }).save();
    const doc = await ChatMessage.findById(saved._id)
      .populate("sender", "userName avatar")
      .lean<PopulatedChatMessage | null>();

    if (!doc) throw new Error("Created message not found after save");

    return map(doc);
  }

  async updateAttachments(
    id: string,
    attachments: Array<{ path: string; downloadUrl: string }>,
  ) {
    await ChatMessage.updateOne({ _id: id }, { $set: { attachments } });
  }
}

export default MongooseChatMessageRepository;
