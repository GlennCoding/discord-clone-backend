export type IMessageAPI = {
  text: string;
  chatId: string;
  sender: "self" | "other";
  createdAt: string;
  id: string;
};

export type IChatAPI = {
  chatId: string;
  participant: string;
};
