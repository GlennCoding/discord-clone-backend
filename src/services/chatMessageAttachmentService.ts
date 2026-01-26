import { UserNotFoundError, NotFoundError, ForbiddenError } from "../utils/errors";
import { idsEqual } from "../utils/helper";
import { buildObjectKey } from "../utils/storage";

import type { FileStorage } from "../infrastructure/FileStorage";
import type { ChatMessageRepository } from "../repositories/chatMessageRepository";
import type { ChatRepository } from "../repositories/chatRepository";
import type { UserRepository } from "../repositories/userRepository";
import type { ChatMessageEntity } from "../types/entities";

type IChatMessageAttachmentService = {
  saveMessageAttachment: (input: {
    userId: string;
    file: Express.Multer.File;
    chatId: string;
    text: string | undefined;
  }) => Promise<ChatMessageEntity>;
  deleteChatMessageAttachment: (input: {
    userId: string;
    messageId: string;
    attachmentPath: string;
  }) => Promise<void>;
}

class ChatMessageAttachmentService implements IChatMessageAttachmentService {
  constructor(
    private user: UserRepository,
    private chat: ChatRepository,
    private chatMessage: ChatMessageRepository,
    private fileStorage: FileStorage,
  ) {}

  async saveMessageAttachment(input: {
    userId: string;
    file: Express.Multer.File;
    chatId: string;
    text: string | undefined;
  }) {
    const { userId, file, chatId, text } = input;

    const user = await this.user.findById(userId);
    if (!user) throw new UserNotFoundError();

    const chat = await this.chat.findById(chatId);
    if (!chat) throw new NotFoundError("Chat");

    const userIsParticipant = chat.participantIds.some((id) => idsEqual(id, userId));
    if (!userIsParticipant) throw new ForbiddenError("User is not part of this chat");

    const fileKey = buildObjectKey("message-attachment", user.id, file.mimetype);
    const downloadUrl = await this.fileStorage.upload(file, fileKey, file.mimetype);

    let newMessage: ChatMessageEntity;

    try {
      newMessage = await this.chatMessage.create({
        chatId: chat.id,
        senderId: userId,
        text,
        attachments: [{ path: fileKey, downloadUrl }],
      });
    } catch (err) {
      void this.fileStorage.deleteObject(fileKey);
      throw err;
    }

    return newMessage;
  }

  async deleteChatMessageAttachment(input: {
    userId: string;
    messageId: string;
    attachmentPath: string;
  }) {
    const { userId, messageId, attachmentPath } = input;

    const user = this.user.findById(userId);
    if (!user) throw new UserNotFoundError();

    const message = await this.chatMessage.findById(messageId);
    if (!message) throw new NotFoundError("Message");

    if (!idsEqual(message.sender.id, userId))
      throw new ForbiddenError("User is not the sender of this message");

    if (!message.attachments?.length) return;

    const attachmentExists = message.attachments?.some((a) => a.path === attachmentPath);
    if (!attachmentExists) return;

    await this.fileStorage.deleteObject(attachmentPath);

    const newAttachments = message.attachments.filter((a) => a.path !== attachmentPath);

    if (!message.text && newAttachments.length === 0) {
      await this.chatMessage.deleteById(messageId);
    } else {
      await this.chatMessage.updateAttachments(messageId, newAttachments);
    }
  }
}

export default ChatMessageAttachmentService;
