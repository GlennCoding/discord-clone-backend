import { Server, Socket } from "socket.io";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { IUser } from "../models/User";

type IMessageAPI = {
  text: string;
  chatId: string;
  sender: "self" | "other";
  createdAt: string;
  id: string;
};

const handleIncomingNewMessage = async (
  io: Server,
  socket: Socket,
  chatId: string,
  text: string
) => {
  try {
    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName");
    const participant = chat?.participants.find(
      (p) => p.id.toString() !== socket.data.userId
    );

    if (!participant) {
      socket.emit("chat:error", "You're not part of this chat");
      return;
    }

    const newMessage = await Message.create({
      chat: chatId,
      sender: socket.data.userId,
      text,
    });

    const resMessage = (sender: "self" | "other"): IMessageAPI => ({
      text: newMessage.text,
      chatId: newMessage.chat.toString(),
      sender,
      createdAt: newMessage.createdAt.toISOString(),
      id: newMessage.id.toString(),
    });

    socket.emit("chat:newMessage", {
      message: resMessage("self"),
    });
    socket.to(chatId).emit("chat:newMessage", {
      message: resMessage("other"),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    socket.emit("chat:error", "Failed to fetch chat messages");
  }
};

const handleJoinChat = async (socket: Socket, chatId: string) => {
  socket.join(chatId);

  try {
    const chat = await Chat.findOne({ _id: chatId }).populate<{
      participants: IUser[];
    }>("participants", "userName");
    const participant = chat?.participants.find(
      (p) => p.id.toString() !== socket.data.userId
    );

    if (!participant) {
      socket.emit("chat:error", "You're not part of this chat");
      return;
    }

    const messages = await Message.find({ chat: chatId })
      .populate<{ sender: IUser }>("sender", "userName")
      .sort({ createdAt: 1 });

    const result = messages.map((message) => {
      return {
        text: message.text,
        chatId: message.chat.toString(),
        sender: message.sender.toString() === socket.data.userId ? "self" : "other",
        createdAt: message.createdAt.toISOString(),
        id: message.id.toString(),
      } as IMessageAPI;
    });

    socket.emit("chat:messages", {
      participant: participant.userName,
      messages: result,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    socket.emit("chat:error", "Failed to fetch chat messages");
  }
};

const handleLeaveChat = (socket: Socket, chatId: string) => {
  socket.leave(chatId);
};

const onConnection = (io: Server, socket: Socket) => {
  console.log("Socket connected!");

  socket.on("disconnect", () => {
    console.log("Socket disconnected!");
  });

  socket.on("chat:join", (chatId: string) => handleJoinChat(socket, chatId));

  socket.on("chat:leave", (chatId: string) => handleLeaveChat(socket, chatId));

  socket.on(
    "chat:newMessage",
    ({ chatId, text }: { chatId: string; text: string }) =>
      handleIncomingNewMessage(io, socket, chatId, text)
  );
};

export default onConnection;
