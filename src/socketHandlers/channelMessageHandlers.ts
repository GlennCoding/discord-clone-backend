import { channelMessageService } from "../container";
import { ERROR_STATUS, EVENT_ERROR } from "../types/sockets";
import { CustomError } from "../utils/errors";
import { ensureParam } from "../utils/helper";
import { channelMessagesRoom } from "../utils/socketRooms";

import type { EventControllerWithAck, TypedSocket } from "../types/sockets";

type ChannelAck =
  | Parameters<EventControllerWithAck<"channelMessages:subscribe">>[2]
  | Parameters<EventControllerWithAck<"channelMessages:unsubscribe">>[2]
  | Parameters<EventControllerWithAck<"channelMessage:new">>[2]
  | Parameters<EventControllerWithAck<"channelMessages:loadMore">>[2];

const sendAckError = (ack: ChannelAck, error: ERROR_STATUS, message: string) => {
  ack(new EVENT_ERROR({ error, message }));
};

const handleAckError = (ack: ChannelAck, error: unknown) => {
  if (error instanceof CustomError) {
    const status =
      error.statusCode === 401 || error.statusCode === 403
        ? ERROR_STATUS.UNAUTHORIZED
        : ERROR_STATUS.BAD_REQUEST;
    sendAckError(ack, status, error.message);
    return;
  }

  console.error("channel message event failed", error);
  sendAckError(ack, ERROR_STATUS.INTERNAL_ERROR, "Unable to process channel message event");
};

const ensureAuthenticatedSocket = (socket: TypedSocket) => {
  if (!socket.data.userId) throw new CustomError(401, "Missing user context");
  return socket.data.userId;
};

export const handleChannelMessagesSubscribe: EventControllerWithAck<
  "channelMessages:subscribe"
> = async (socket, channelId, ack) => {
  try {
    const userId = ensureAuthenticatedSocket(socket);
    const { channel } = await channelMessageService.ensureChannelAccess(channelId, userId);
    const { messages, nextCursor } = await channelMessageService.fetchRecentMessages(channel.id);
    await socket.join(channelMessagesRoom(channel.id));

    ack({
      status: "OK",
      data: channelMessageService.buildSubscribePayload(channel, messages, nextCursor),
    });
  } catch (error) {
    handleAckError(ack, error);
  }
};

export const handleChannelMessagesUnsubscribe: EventControllerWithAck<
  "channelMessages:unsubscribe"
> = async (socket, channelId, ack) => {
  try {
    ensureAuthenticatedSocket(socket);
    const sanitizedChannelId = ensureParam("channelId", channelId, { isObjectId: true });
    await socket.leave(channelMessagesRoom(sanitizedChannelId));
    ack({ status: "OK", data: { success: true } });
  } catch (error) {
    handleAckError(ack, error);
  }
};

export const handleIncomingChannelMessage: EventControllerWithAck<"channelMessage:new"> = async (
  socket,
  payload,
  ack,
) => {
  try {
    const userId = ensureAuthenticatedSocket(socket);
    const text = payload.text?.trim();
    if (!text) {
      sendAckError(ack, ERROR_STATUS.BAD_REQUEST, "Message text is required");
      return;
    }

    const { channel, member } = await channelMessageService.ensureChannelAccess(
      payload.channelId,
      userId,
    );
    const message = await channelMessageService.createMessage(channel.id, member.id, text);

    socket.nsp.to(channelMessagesRoom(channel.id)).emit("channelMessage:new", message);
    ack({ status: "OK", data: { message } });
  } catch (error) {
    handleAckError(ack, error);
  }
};

export const handleChannelMessagesLoadMore: EventControllerWithAck<
  "channelMessages:loadMore"
> = async (socket, payload, ack) => {
  try {
    const userId = ensureAuthenticatedSocket(socket);
    const channelId = ensureParam("channelId", payload.channelId, { isObjectId: true });
    const before = ensureParam("before", payload.before);

    await channelMessageService.ensureChannelAccess(channelId, userId);
    const { messages, nextCursor } = await channelMessageService.fetchMessagePage(
      channelId,
      before,
    );

    ack({ status: "OK", data: { messages, nextCursor } });
  } catch (error) {
    handleAckError(ack, error);
  }
};
