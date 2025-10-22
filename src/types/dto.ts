interface Attachment {
  downloadUrl: string;
}

export interface MessageDTO {
  id: string;
  text: string;
  chatId: string;
  sender: "self" | "other";
  createdAt: string;
  attachments?: Attachment[];
}

export interface ChatDTO {
  chatId: string;
  participant: string;
}

export interface JoinChatDTO {
  participant: string;
  messages: MessageDTO[];
}

export interface DeleteMessageAttachmentInput {
  messageId: string;
  attachmentPath: string;
}

export interface SaveMessageAttachmentInput {
  chatId: string;
  text?: string;
}

export interface SendMessageInput {
  chatId: string;
  text: string;
}

export interface ProfileDTO {
  userName: string;
  status: string;
  profileImgUrl?: string;
}
