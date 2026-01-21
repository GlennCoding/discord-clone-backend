import { CustomError } from "../utils/errors";
import {
  buildChannelSubscribePayload,
  createChannelMessage,
  ensureChannelAccess,
  fetchRecentChannelMessages,
} from "../services/channelMessageService";
import { channelMessagesRoom } from "../utils/socketRooms";
import { ERROR_STATUS, EVENT_ERROR } from "../types/sockets";
import { ensureParam } from "../utils/helper";
import { EventControllerWithAck, TypedSocket } from "../types/sockets";

type ChannelAck =
  | Parameters<EventControllerWithAck<"channelMessages:subscribe">>[2]
  | Parameters<EventControllerWithAck<"channelMessages:unsubscribe">>[2]
  | Parameters<EventControllerWithAck<"channelMessage:new">>[2];

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
  sendAckError(
    ack,
    ERROR_STATUS.INTERNAL_ERROR,
    "Unable to process channel message event",
  );
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
    const { channel } = await ensureChannelAccess(channelId, userId);
    const messages = await fetchRecentChannelMessages(channel.id);
    socket.join(channelMessagesRoom(channel.id));

    const payload = buildChannelSubscribePayload(channel, messages);
    ack({
      status: "OK",
      data: payload,
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
    const sanitizedChannelId = ensureParam("channelId", channelId, {
      isObjectId: true,
    });
    socket.leave(channelMessagesRoom(sanitizedChannelId));
    ack({
      status: "OK",
      data: { success: true },
    });
  } catch (error) {
    handleAckError(ack, error);
  }
};

export const handleIncomingChannelMessage: EventControllerWithAck<
  "channelMessage:new"
> = async (socket, payload, ack) => {
  try {
    const userId = ensureAuthenticatedSocket(socket);
    const text = payload.text?.trim();
    if (!text) {
      sendAckError(ack, ERROR_STATUS.BAD_REQUEST, "Message text is required");
      return;
    }

    const { channel, member } = await ensureChannelAccess(payload.channelId, userId);
    const channelId = channel.id;
    const message = await createChannelMessage(channelId, member, text);

    socket.nsp
      .to(channelMessagesRoom(channelId))
      .emit("channelMessage:new", message);

    ack({
      status: "OK",
      data: { message },
    });
  } catch (error) {
    handleAckError(ack, error);
  }
};
