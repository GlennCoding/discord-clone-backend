export type IMessageAPI = {
  text: string;
  chatId: string;
  sender: "self" | "other";
  createdAt: string;
  id: string;
};
