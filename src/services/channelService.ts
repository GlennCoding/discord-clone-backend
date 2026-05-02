import { NoAccessError, NoPermissionError, NotFoundError } from '../utils/errors';

import type { ChannelRepository } from '../repositories/channelRepository';
import type { ServerRepository } from '../repositories/serverRepository';
import type { ChannelDTO } from '../types/dto';
import type { ChannelEntity, ServerEntity } from '../types/entities';

export const toChannelDTO = (channel: ChannelEntity): ChannelDTO => ({
  id: channel.id,
  name: channel.name,
  order: channel.order,
});

export class ChannelService {
  constructor(
    private channel: ChannelRepository,
    private server: ServerRepository,
  ) {}

  async ensureServerOwner(
    serverId: string,
    userId: string,
  ): Promise<ServerEntity> {
    const server = await this.server.findById(serverId);
    if (!server) throw new NotFoundError('Server');

    const member = await this.server.findMember(serverId, userId);
    if (!member) throw new NoAccessError(`server: ${server.name}`);

    if (server.ownerId !== userId) throw new NoPermissionError();

    return server;
  }

  async createChannel(serverId: string, name: string): Promise<ChannelEntity> {
    const last = await this.channel.findLastByServerId(serverId);
    const order = last ? last.order + 1 : 1;
    return this.channel.create({ serverId, name, order });
  }

  async updateChannel(
    channelId: string,
    serverId: string,
    name: string,
  ): Promise<ChannelEntity> {
    const channel = await this.channel.findByIdAndServerId(channelId, serverId);
    if (!channel) throw new NotFoundError('Channel');
    const updated = await this.channel.update(channelId, { name });
    if (!updated) throw new NotFoundError('Channel');
    return updated;
  }

  async deleteChannel(channelId: string, serverId: string): Promise<void> {
    const channel = await this.channel.findByIdAndServerId(channelId, serverId);
    if (!channel) throw new NotFoundError('Channel');
    await this.channel.deleteById(channelId);
  }
}
