import { UserRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import {
  CustomError,
  InputMissingError,
  ParamsMissingError,
  UserNotFoundError,
} from "../utils/errors";
import { findUserWithUserId } from "../services/userService";
import { randomUUID } from "crypto";
import {
  deleteFileFromBucket,
  uploadFileToBucket,
} from "../services/storageService";
import Message, { IMessage } from "../models/Message";
import { io } from "../sockets";
import { MessageDTO } from "../types/dto";
import Chat from "../models/Chat";
import mongoose from "mongoose";

const getChat = async (chatId: string | undefined, userId: string) => {
  // is user part of chat? -> Chat.find()
  const foundChat = await Chat.findOne({ _id: chatId });
  if (!foundChat) throw new CustomError(400, "Chat doesn't exist");

  foundChat.participants.includes(new mongoose.Types.ObjectId(userId));

  return foundChat;
};

const verifyText = (text?: string) => {
  if (!text) return;
  if (typeof text !== "string") throw new CustomError(400, "text must be string");
};

const formatMessageToMessageDTO = (
  message: IMessage,
  sender: "self" | "other"
): MessageDTO => ({
  id: message._id.toString(),
  text: message.text,
  chatId: message.chat.id,
  sender,
  attachments: message.attachments,
  createdAt: message.createdAt.toISOString(),
});

export const saveMessageAttachment = async (req: UserRequest, res: Response) => {
  const { file, body, userId } = req;
  const { chatId, text } = body;

  // verify request
  if (!file) throw new InputMissingError("File");

  if (!userId) throw new UserNotFoundError();
  const user = await findUserWithUserId(userId as string);
  if (!user) throw new UserNotFoundError();

  if (!chatId) throw new ParamsMissingError("chat id");
  const chat = await getChat(chatId, userId);

  verifyText(text);

  // upload file
  const fileName = `message-attachment/${Date.now()}-${randomUUID()}`;
  const downloadUrl = await uploadFileToBucket(file, fileName);

  // create & save Message document (if fails, delete file from bucket)
  const newMessage = new Message({
    chat: chat,
    sender: user,
    text: text,
    attachments: [{ path: fileName, downloadUrl }],
  });

  console.log({ newMessage });

  try {
    await newMessage.save();
  } catch (err) {
    console.warn(err);
    deleteFileFromBucket(fileName);
  }

  // emit new message to chatroom
  io.to(chat.id).emit("message:new", {
    message: formatMessageToMessageDTO(newMessage, "other"),
  });

  // Send back Message DTO
  res.status(200).json(formatMessageToMessageDTO(newMessage, "self"));
};
