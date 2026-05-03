import ChannelMessage from '../models/ChannelMessage';
import { decodeCursor } from '../utils/cursors';
import { parseObjectId } from '../utils/helper';

import type {
  ChannelMessageRepository,
  CreateChannelMessageData,
} from './channelMessageRepository';
import type { IChannel } from '../models/Channel';
import type { IChannelMessage } from '../models/ChannelMessage';
import type { IMember } from '../models/Member';
import type { IUser } from '../models/User';
import type { ChannelMessageEntity } from '../types/entities';
import type { FlattenMaps, Types } from 'mongoose';

type PopulatedLeanMessage = FlattenMaps<IChannelMessage> & {
  _id: Types.ObjectId;
  channel: FlattenMaps<IChannel> & { _id: Types.ObjectId };
  sender: FlattenMaps<IMember> & {
    _id: Types.ObjectId;
    user: FlattenMaps<IUser> & { _id: Types.ObjectId };
  };
  createdAt: Date;
  updatedAt?: Date;
};

const mapMessage = (doc: PopulatedLeanMessage): ChannelMessageEntity => ({
  id: doc._id.toString(),
  channelId: doc.channel._id.toString(),
  senderId: doc.sender._id.toString(),
  senderDisplayName: doc.sender.nickname || doc.sender.user.userName,
  senderAvatarUrl: doc.sender.user.avatar?.url,
  text: doc.text,
  attachments: doc.attachments?.map((a) => ({
    path: (a as any).path ?? '',
    downloadUrl: (a as any).downloadUrl ?? '',
  })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const populateOptions = [
  { path: 'sender', populate: { path: 'user', select: 'userName avatar' } },
  { path: 'channel', select: '_id' },
];

class MongooseChannelMessageRepository implements ChannelMessageRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await ChannelMessage.findById(_id)
      .populate(populateOptions)
      .lean<PopulatedLeanMessage>();
    return doc ? mapMessage(doc) : null;
  }

  async findRecentByChannelId(channelId: string, limit: number) {
    const _id = parseObjectId(channelId);
    const docs = await ChannelMessage.find({ channel: _id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(populateOptions)
      .lean<PopulatedLeanMessage[]>();
    return docs.reverse().map(mapMessage);
  }

  async findPageByChannelId(
    channelId: string,
    limit: number,
    beforeCursor?: string,
  ) {
    const channelOid = parseObjectId(channelId);

    const filter: Record<string, any> = { channel: channelOid };
    if (beforeCursor) {
      filter._id = { $lt: decodeCursor(beforeCursor) };
    }

    const docs = await ChannelMessage.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate(populateOptions)
      .lean<PopulatedLeanMessage[]>();

    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    return {
      messages: pageDocs.reverse().map(mapMessage),
      hasMore,
    };
  }

  async create(data: CreateChannelMessageData) {
    const doc = await ChannelMessage.create({
      channel: parseObjectId(data.channelId),
      sender: parseObjectId(data.senderId),
      text: data.text,
    });
    const populated = await ChannelMessage.findById(doc._id)
      .populate(populateOptions)
      .lean<PopulatedLeanMessage>();
    if (!populated) throw new Error('Channel message not found after create');
    return mapMessage(populated);
  }

  async deleteById(id: string) {
    const _id = parseObjectId(id);
    await ChannelMessage.findByIdAndDelete(_id);
  }

  async deleteManyByChannelId(channelId: string) {
    const _id = parseObjectId(channelId);
    await ChannelMessage.deleteMany({ channel: _id });
  }
}

export default MongooseChannelMessageRepository;
