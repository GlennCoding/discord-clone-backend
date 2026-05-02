import type { ChannelEntity } from '../types/entities';

export interface CreateChannelData {
  serverId: string;
  name: string;
  order: number;
}

export interface UpdateChannelData {
  name: string;
}

export interface ChannelRepository {
  findById(id: string): Promise<ChannelEntity | null>;
  findByServerId(serverId: string): Promise<ChannelEntity[]>;
  findLastByServerId(serverId: string): Promise<ChannelEntity | null>;
  findByIdAndServerId(id: string, serverId: string): Promise<ChannelEntity | null>;
  create(data: CreateChannelData): Promise<ChannelEntity>;
  update(id: string, data: UpdateChannelData): Promise<ChannelEntity | null>;
  deleteById(id: string): Promise<boolean>;
}
