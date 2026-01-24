export type UserEntity = {
  id: string;
  userName: string;
  password: string;
  status?: string;
  avatar?: {
    filePath: string;
    url: string;
  };
  refreshTokens?: string[];
};

export type ChatMessageEntity = {
  id: string;
  chatId: string;
  senderId: string;
  createdAt: Date;
  updatedAt?: Date;
  text: string;
  attachments?: { path: string; downloadUrl: string }[];
};
