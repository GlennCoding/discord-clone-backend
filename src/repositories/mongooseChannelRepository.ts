import Channel from '../models/Channel';
import ChannelMessage from '../models/ChannelMessage';
import { parseObjectId } from '../utils/helper';
import { withTransaction } from './transactionHelper';

import type { ChannelRepository, CreateChannelData, UpdateChannelData } from './channelRepository';
import type { IChannel } from '../models/Channel';
import type { ChannelEntity } from '../types/entities';
import type { FlattenMaps, Types } from 'mongoose';

type LeanChannel = FlattenMaps<IChannel> & { _id: Types.ObjectId };

const mapChannel = (doc: LeanChannel): ChannelEntity => ({
  id: doc._id.toString(),
  serverId: doc.server.toString(),
  name: doc.name,
  order: doc.order,
  disallowedRoleIds: (doc.disallowedRoles as unknown as Types.ObjectId[]).map((r) => r.toString()),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? undefined,
});

class MongooseChannelRepository implements ChannelRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await Channel.findById(_id).lean<LeanChannel>();
    return doc ? mapChannel(doc) : null;
  }

  async findByServerId(serverId: string) {
    const _id = parseObjectId(serverId);
    const docs = await Channel.find({ server: _id }).lean<LeanChannel[]>();
    return docs.map(mapChannel);
  }

  async findLastByServerId(serverId: string) {
    const _id = parseObjectId(serverId);
    const doc = await Channel.findOne({ server: _id }).sort('-order').lean<LeanChannel>();
    return doc ? mapChannel(doc) : null;
  }

  async findByIdAndServerId(id: string, serverId: string) {
    const _id = parseObjectId(id);
    const _serverId = parseObjectId(serverId);
    const doc = await Channel.findOne({ _id, server: _serverId }).lean<LeanChannel>();
    return doc ? mapChannel(doc) : null;
  }

  async create(data: CreateChannelData) {
    const doc = await Channel.create({
      server: parseObjectId(data.serverId),
      name: data.name,
      order: data.order,
    });
    const lean = await Channel.findById(doc._id).lean<LeanChannel>();
    if (!lean) throw new Error('Channel not found after create');
    return mapChannel(lean);
  }

  async update(id: string, data: UpdateChannelData) {
    const _id = parseObjectId(id);
    const doc = await Channel.findByIdAndUpdate(
      _id,
      { $set: { name: data.name } },
      { new: true, runValidators: true },
    ).lean<LeanChannel>();
    return doc ? mapChannel(doc) : null;
  }

  async deleteById(id: string) {
    const _id = parseObjectId(id);
    await withTransaction(async (session) => {
      await ChannelMessage.deleteMany({ channel: _id }, { session });
      await Channel.findByIdAndDelete(_id, { session });
    });
    return true;
  }
}

export default MongooseChannelRepository;
