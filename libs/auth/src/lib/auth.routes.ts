import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from './middleware/authenticate.js';
import { requireRole } from './middleware/requireRole.js';
import { Role } from '@online-platform/database';

export const authRouter: Router = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);

authRouter.get('/me', authenticate, authController.getMe);
authRouter.post(
  '/invites',
  authenticate,
  requireRole(Role.TEACHER),
  authController.createInvite,
);
