import { logger } from "../config/logger";
import { UserRequest } from "../middleware/verifyJWT";

export type AuditAction =
  | "AUTH_LOGIN_SUCCESS" //
  | "AUTH_LOGIN_FAIL" //
  | "AUTH_LOGOUT" //
  | "INVALID_TOKEN_USED" //
  | "TOKEN_MISSING" //
  | "AUTH_REFRESH_SUCCESS" //
  | "AUTH_REFRESH_FAIL" //
  | "ACCESS_DENIED" // ->
  | "SERVER_CREATED" //
  | "SERVER_UPDATED" //
  | "SERVER_DELETED" //
  | "ROLE_CHANGED"
  | "CHANNEL_CREATED"
  | "CHANNEL_UPDATED"
  | "CHANNEL_DELETED"
  | "CHAT_DELETED"
  | "MESSAGE_EDITED"
  | "MESSAGE_DELETED"
  | "PROFILE_UPDATED"
  | "PROFILE_IMGAGE_UPLOADED"
  | "PROFILE_IMGAGE_DELETED"
  | "INVITE_REVOKED"
  | "MESSAGE_ATTACHMENT_UPLOADED"
  | "FILE_DELETED"
  | "RATE_LIMITED"
  | "CSRF_BLOCKED";

type AuditData = {
  targetUserId?: string;
  serverId?: string;
  channelId?: string;
  directChatId?: string;
  messageId?: string;
  metadata?: Record<string, any>;
};

export const audit = (req: UserRequest, action: AuditAction, data?: AuditData) => {
  logger.info(
    {
      type: "audit",
      action,
      actorUserId: req.userId,
      ip: req.ip,
      requestId: req.requestId,
      userAgent: req.get("user-agent"),
      ...data,
    },
    "audit_event",
  );
};
