import Channel from '../models/Channel';
import ChannelMessage from '../models/ChannelMessage';
import Member from '../models/Member';
import Role from '../models/Role';
import Server from '../models/Server';
import { parseObjectId } from '../utils/helper';
import { withTransaction } from './transactionHelper';

import type { CreateServerData, ServerRepository, UpdateServerData } from './serverRepository';
import type { IChannel } from '../models/Channel';
import type { IMember } from '../models/Member';
import type { IRole } from '../models/Role';
import type { IServer } from '../models/Server';
import type { IUser } from '../models/User';
import type {
  ChannelEntity,
  MemberEntity,
  PopulatedMemberEntity,
  RoleEntity,
  ServerEntity,
} from '../types/entities';
import type { FlattenMaps, Types } from 'mongoose';

type LeanServer = FlattenMaps<IServer> & { _id: Types.ObjectId };
type LeanChannel = FlattenMaps<IChannel> & { _id: Types.ObjectId };
type LeanRole = FlattenMaps<IRole> & { _id: Types.ObjectId };
type LeanMember = FlattenMaps<IMember> & { _id: Types.ObjectId };
type PopulatedLeanMember = LeanMember & {
  user: FlattenMaps<IUser> & { _id: Types.ObjectId };
  roles: LeanRole[];
};

const mapServer = (doc: LeanServer): ServerEntity => ({
  id: doc._id.toString(),
  name: doc.name,
  shortId: doc.shortId,
  iconUrl: doc.iconUrl,
  ownerId: doc.owner.toString(),
  description: doc.description,
  isPublic: doc.isPublic,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? undefined,
});

const mapChannel = (doc: LeanChannel): ChannelEntity => ({
  id: doc._id.toString(),
  serverId: doc.server.toString(),
  name: doc.name,
  order: doc.order,
  disallowedRoleIds: (doc.disallowedRoles as unknown as Types.ObjectId[]).map((r) => r.toString()),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? undefined,
});

const mapRole = (doc: LeanRole): RoleEntity => ({
  id: doc._id.toString(),
  serverId: doc.server.toString(),
  name: doc.name,
  permissions: doc.permissions ?? [],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? undefined,
});

const mapMember = (doc: LeanMember): MemberEntity => ({
  id: doc._id.toString(),
  serverId: doc.server.toString(),
  userId: doc.user.toString(),
  nickname: doc.nickname,
  roleIds: (doc.roles as unknown as Types.ObjectId[]).map((r) => r.toString()),
  joinedDate: doc.joinedDate,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? undefined,
});

const mapPopulatedMember = (doc: PopulatedLeanMember): PopulatedMemberEntity => ({
  id: doc._id.toString(),
  serverId: doc.server.toString(),
  userId: doc.user._id.toString(),
  nickname: doc.nickname,
  roleIds: (doc.roles as unknown as Types.ObjectId[]).map((r) => r._id.toString()),
  joinedDate: doc.joinedDate,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? undefined,
  user: {
    id: doc.user._id.toString(),
    userName: doc.user.userName,
    avatar: doc.user.avatar,
  },
  roles: doc.roles.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    permissions: r.permissions ?? [],
  })),
});

class MongooseServerRepository implements ServerRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await Server.findById(_id).lean<LeanServer>();
    return doc ? mapServer(doc) : null;
  }

  async findByShortId(shortId: string) {
    const doc = await Server.findOne({ shortId }).lean<LeanServer>();
    return doc ? mapServer(doc) : null;
  }

  async shortIdExists(shortId: string) {
    return !!(await Server.exists({ shortId }));
  }

  async findAllPublic() {
    const docs = await Server.find({ isPublic: true }).lean<LeanServer[]>();
    return docs.map(mapServer);
  }

  async findJoinedByUserId(userId: string) {
    const _userId = parseObjectId(userId);
    const members = await Member.find({ user: _userId })
      .populate<{ server: IServer }>('server')
      .lean();
    return members
      .filter((m) => m.server)
      .map((m) => mapServer(m.server as unknown as LeanServer));
  }

  async create(data: CreateServerData) {
    const doc = await Server.create({
      name: data.name,
      description: data.description,
      isPublic: data.isPublic,
      owner: parseObjectId(data.ownerId),
      shortId: data.shortId,
    });
    const lean = await Server.findById(doc._id).lean<LeanServer>();
    if (!lean) throw new Error('Server not found after create');
    return mapServer(lean);
  }

  async update(id: string, data: UpdateServerData) {
    const _id = parseObjectId(id);
    const doc = await Server.findByIdAndUpdate(
      _id,
      { $set: { name: data.name, description: data.description, isPublic: data.isPublic } },
      { new: true, runValidators: true },
    ).lean<LeanServer>();
    return doc ? mapServer(doc) : null;
  }

  async deleteWithRelated(serverId: string) {
    const _id = parseObjectId(serverId);
    const channelIds = await Channel.find({ server: _id }).distinct('_id');
    await withTransaction(async (session) => {
      await Promise.all([
        ChannelMessage.deleteMany({ channel: { $in: channelIds } }, { session }),
        Channel.deleteMany({ server: _id }, { session }),
        Role.deleteMany({ server: _id }, { session }),
        Member.deleteMany({ server: _id }, { session }),
        Server.findByIdAndDelete(_id, { session }),
      ]);
    });
  }

  async getChannels(serverId: string) {
    const _id = parseObjectId(serverId);
    const docs = await Channel.find({ server: _id }).lean<LeanChannel[]>();
    return docs.map(mapChannel);
  }

  async getChannelsSorted(serverId: string) {
    const _id = parseObjectId(serverId);
    const docs = await Channel.find({ server: _id }).sort({ order: 1 }).lean<LeanChannel[]>();
    return docs.map(mapChannel);
  }

  async getMembers(serverId: string) {
    const _id = parseObjectId(serverId);
    const docs = await Member.find({ server: _id })
      .populate<{ user: IUser }>('user', 'userName avatar')
      .populate<{ roles: IRole[] }>('roles', '_id name permissions')
      .lean<PopulatedLeanMember[]>();
    return docs.map(mapPopulatedMember);
  }

  async findMember(serverId: string, userId: string) {
    const _serverId = parseObjectId(serverId);
    const _userId = parseObjectId(userId);
    const doc = await Member.findOne({ server: _serverId, user: _userId }).lean<LeanMember>();
    return doc ? mapMember(doc) : null;
  }

  async findPopulatedMember(serverId: string, userId: string) {
    const _serverId = parseObjectId(serverId);
    const _userId = parseObjectId(userId);
    const doc = await Member.findOne({ server: _serverId, user: _userId })
      .populate<{ user: IUser }>('user', 'userName avatar')
      .populate<{ roles: IRole[] }>('roles', '_id name permissions')
      .lean<PopulatedLeanMember>();
    return doc ? mapPopulatedMember(doc) : null;
  }

  async createMember(serverId: string, userId: string) {
    const doc = await Member.create({
      server: parseObjectId(serverId),
      user: parseObjectId(userId),
    });
    const lean = await Member.findById(doc._id).lean<LeanMember>();
    if (!lean) throw new Error('Member not found after create');
    return mapMember(lean);
  }

  async getRoles(serverId: string) {
    const _id = parseObjectId(serverId);
    const docs = await Role.find({ server: _id }).lean<LeanRole[]>();
    return docs.map(mapRole);
  }
}

export default MongooseServerRepository;
