import type { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  createInviteSchema,
} from './auth.schemas.js';
import * as authService from './auth.service.js';
import { setRefreshCookie, clearRefreshCookie } from './tokens.js';
import { HttpError, parseOrThrow } from '@online-platform/shared';
import type { AccessTokenPayload } from './tokens.js';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new HttpError(401, 'Not authenticated');
  }
  return req.user;
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(registerSchema, req.body);
  const user = await authService.register(input);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(loginSchema, req.body);
  const { user, accessToken, refreshToken } = await authService.login(input);

  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new HttpError(401, 'Refresh token is missing');
  }

  const { accessToken, refreshToken } = await authService.refresh(token);

  setRefreshCookie(res, refreshToken);
  res.json({ accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.cookies?.refreshToken);
  clearRefreshCookie(res);
  res.status(204).send();
}

export async function createInvite(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(createInviteSchema, req.body ?? {});
  const invite = await authService.createInvite(requireUser(req).sub, input);
  res.status(201).json(invite);
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(requireUser(req).sub);
  res.json(user);
}
