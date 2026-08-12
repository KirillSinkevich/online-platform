import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '@online-platform/shared';
import { verifyAccessToken, type AccessTokenPayload } from '../tokens.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
  }
}

export function authenticate(
  req: Request,
  _: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired access token');
  }

  next();
}
