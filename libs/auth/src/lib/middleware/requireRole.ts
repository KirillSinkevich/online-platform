import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@online-platform/database';
import { HttpError } from '@online-platform/shared';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpError(401, 'Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'Insufficient permissions');
    }
    next();
  };
}
