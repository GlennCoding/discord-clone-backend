import type { ChannelEntity, MemberEntity, PopulatedMemberEntity, RoleEntity, ServerEntity } from '../types/entities';

export interface CreateServerData {
  name: string;
  description?: string;
  isPublic: boolean;
  ownerId: string;
  shortId: string;
}

export interface UpdateServerData {
  name: string;
  description?: string;
  isPublic: boolean;
}

export interface ServerRepository {
  findById(id: string): Promise<ServerEntity | null>;
  findByShortId(shortId: string): Promise<ServerEntity | null>;
  shortIdExists(shortId: string): Promise<boolean>;
  findAllPublic(): Promise<ServerEntity[]>;
  findJoinedByUserId(userId: string): Promise<ServerEntity[]>;
  create(data: CreateServerData): Promise<ServerEntity>;
  update(id: string, data: UpdateServerData): Promise<ServerEntity | null>;
  deleteWithRelated(serverId: string): Promise<void>;

  getChannels(serverId: string): Promise<ChannelEntity[]>;
  getChannelsSorted(serverId: string): Promise<ChannelEntity[]>;
  getMembers(serverId: string): Promise<PopulatedMemberEntity[]>;
  findMember(serverId: string, userId: string): Promise<MemberEntity | null>;
  findPopulatedMember(serverId: string, userId: string): Promise<PopulatedMemberEntity | null>;
  createMember(serverId: string, userId: string): Promise<MemberEntity>;
  getRoles(serverId: string): Promise<RoleEntity[]>;
}
