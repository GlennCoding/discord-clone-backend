import { CustomError, NotFoundError } from '../utils/errors';
import { ensureParam } from '../utils/helper';

import type { ChannelMessageRepository } from '../repositories/channelMessageRepository';
import type { ChannelRepository } from '../repositories/channelRepository';
import type { ServerRepository } from '../repositories/serverRepository';
import type { ChannelMessageDTO, ChannelSubscribeDTO } from '../types/dto';
import type { ChannelEntity, ChannelMessageEntity, PopulatedMemberEntity } from '../types/entities';

const CHANNEL_MESSAGE_HISTORY_LIMIT = 50;

const toChannelMessageDTO = (msg: ChannelMessageEntity): ChannelMessageDTO => ({
  id: msg.id,
  channelId: msg.channelId,
  text: msg.text ?? '',
  sender: {
    id: msg.senderId,
    username: msg.senderDisplayName,
    avatarUrl: msg.senderAvatarUrl,
  },
  createdAt: msg.createdAt.toISOString(),
  updatedAt: msg.updatedAt?.toISOString(),
  attachments: msg.attachments?.map((a) => ({ downloadUrl: a.downloadUrl })) ?? [],
});

export class ChannelMessageService {
  constructor(
    private channelMessage: ChannelMessageRepository,
    private channel: ChannelRepository,
    private server: ServerRepository,
  ) {}

  async ensureChannelAccess(
    channelIdParam: string,
    userId: string,
  ): Promise<{ channel: ChannelEntity; member: PopulatedMemberEntity }> {
    const channelId = ensureParam('channelId', channelIdParam, { isObjectId: true });

    const channel = await this.channel.findById(channelId);
    if (!channel) throw new NotFoundError('Channel');

    const member = await this.server.findPopulatedMember(channel.serverId, userId);
    if (!member) throw new CustomError(403, 'You are no member of this server');

    const hasRestrictedRole = channel.disallowedRoleIds.some((roleId) =>
      member.roleIds.includes(roleId),
    );
    if (hasRestrictedRole) throw new CustomError(403, 'You cannot access this channel');

    return { channel, member };
  }

  async fetchRecentMessages(channelId: string): Promise<ChannelMessageDTO[]> {
    const messages = await this.channelMessage.findRecentByChannelId(
      channelId,
      CHANNEL_MESSAGE_HISTORY_LIMIT,
    );
    return messages.map(toChannelMessageDTO);
  }

  async createMessage(
    channelId: string,
    memberId: string,
    text: string,
  ): Promise<ChannelMessageDTO> {
    const msg = await this.channelMessage.create({ channelId, senderId: memberId, text });
    return toChannelMessageDTO(msg);
  }

  buildSubscribePayload(channel: ChannelEntity, messages: ChannelMessageDTO[]): ChannelSubscribeDTO {
    return {
      serverId: channel.serverId,
      channel: { id: channel.id, name: channel.name, order: channel.order },
      messages,
    };
  }
}
