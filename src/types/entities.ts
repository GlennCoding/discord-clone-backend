export type ChatMessageEntity = {
  id: string;
  chatId: string;
  senderId: string;
  createdAt: Date;
  updatedAt?: Date;
  text: string;
  attachments?: { path: string; downloadUrl: string }[];
};
