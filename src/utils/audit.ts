import { logger } from "../config/logger";

import type { UserRequest } from "../middleware/verifyJWT";
import type { TypedSocket } from "../types/sockets";

export type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAIL"
  | "AUTH_LOGOUT"
  | "INVALID_TOKEN_USED"
  | "TOKEN_MISSING"
  | "AUTH_REFRESH_SUCCESS"
  | "AUTH_REFRESH_FAIL"
  | "ACCESS_DENIED"
  | "SERVER_CREATED"
  | "SERVER_UPDATED"
  | "SERVER_DELETED"
  | "CHANNEL_CREATED"
  | "CHANNEL_UPDATED"
  | "CHANNEL_DELETED"
  | "CHAT_DELETED"
  | "MESSAGE_ATTACHMENT_UPLOADED"
  | "MESSAGE_ATTACHMENT_DELETED"
  | "PROFILE_UPDATED"
  | "PROFILE_IMGAGE_UPLOADED"
  | "PROFILE_IMGAGE_DELETED"
  | "RATE_LIMITED"
  | "CSRF_BLOCKED";
//| "MESSAGE_EDITED"
//| "MESSAGE_DELETED"
//| "CHANNEL_MESSAGE_EDITED"
//| "CHANNEL_MESSAGE_DELETED"
//| "ROLE_CHANGED";

type AuditContext = {
  actorUserId?: string;
  ip?: string;
  requestId?: string;
  userAgent?: string;
};

type AuditData = {
  targetUserId?: string;
  serverId?: string;
  channelId?: string;
  directChatId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
};

const logAudit = (ctx: AuditContext, action: AuditAction, data?: AuditData) => {
  logger.info({ type: "audit", action, ...ctx, ...data }, "audit_event");
};

export const auditHttp = (req: UserRequest, action: AuditAction, data?: AuditData) => {
  logAudit(
    {
      actorUserId: req.userId,
      ip: req.ip ?? req.socket.remoteAddress,
      requestId: (req as any).id ?? req.requestId,
      userAgent: req.get("user-agent"),
    },
    action,
    data,
  );
};

export const auditSocket = (socket: TypedSocket, action: AuditAction, data?: AuditData) =>
  logAudit(
    {
      actorUserId: socket.data.userId,
      ip:
        (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        socket.handshake.address,
      requestId: socket.handshake.headers["x-request-id"] as string,
      userAgent: socket.handshake.headers["user-agent"] as string,
    },
    action,
    data,
  );
