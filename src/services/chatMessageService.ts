import { ChatMessageRepository } from "../repositories/chatMessageRepository";
import { UserNotFoundError, NotFoundError, ForbiddenError } from "../utils/errors";
import { idsEqual } from "../utils/helper";
import { deleteFileFromBucket } from "./storageService";
import { findUserWithUserId } from "./userService";

interface IChatMessageService {
  deleteChatMessageAttachment: (input: {
    userId: string;
    messageId: string;
    attachmentPath: string;
  }) => Promise<void>;
}

class ChatMessageService implements IChatMessageService {
  constructor(private chatMessages: ChatMessageRepository) {}

  async deleteChatMessageAttachment(input: {
    userId: string;
    messageId: string;
    attachmentPath: string;
  }) {
    const { userId, messageId, attachmentPath } = input;

    const user = await findUserWithUserId(userId as string);
    if (!user) throw new UserNotFoundError();

    const message = await this.chatMessages.findById(messageId);
    if (!message) throw new NotFoundError("Message");

    if (!idsEqual(message.senderId, userId))
      throw new ForbiddenError("User is not the sender of this message");

    if (!message.attachments?.length) return;

    const attachmentExists = message.attachments?.some(
      (a) => a.path === attachmentPath,
    );
    if (!attachmentExists) return;

    await deleteFileFromBucket(attachmentPath);

    const newAttachments = message.attachments.filter(
      (a) => a.path !== attachmentPath,
    );

    if (!message.text && newAttachments.length === 0) {
      await this.chatMessages.deleteById(messageId);
    } else {
      await this.chatMessages.updateAttachments(messageId, newAttachments);
    }
  }
}

export default ChatMessageService;
