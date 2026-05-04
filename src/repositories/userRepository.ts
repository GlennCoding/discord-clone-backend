import type { UserEntity } from '../types/entities';

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findManyByIds(ids: string[]): Promise<UserEntity[]>;
  findByUserName(userName: string): Promise<UserEntity | null>;
  findByRefreshToken(refreshToken: string): Promise<UserEntity | null>;
  create(userName: string, hashedPassword: string): Promise<UserEntity>;
  saveRefreshToken(userId: string, hashedToken: string): Promise<void>;
  removeRefreshToken(userId: string, hashedToken: string, rawToken: string): Promise<void>;
  removeAllRefreshTokens(userId: string): Promise<void>;
  replaceRefreshToken(userId: string, oldHashedToken: string, newHashedToken: string): Promise<void>;
  updateAvatar(userId: string, avatar: { filePath: string; url: string } | undefined): Promise<UserEntity | null>;
  updateStatus(userId: string, status: string): Promise<UserEntity | null>;
}
