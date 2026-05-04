import { serverService } from "../container";
import {
  ensureShortId as _ensureShortId,
  filterAllowedChannels,
  toChannelDTO,
  toMemberDTO,
} from "../services/serverService";
import { ERROR_STATUS, EVENT_ERROR } from "../types/sockets";
import { CustomError, NotFoundError } from "../utils/errors";
import { ensureParam, ensureUser } from "../utils/helper";
import { serverRoom } from "../utils/socketRooms";

import type { ServerDTO } from "../types/dto";
import type {
  EventControllerWithAck,
  EventControllerWithoutAck,
  TypedSocket,
} from "../types/sockets";

type SocketWithServerData = TypedSocket & {
  data: TypedSocket["data"] & {
    subscribedServers?: Set<string>;
  };
};

const getSubscribedServers = (socket: SocketWithServerData) => {
  if (!socket.data.subscribedServers) {
    socket.data.subscribedServers = new Set<string>();
  }
  return socket.data.subscribedServers;
};

const mapErrorToAck = (
  ack: Parameters<EventControllerWithAck<"server:subscribe">>[2],
  error: ERROR_STATUS,
  message: string,
) => {
  ack(new EVENT_ERROR({ error, message }));
};

const handleAckError = (
  ack: Parameters<EventControllerWithAck<"server:subscribe">>[2],
  error: unknown,
) => {
  if (error instanceof CustomError) {
    const status =
      error.statusCode === 401 || error.statusCode === 403
        ? ERROR_STATUS.UNAUTHORIZED
        : ERROR_STATUS.BAD_REQUEST;
    mapErrorToAck(ack, status, error.message);
  } else {
    console.error("server:subscribe failed", error);
    mapErrorToAck(ack, ERROR_STATUS.INTERNAL_ERROR, "Unable to subscribe to server");
  }
};

const buildServerPayload = async (
  serverId: string,
  userId: string,
): Promise<{ serverDTO: ServerDTO; serverDbId: string }> => {
  const user = await ensureUser(userId);

  const server = await serverService.findById(serverId);
  if (!server) throw new NotFoundError("Server");

  const allMembers = await serverService.getMembers(server.id);
  const currentMember = allMembers.find((m) => m.userId === user.id);
  if (!currentMember) throw new CustomError(403, "You are no member of this server");

  const channels = await serverService.getChannelsSorted(server.id);
  const allowedChannels = filterAllowedChannels(channels, currentMember.roleIds);

  const serverDTO: ServerDTO = {
    id: server.id,
    name: server.name,
    description: server.description,
    iconUrl: server.iconUrl,
    channels: allowedChannels.map(toChannelDTO),
    members: allMembers.map(toMemberDTO),
  };

  return { serverDTO, serverDbId: server.id };
};

export const handleServerSubscribe: EventControllerWithAck<"server:subscribe"> = async (
  socket,
  serverId,
  ack,
) => {
  try {
    const sanitizedServerId = ensureParam("serverId", serverId, { isObjectId: true });
    const userId = socket.data.userId as string;
    if (!userId) throw new CustomError(401, "Missing user context");

    const { serverDTO, serverDbId } = await buildServerPayload(sanitizedServerId, userId);

    await socket.join(serverRoom(serverDbId));
    getSubscribedServers(socket as SocketWithServerData).add(serverDbId);

    ack({ status: "OK", data: serverDTO });
  } catch (error) {
    handleAckError(ack, error);
  }
};

export const handleServerUnsubscribe: EventControllerWithoutAck<"server:unsubscribe"> = async (
  socket,
  serverId,
) => {
  try {
    const sanitizedServerId = ensureParam("serverId", serverId, { isObjectId: true });
    await socket.leave(serverRoom(sanitizedServerId));
    getSubscribedServers(socket as SocketWithServerData).delete(sanitizedServerId);
  } catch (error) {
    console.warn("server:unsubscribe failed", error);
  }
};
