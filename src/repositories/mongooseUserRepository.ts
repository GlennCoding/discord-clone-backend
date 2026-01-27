import User from "../models/User";
import { parseObjectId } from "../utils/helper";

import type { UserRepository } from "./userRepository";
import type { IUser } from "../models/User";
import type { UserEntity } from "../types/entities";
import type { FlattenMaps } from "mongoose";

const mapMessageDocToEntity = (doc: FlattenMaps<IUser>): UserEntity => {
  const { _id, userName, password, status, avatar, refreshTokens } = doc;
  return {
    id: _id.toString(),
    userName,
    password,
    status,
    avatar,
    refreshTokens,
  };
};

class MongooseUserRepository implements UserRepository {
  async findById(id: string) {
    const _id = parseObjectId(id);
    const doc = await User.findById(_id).lean();
    return doc ? mapMessageDocToEntity(doc) : null;
  }
}

export default MongooseUserRepository;
