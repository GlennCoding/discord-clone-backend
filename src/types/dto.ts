interface Attachment {
  downloadUrl: string;
}

export interface MessageDTO {
  text: string;
  chatId: string;
  sender: "self" | "other";
  createdAt: string;
  attachments: Attachment[];
  id: string;
}

export interface ChatDTO {
  chatId: string;
  participant: string;
}

export interface JoinChatDTO {
  participant: string;
  messages: MessageDTO[];
}

export interface SendMessageAttachmentInput {
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
