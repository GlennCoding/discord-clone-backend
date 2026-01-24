import { FlattenMaps } from "mongoose";
import User, { IUser } from "../models/User";
import { UserEntity } from "../types/entities";
import { UserRepository } from "./userRepository";

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
    const doc = await User.findById(id).lean();
    return doc ? mapMessageDocToEntity(doc) : null;
  }
}

export default MongooseUserRepository;
