import z from "zod";

import { io } from "../app";
import {
  ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES,
  MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES,
} from "../config/upload";
import { chatMessageAttachmentService } from "../container";
import { auditHttp } from "../utils/audit";
import { toMessageDTOWithSignedUrls } from "../utils/dtos/messageDTO";
import { InputMissingError } from "../utils/errors";
import { validateUploadedFile } from "../utils/fileValidation";
import { parseUserId, parseWithSchema } from "../utils/validators";

import type { UserRequest } from "../middleware/verifyJWT";
import type { DeleteMessageAttachmentInput, SaveMessageAttachmentInput } from "../types/dto";
import type { Response } from "express";
import { fileStorage } from "../container";

const saveMessageAttachmentPayloadSchema = z
  .object({
    chatId: z.string(),
    text: z.string().optional(),
  })
  .strict();

export const saveMessageAttachment = async (
  req: UserRequest<SaveMessageAttachmentInput>,
  res: Response,
) => {
  const { chatId, text } = parseWithSchema(saveMessageAttachmentPayloadSchema, req.body);
  const userId = parseUserId(req.userId);

  if (!req.file) throw new InputMissingError("File");
  const validatedFile = await validateUploadedFile(req.file, {
    allowedMimeTypes: ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES,
    maxFileSizeBytes: MAX_MESSAGE_ATTACHMENT_FILE_SIZE_BYTES,
  });

  const message = await chatMessageAttachmentService.saveMessageAttachment({
    userId,
    file: req.file,
    chatId,
    text,
    mimeType: validatedFile.mime,
    extension: validatedFile.ext,
  });

  auditHttp(req, "MESSAGE_ATTACHMENT_UPLOADED", { messageId: message.id });

  const messageDTO = await toMessageDTOWithSignedUrls(message, fileStorage);

  io.to(chatId).emit("message:new", {
    message: messageDTO,
  });

  res.status(200).json({ message: messageDTO });
};

const deleteMessageAttachmentPayloadSchema = z
  .object({
    messageId: z.string(),
    attachmentPath: z.string(),
  })
  .strict();

export const deleteMessageAttachment = async (
  req: UserRequest<DeleteMessageAttachmentInput>,
  res: Response,
) => {
  const { messageId, attachmentPath } = parseWithSchema(
    deleteMessageAttachmentPayloadSchema,
    req.body,
  );
  const userId = parseUserId(req.userId);

  await chatMessageAttachmentService.deleteChatMessageAttachment({
    userId,
    messageId,
    attachmentPath,
  });

  auditHttp(req, "MESSAGE_ATTACHMENT_DELETED", { messageId: messageId });
  res.sendStatus(204);
};
