import prisma from '../config/prismaClient';

import type { UserRepository } from './userRepository';
import type { UserEntity } from '../types/entities';
import type { User } from '../generated/prisma/client';

const REFRESH_TOKEN_LIMIT = 5;

const mapToEntity = (doc: User): UserEntity => ({
  id: doc.id,
  userName: doc.userName,
  password: doc.password,
  status: doc.status ?? undefined,
  avatar:
    doc.avatarFilePath && doc.avatarUrl
      ? { filePath: doc.avatarFilePath, url: doc.avatarUrl }
      : undefined,
  refreshTokens: doc.refreshTokens,
});

class PrismaUserRepository implements UserRepository {
  async findById(id: string) {
    const doc = await prisma.user.findUnique({ where: { id } });
    return doc ? mapToEntity(doc) : null;
  }

  async findByUserName(userName: string) {
    const doc = await prisma.user.findUnique({ where: { userName } });
    return doc ? mapToEntity(doc) : null;
  }

  async findByRefreshToken(refreshToken: string) {
    const doc = await prisma.user.findFirst({
      where: { refreshTokens: { has: refreshToken } },
    });
    return doc ? mapToEntity(doc) : null;
  }

  async create(userName: string, hashedPassword: string) {
    const doc = await prisma.user.create({
      data: { userName, password: hashedPassword },
    });
    return mapToEntity(doc);
  }

  async saveRefreshToken(userId: string, hashedToken: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const tokens = user.refreshTokens ?? [];
    if (!tokens.includes(hashedToken)) {
      tokens.push(hashedToken);
    }
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: tokens.slice(-REFRESH_TOKEN_LIMIT) },
    });
  }

  async removeRefreshToken(userId: string, hashedToken: string, rawToken: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokens: user.refreshTokens.filter((t) => t !== hashedToken && t !== rawToken),
      },
    });
  }

  async removeAllRefreshTokens(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshTokens: [] } });
  }

  async replaceRefreshToken(userId: string, oldHashedToken: string, newHashedToken: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const tokens = user.refreshTokens.filter((t) => t !== oldHashedToken);
    tokens.push(newHashedToken);
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: tokens.slice(-REFRESH_TOKEN_LIMIT) },
    });
  }

  async updateAvatar(userId: string, avatar: { filePath: string; url: string } | undefined) {
    const doc = await prisma.user.update({
      where: { id: userId },
      data: avatar
        ? { avatarFilePath: avatar.filePath, avatarUrl: avatar.url }
        : { avatarFilePath: null, avatarUrl: null },
    });
    return mapToEntity(doc);
  }

  async updateStatus(userId: string, status: string) {
    const doc = await prisma.user.update({ where: { id: userId }, data: { status } });
    return mapToEntity(doc);
  }
}

export default PrismaUserRepository;
