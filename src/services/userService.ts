import crypto from 'crypto';

import bcrypt from 'bcrypt';

import { InvalidCredentialsError, UserNotFoundError } from '../utils/errors';

import type { UserRepository } from '../repositories/userRepository';
import type { UserEntity } from '../types/entities';

const SALT_ROUNDS = 10;

const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export class UserService {
  constructor(private user: UserRepository) {}

  async createUser(userName: string, password: string): Promise<UserEntity> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return this.user.create(userName, hashedPassword);
  }

  async verifyUserPassword(userName: string, password: string): Promise<UserEntity> {
    const user = await this.user.findByUserName(userName);
    if (!user) throw new UserNotFoundError(userName);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new InvalidCredentialsError();

    return user;
  }

  async saveUserRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = hashRefreshToken(refreshToken);
    await this.user.saveRefreshToken(userId, hashedToken);
  }

  async removeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.user.removeAllRefreshTokens(userId);
  }

  async findUserWithRefreshToken(refreshToken: string): Promise<UserEntity | null> {
    const hashedToken = hashRefreshToken(refreshToken);
    return this.user.findByRefreshToken(hashedToken);
  }

  async findUserWithUserName(userName: string): Promise<UserEntity | null | undefined> {
    return this.user.findByUserName(userName);
  }

  async findUserWithUserId(userId: string): Promise<UserEntity | null | undefined> {
    return this.user.findById(userId);
  }

  async removeUserRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = hashRefreshToken(refreshToken);
    await this.user.removeRefreshToken(userId, hashedToken, refreshToken);
  }

  async replaceUserRefreshToken(
    userId: string,
    oldToken: string,
    newToken: string,
  ): Promise<void> {
    const oldHashedToken = hashRefreshToken(oldToken);
    const newHashedToken = hashRefreshToken(newToken);
    await this.user.replaceRefreshToken(userId, oldHashedToken, newHashedToken);
  }

  async removeAllUserRefreshTokensById(userId: string): Promise<void> {
    const user = await this.user.findById(userId);
    if (!user) return;
    await this.user.removeAllRefreshTokens(userId);
  }

  async updateStatus(userId: string, status: string): Promise<UserEntity | null> {
    return this.user.updateStatus(userId, status);
  }

  async updateAvatar(
    userId: string,
    avatar: { filePath: string; url: string } | undefined,
  ): Promise<UserEntity | null> {
    return this.user.updateAvatar(userId, avatar);
  }
}
