import RefreshToken from "../models/RefreshToken";
import User from "../models/User";
import { parseObjectId } from "../utils/helper";

import type { UserRepository } from "./userRepository";
import type { IUser } from "../models/User";
import type { UserEntity } from "../types/entities";
import type { FlattenMaps } from "mongoose";

const mapToEntity = (doc: FlattenMaps<IUser>): UserEntity => ({
  id: doc._id.toString(),
  userName: doc.userName,
  password: doc.password,
  status: doc.status,
  avatar: doc.avatar,
});

class MongooseUserRepository implements UserRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await User.findById(_id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findManyByIds(ids: string[]) {
    const _ids = ids.map(parseObjectId);
    const docs = await User.find({ _id: { $in: _ids } }).lean();
    return docs.map(mapToEntity);
  }

  async findByUserName(userName: string) {
    const doc = await User.findOne({ userName }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findByRefreshToken(hashedToken: string) {
    const rt = await RefreshToken.findOne({ token: hashedToken }).lean();
    if (!rt) return null;
    const doc = await User.findById(rt.userId).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async create(userName: string, hashedPassword: string) {
    const saved = await new User({ userName, password: hashedPassword }).save();
    const doc = await User.findById(saved._id).lean();
    if (!doc) throw new Error("User not found after create");
    return mapToEntity(doc);
  }

  async saveRefreshToken(userId: string, hashedToken: string, expiresAt: Date) {
    const _userId = parseObjectId(userId);
    await RefreshToken.create({ token: hashedToken, userId: _userId, expiresAt });
  }

  async removeRefreshToken(userId: string, hashedToken: string) {
    const _userId = parseObjectId(userId);
    await RefreshToken.deleteOne({ token: hashedToken, userId: _userId });
  }

  async removeAllRefreshTokens(userId: string) {
    const _userId = parseObjectId(userId);
    await RefreshToken.deleteMany({ userId: _userId });
  }

  async replaceRefreshToken(
    userId: string,
    oldHashedToken: string,
    newHashedToken: string,
    expiresAt: Date,
  ) {
    const _userId = parseObjectId(userId);
    await RefreshToken.deleteOne({ token: oldHashedToken, userId: _userId });
    await RefreshToken.create({ token: newHashedToken, userId: _userId, expiresAt });
  }

  async updateAvatar(userId: string, avatar: { filePath: string; url: string } | undefined) {
    const _id = parseObjectId(userId);
    const update = avatar ? { $set: { avatar } } : { $unset: { avatar: 1 } };
    const doc = await User.findByIdAndUpdate(_id, update, {
      new: true,
      runValidators: true,
    }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async updateStatus(userId: string, status: string) {
    const _id = parseObjectId(userId);
    const doc = await User.findByIdAndUpdate(
      _id,
      { $set: { status } },
      // "new" to create new document and return it (otherwise returns original doc)
      // "runValidators" to validates schema rules (UPDATE skips validation if not explicitly set, whereas CREATE runs validators automatically)
      { new: true, runValidators: true },
    ).lean();
    return doc ? mapToEntity(doc) : null;
  }
}

export default MongooseUserRepository;
