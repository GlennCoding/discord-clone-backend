import { logger } from "../config/logger";

export type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAIL"
  | "AUTH_LOGOUT"
  | "INVALID_TOKEN_USED"
  | "AUTH_REFRESH_SUCCESS"
  | "AUTH_REFRESH_FAIL"
  | "INVALID_TOKEN_USED"
  | "ACCESS_DENIED"
  | "SERVER_CREATED"
  | "SERVER_UPDATED"
  | "SERVER_DELETED"
  | "ROLE_CHANGED"
  | "CHANNEL_CREATED"
  | "CHANNEL_DELETED"
  | "MESSAGE_DELETED"
  | "MESSAGE_EDITED"
  | "INVITE_REVOKED"
  | "FILE_UPLOADED"
  | "FILE_DELETED"
  | "RATE_LIMITED"
  | "CSRF_BLOCKED";

export function audit(input: {
  action: AuditAction;
  actorUserId?: string;
  targetUserId?: string;
  serverId?: string;
  channelId?: string;
  messageId?: string;
  requestId?: string;
  ip?: string;
  metadata?: Record<string, any>;
}) {
  logger.info(
    {
      type: "audit",
      ...input,
    },
    "audit_event"
  );
}
