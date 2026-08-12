import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import type { Role } from '@online-platform/database';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, process.env['JWT_ACCESS_SECRET'] as string, {
    expiresIn: process.env['ACCESS_TOKEN_TTL'] as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(
    token,
    process.env['JWT_ACCESS_SECRET'] as string,
  ) as AccessTokenPayload;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signRefreshToken(userId: string): {
  token: string;
  jti: string;
} {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: userId, jti },
    process.env['JWT_REFRESH_SECRET'] as string,
    {
      expiresIn: process.env[
        'REFRESH_TOKEN_TTL'
      ] as jwt.SignOptions['expiresIn'],
    },
  );
  return { token, jti };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(
    token,
    process.env['JWT_REFRESH_SECRET'] as string,
  ) as RefreshTokenPayload;
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * unitMs[match[2]];
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(
    Date.now() + parseDurationToMs(process.env['REFRESH_TOKEN_TTL'] as string),
  );
}

/**
 * Общие опции refresh-cookie.
 *
 * `domain` подставляется только если COOKIE_DOMAIN реально задан: атрибут
 * Domain со значением без точки (например `localhost`) клиенты обрабатывают
 * ненадёжно и часто отбрасывают такую cookie целиком. Без Domain cookie
 * становится host-only — привязанной к выдавшему её хосту, что и нужно
 * в разработке. Заполнять COOKIE_DOMAIN стоит только в проде, когда фронт
 * и API живут на разных поддоменах общего домена.
 */
function refreshCookieOptions() {
  const cookieDomain = process.env['COOKIE_DOMAIN'];

  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax' as const,
    path: '/auth',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    ...refreshCookieOptions(),
    maxAge: parseDurationToMs(process.env['REFRESH_TOKEN_TTL'] as string),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', refreshCookieOptions());
}
