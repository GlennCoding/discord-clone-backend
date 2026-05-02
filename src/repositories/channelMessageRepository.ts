import type { ChannelMessageEntity } from '../types/entities';

export interface CreateChannelMessageData {
  channelId: string;
  senderId: string;
  text: string;
}

export interface ChannelMessageRepository {
  findById(id: string): Promise<ChannelMessageEntity | null>;
  findRecentByChannelId(channelId: string, limit: number): Promise<ChannelMessageEntity[]>;
  create(data: CreateChannelMessageData): Promise<ChannelMessageEntity>;
  deleteById(id: string): Promise<void>;
  deleteManyByChannelId(channelId: string): Promise<void>;
}
