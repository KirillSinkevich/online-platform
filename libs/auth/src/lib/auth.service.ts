import { prisma, Role, type Prisma } from '@online-platform/database';
import { HttpError } from '@online-platform/shared';
import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword } from './password.js';
import {
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiryDate,
  verifyRefreshToken,
} from './tokens.js';
import type {
  RegisterInput,
  LoginInput,
  CreateInviteInput,
} from './auth.schemas.js';

export async function register(input: RegisterInput) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token: input.token },
  });

  if (!invite || invite.revokedAt !== null || invite.expiresAt < new Date()) {
    throw new HttpError(400, 'Invite is invalid or expired');
  }
  if (invite.useCount >= invite.maxUses) {
    throw new HttpError(400, 'Invite has already been used');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) {
    throw new HttpError(409, 'Email is already in use');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: Role.STUDENT,
          firstName: input.firstName,
          lastName: input.lastName,
          teacherId: invite.teacherId,
        },
      });
      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      });
      return createdUser;
    },
  );

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token: refreshToken, jti } = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      jti,
      userId: user.id,
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, 'Invalid refresh token');
  }

  const existing = await prisma.refreshToken.findUnique({
    where: { jti: payload.jti },
  });

  if (!existing || existing.revokedAt !== null) {
    // Токен либо никогда не существовал в базе, либо уже был использован/отозван —
    // подпись при этом валидна (иначе упали бы выше), значит это либо баг, либо
    // кто-то повторно использует украденный refresh-токен. В любом случае отзываем
    // ВСЕ токены этого пользователя — цепочку доверия для него считаем скомпрометированной.
    await prisma.refreshToken.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new HttpError(401, 'Refresh token reuse detected');
  }

  if (existing.expiresAt < new Date()) {
    throw new HttpError(401, 'Refresh token expired');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new HttpError(401, 'User no longer exists');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token: newRefreshToken, jti: newJti } = signRefreshToken(user.id);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.refreshToken.update({
      where: { jti: payload.jti },
      data: { revokedAt: new Date(), replacedBy: newJti },
    });
    await tx.refreshToken.create({
      data: {
        jti: newJti,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string | undefined) {
  if (!token) return;

  try {
    const payload = verifyRefreshToken(token);
    await prisma.refreshToken.updateMany({
      where: { jti: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Токен невалиден/просрочен — logout всё равно должен быть "успешным" с точки
    // зрения пользователя (он и так выходит), поэтому просто игнорируем ошибку.
  }
}

export async function createInvite(
  teacherId: string,
  input: CreateInviteInput,
) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + input.expiresInHours * 3_600_000);

  const invite = await prisma.inviteToken.create({
    data: {
      token,
      teacherId,
      maxUses: input.maxUses,
      expiresAt,
    },
  });

  return {
    token: invite.token,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    teacherId: user.teacherId,
  };
}
