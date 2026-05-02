import User from '../models/User';
import { parseObjectId } from '../utils/helper';

import type { UserRepository } from './userRepository';
import type { IUser } from '../models/User';
import type { UserEntity } from '../types/entities';
import type { FlattenMaps } from 'mongoose';

const REFRESH_TOKEN_LIMIT = 5;

const mapToEntity = (doc: FlattenMaps<IUser>): UserEntity => ({
  id: doc._id.toString(),
  userName: doc.userName,
  password: doc.password,
  status: doc.status,
  avatar: doc.avatar,
  refreshTokens: doc.refreshTokens,
});

class MongooseUserRepository implements UserRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await User.findById(_id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findByUserName(userName: string) {
    const doc = await User.findOne({ userName }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findByRefreshToken(refreshToken: string) {
    const doc = await User.findOne({
      refreshTokens: { $in: [refreshToken] },
    }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async create(userName: string, hashedPassword: string) {
    const saved = await new User({ userName, password: hashedPassword }).save();
    const doc = await User.findById(saved._id).lean();
    if (!doc) throw new Error('User not found after create');
    return mapToEntity(doc);
  }

  async saveRefreshToken(userId: string, hashedToken: string) {
    const _id = parseObjectId(userId);
    const user = await User.findById(_id);
    if (!user) return;

    const tokens = user.refreshTokens ?? [];
    if (!tokens.includes(hashedToken)) {
      tokens.push(hashedToken);
    }
    user.refreshTokens = tokens.slice(-REFRESH_TOKEN_LIMIT);
    await user.save();
  }

  async removeRefreshToken(userId: string, hashedToken: string, rawToken: string) {
    const _id = parseObjectId(userId);
    const user = await User.findById(_id);
    if (!user) return;

    user.refreshTokens = (user.refreshTokens ?? []).filter(
      (t) => t !== hashedToken && t !== rawToken,
    );
    await user.save();
  }

  async removeAllRefreshTokens(userId: string) {
    const _id = parseObjectId(userId);
    await User.updateOne({ _id }, { $set: { refreshTokens: [] } });
  }

  async replaceRefreshToken(userId: string, oldHashedToken: string, newHashedToken: string) {
    const _id = parseObjectId(userId);
    const user = await User.findById(_id);
    if (!user) return;

    const tokens = (user.refreshTokens ?? []).filter((t) => t !== oldHashedToken);
    tokens.push(newHashedToken);
    user.refreshTokens = tokens.slice(-REFRESH_TOKEN_LIMIT);
    await user.save();
  }

  async updateAvatar(userId: string, avatar: { filePath: string; url: string } | undefined) {
    const _id = parseObjectId(userId);
    const update = avatar ? { $set: { avatar } } : { $unset: { avatar: 1 } };
    const doc = await User.findByIdAndUpdate(
      _id,
      update,
      { new: true, runValidators: true },
    ).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async updateStatus(userId: string, status: string) {
    const _id = parseObjectId(userId);
    const doc = await User.findByIdAndUpdate(
      _id,
      { $set: { status } },
      { new: true, runValidators: true },
    ).lean();
    return doc ? mapToEntity(doc) : null;
  }
}

export default MongooseUserRepository;
