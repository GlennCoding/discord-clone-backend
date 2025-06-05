import { Socket } from "socket.io";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { IUser } from "../models/User";

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

    socket.emit("chat:messages", {
      participant: participant.userName,
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    socket.emit("chat:error", "Failed to fetch chat messages");
  }
};

const handleLeaveChat = (socket: Socket, chatId: string) => {
  socket.leave(chatId);

  console.log(`Socket left chat: ${chatId}`);
};

const onConnnection = (socket: Socket) => {
  console.log("Socket connected!");

  socket.on("disconnect", () => {
    console.log("Socket disconnected!");
  });

  socket.on("chat:join", (chatId: string) => handleJoinChat(socket, chatId));

  socket.on("chat:leave", (chatId: string) => handleLeaveChat(socket, chatId));
};

export default onConnnection;
