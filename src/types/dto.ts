export interface LoginDTO {
  message: string;
  token: string;
  userData: MeDTO;
}

export interface AttachmentDTO {
  downloadUrl: string;
}

export interface MessageDTO {
  id: string;
  text: string;
  chatId: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt?: string;
  attachments?: AttachmentDTO[];
}

export interface MeDTO {
  id: string;
  username: string;
  avatarUrl?: string;
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
