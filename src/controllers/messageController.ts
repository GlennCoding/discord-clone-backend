import { UserRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import {
  CustomError,
  InputMissingError,
  NotFoundError,
  ParamsMissingError,
  UserNotFoundError,
} from "../utils/errors";
import { findUserWithUserId } from "../services/userService";
import { randomUUID } from "crypto";
import {
  deleteFileFromBucket,
  uploadFileToBucket,
} from "../services/storageService";
import Message from "../models/ChatMessage";
import {
  DeleteMessageAttachmentInput,
  SaveMessageAttachmentInput,
} from "../types/dto";
import Chat from "../models/Chat";
import mongoose from "mongoose";
import { idsEqual } from "../utils/helper";
import { io } from "../app";
import { toMessageDTO } from "../utils/dtos/messageDTO";

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

export const saveMessageAttachment = async (
  req: UserRequest<SaveMessageAttachmentInput>,
  res: Response
) => {
  const { file, body, userId } = req;
  const { chatId, text } = body;

  // verify request
  if (!file) throw new InputMissingError("File");

  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (!chatId) throw new ParamsMissingError("chat id");
  const chat = await getChat(chatId, userId as string);

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

  try {
    await newMessage.save();
  } catch (err) {
    console.warn(err);
    deleteFileFromBucket(fileName);
  }

  const messageDTO = toMessageDTO(newMessage);

  // emit new message to chatroom
  io.to(chat.id).emit("message:new", {
    message: messageDTO,
  });

  // Send back Message DTO
  res.status(200).json({ messae: messageDTO });
};

const getMessage = async (messageId: string) => {
  return await Message.findOne({ _id: messageId });
};

export const deleteMessageAttachement = async (
  req: UserRequest<DeleteMessageAttachmentInput>,
  res: Response
) => {
  // verify request
  const { messageId, attachmentPath } = req.body;

  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (!messageId) throw new InputMissingError("messageId");
  const message = await getMessage(messageId);
  if (!message) throw new NotFoundError("Message");

  console.log({ sender: message.sender._id, user: user._id });

  const userIsSender = idsEqual(message.sender._id, user._id);

  if (!userIsSender)
    throw new CustomError(403, "User is not the sender of this message");

  if (!attachmentPath) throw new InputMissingError("attachmentPath");

  // delete file from bucket & remove attachment from message
  await deleteFileFromBucket(attachmentPath);

  if (!message.attachments) {
    res.sendStatus(204);
    return;
  }

  const newAttachments = message.attachments.filter(
    (a) => a.path !== attachmentPath
  );
  if (!message.text && newAttachments.length === 0) {
    await Message.deleteOne({ _id: messageId });
  } else {
    message.attachments = newAttachments;
    await message.save();
  }

  res.sendStatus(204);
};
