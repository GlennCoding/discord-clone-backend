import jwt from 'jsonwebtoken';

import { env } from '../utils/env';

export class AuthService {
  issueAuthTokens(user: { id: string }) {
    const accessToken = this.issueAccessToken(user);
    const ssrAccessToken = this.issueSsrAccessToken(user);
    const refreshToken = this.issueRefreshToken(user);
    return { accessToken, ssrAccessToken, refreshToken };
  }

  issueAccessToken(user: { id: string }) {
    return jwt.sign(
      { UserInfo: { userId: user.id } },
      env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15min' },
    );
  }

  issueSsrAccessToken(user: { id: string }) {
    return jwt.sign(
      { UserInfo: { userId: user.id } },
      env.SSR_ACCESS_TOKEN_SECRET as string,
      { expiresIn: '24hrs' },
    );
  }

  issueRefreshToken(user: { id: string }) {
    return jwt.sign(
      { userId: user.id },
      env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '7days' },
    );
  }
}

export const authService = new AuthService();

export const issueAuthTokens = (user: { id?: any }) =>
  authService.issueAuthTokens({ id: String(user.id) });
export const issueAccessToken = (user: { id?: any }) =>
  authService.issueAccessToken({ id: String(user.id) });
export const issueSsrAccessToken = (user: { id?: any }) =>
  authService.issueSsrAccessToken({ id: String(user.id) });
export const issueRefreshToken = (user: { id?: any }) =>
  authService.issueRefreshToken({ id: String(user.id) });
