import { UserRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import {
  CustomError,
  InputMissingError,
  ParamsMissingError,
  UserNotFoundError,
} from "../utils/errors";
import { findUserWithUserId } from "../services/userService";
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
import {
  ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES,
  MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES,
} from "../config/upload";
import { validateUploadedFile } from "../utils/fileValidation";
import { buildObjectKey } from "../utils/storagePaths";
import { auditHttp } from "../utils/audit";
import z from "zod";
import { parseWithSchema } from "../utils/validators";
import { chatMessageService } from "../container";

const getChat = async (chatId: string | undefined, userId: string) => {
  // is user part of chat? -> Chat.find()
  const foundChat = await Chat.findOne({ _id: chatId });
  if (!foundChat) throw new CustomError(400, "Chat doesn't exist");

  const userIsParticipant = foundChat.participants.some((participant) =>
    idsEqual(participant, new mongoose.Types.ObjectId(userId)),
  );

  if (!userIsParticipant) {
    throw new CustomError(403, "User is not part of this chat");
  }

  return foundChat;
};

const verifyText = (text?: string) => {
  if (!text) return;
  if (typeof text !== "string") throw new CustomError(400, "text must be string");
};

const saveMessageAttachmentPayloadSchema = z.object({
  chatId: z.string(),
  text: z.string().optional(),
});

export const saveMessageAttachment = async (
  req: UserRequest<SaveMessageAttachmentInput>,
  res: Response,
) => {
  const { file, userId } = req;

  const { chatId, text } = parseWithSchema(
    saveMessageAttachmentPayloadSchema,
    req.body,
  );
  if (!file) throw new InputMissingError("File");

  const user = await findUserWithUserId(req.userId as string);
  if (!user) throw new UserNotFoundError();

  if (!chatId) throw new ParamsMissingError("chat id");
  const chat = await getChat(chatId, userId as string);

  verifyText(text);

  const validatedFile = await validateUploadedFile(file, {
    allowedMimeTypes: ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES,
    maxFileSizeBytes: MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES,
  });

  // upload file
  const fileName = buildObjectKey(
    "message-attachment",
    user.id ?? user._id.toString(),
    validatedFile.ext,
  );
  const downloadUrl = await uploadFileToBucket(file, fileName, validatedFile.mime);

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

  auditHttp(req, "MESSAGE_ATTACHMENT_UPLOADED", { messageId: newMessage.id });

  io.to(chat.id).emit("message:new", {
    message: messageDTO,
  });
  res.status(200).json({ message: messageDTO });
};

const deleteMessageAttachmentPayloadSchema = z.object({
  messageId: z.string(),
  attachmentPath: z.string(),
});

export const deleteMessageAttachment = async (
  req: UserRequest<DeleteMessageAttachmentInput>,
  res: Response,
) => {
  const { messageId, attachmentPath } = parseWithSchema(
    deleteMessageAttachmentPayloadSchema,
    req.body,
  );

  await chatMessageService.deleteChatMessageAttachment({
    userId: req.userId as string,
    messageId,
    attachmentPath,
  });

  (auditHttp(req, "MESSAGE_ATTACHMENT_DELETED", { messageId: messageId }),
    res.sendStatus(204));
};
