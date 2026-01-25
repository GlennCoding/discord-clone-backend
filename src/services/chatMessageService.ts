import { FileStorage } from "../infrastructure/FileStorage";
import { ChatMessageRepository } from "../repositories/chatMessageRepository";
import { UserRepository } from "../repositories/userRepository";
import { UserNotFoundError, NotFoundError, ForbiddenError } from "../utils/errors";
import { idsEqual } from "../utils/helper";
import { ChatMessageEntity } from "../types/entities";
import { buildObjectKey } from "../utils/storagePaths";
import { uploadFileToBucket, deleteFileFromBucket } from "./storageService";
import { ChatRepository } from "../repositories/chatRepository";

interface IChatMessageService {
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

class ChatMessageService implements IChatMessageService {
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
    if (!userIsParticipant)
      throw new ForbiddenError("User is not part of this chat");

    const fileName = buildObjectKey("message-attachment", user.id, file.mimetype);
    const downloadUrl = await uploadFileToBucket(file, fileName, file.mimetype);

    let newMessage: ChatMessageEntity;

    try {
      newMessage = await this.chatMessage.create({
        chatId: chat.id,
        senderId: userId,
        text,
        attachments: [{ path: fileName, downloadUrl }],
      });
    } catch (err) {
      deleteFileFromBucket(fileName);
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

    if (!idsEqual(message.senderId, userId))
      throw new ForbiddenError("User is not the sender of this message");

    if (!message.attachments?.length) return;

    const attachmentExists = message.attachments?.some(
      (a) => a.path === attachmentPath,
    );
    if (!attachmentExists) return;

    await this.fileStorage.delete(attachmentPath);

    const newAttachments = message.attachments.filter(
      (a) => a.path !== attachmentPath,
    );

    if (!message.text && newAttachments.length === 0) {
      await this.chatMessage.deleteById(messageId);
    } else {
      await this.chatMessage.updateAttachments(messageId, newAttachments);
    }
  }
}

export default ChatMessageService;
