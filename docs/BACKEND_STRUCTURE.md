# Backend структура (упрощенная архитектура)

> Документация по структуре backend приложения без DDD

---

## 📋 Содержание

- [Обзор](#обзор)
- [Структура проекта](#структура-проекта)
- [Пример модуля](#пример-модуля)
- [Валидация](#валидация)
- [Работа с Prisma](#работа-с-prisma)
- [Best Practices](#best-practices)

---

## 🎯 Обзор

Используется **упрощенная 2-слойная архитектура**:

1. **Controller Layer** — обработка HTTP запросов, валидация
2. **Service Layer** — бизнес-логика + прямые Prisma queries

**Преимущества:**

- ✅ Простота и понятность
- ✅ Быстрая разработка MVP
- ✅ Меньше boilerplate кода
- ✅ Легко рефакторить в DDD при необходимости

---

## 📁 Структура проекта

```text
apps/backend/src/
├── prisma/
│   ├── schema.prisma             # Схема БД (см. docs/PRISMA_USAGE.md)
│   ├── migrations/               # Миграции
│   └── seed.ts                   # Seed данные
│
├── app/
│   ├── modules/                  # Feature модули
│   │   ├── auth/
│   │   │   ├── auth.controller.ts    # Express routes
│   │   │   ├── auth.service.ts       # Логика + Prisma
│   │   │   ├── auth.validation.ts    # express-validator
│   │   │   └── auth.types.ts         # TypeScript types
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.validation.ts
│   │   │   └── users.types.ts
│   │   │
│   │   └── rooms/
│   │       ├── rooms.controller.ts
│   │       ├── rooms.service.ts
│   │       ├── rooms.validation.ts
│   │       └── rooms.types.ts
│   │
│   ├── common/
│   │   ├── prisma.service.ts         # PrismaClient singleton
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   └── utils/
│   │       ├── bcrypt.util.ts
│   │       ├── jwt.util.ts
│   │       └── response.util.ts
│   │
│   └── app.ts                        # Express app setup
│
└── main.ts                           # Entry point
```

---

## 📝 Пример модуля (Auth)

### 1. Controller

```typescript
// apps/backend/src/app/modules/auth/auth.controller.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { validateRequest } from '../../common/middleware/zod-validation.middleware';

// Import из shared library
import {
  RegisterRequestSchema,
  RegisterRequest,
  LoginRequestSchema,
  LoginRequest,
} from '@org/shared/schemas';

export class AuthController {
  public router: Router;
  private authService: AuthService;

  constructor() {
    this.router = Router();
    this.authService = new AuthService();
    this.initRoutes();
  }

  private initRoutes() {
    this.router.post(
      '/register',
      validateRequest(RegisterRequestSchema, 'body'),
      this.register.bind(this),
    );

    this.router.post(
      '/login',
      validateRequest(LoginRequestSchema, 'body'),
      this.login.bind(this),
    );

    this.router.post('/logout', this.logout.bind(this));
  }

  private register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // Тип уже валидирован middleware
      const data = req.body as RegisterRequest;
      const result = await this.authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  private login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as LoginRequest;
      const result = await this.authService.login(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  private logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: invalidate refresh token
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };
}
```

### 2. Service

```typescript
// apps/backend/src/app/modules/auth/auth.service.ts
import { prisma } from '../../common/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Import из shared library
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
} from '@org/shared/schemas';

export class AuthService {
  async register(input: RegisterRequest): Promise<RegisterResponse> {
    // 1. Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // 2. Хеширование пароля
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: passwordHash,
        name: input.name,
        role: input.role || 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 4. Генерация токенов
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    // 1. Найти пользователя
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    // 2. Проверить пароль
    const isValidPassword = await bcrypt.compare(input.password, user.password);

    if (!isValidPassword) {
      throw new Error('Неверный email или пароль');
    }

    // 3. Генерация токенов
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET || 'secret', {
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'secret', {
      expiresIn: '7d',
    });
  }
}
```

### 3. Validation (Zod из libs/shared)

**Важно:** Валидация использует **Shared Zod Schemas** из `libs/shared/schemas`.

Все схемы уже определены в shared library:

- `RegisterRequestSchema`
- `LoginRequestSchema`
- `RegisterResponseSchema`
- `LoginResponseSchema`

**См. подробнее:** [SHARED_ZOD_SCHEMAS.md](./SHARED_ZOD_SCHEMAS.md)

---

## ✅ Валидация (Zod)

### Zod Validation Middleware

```typescript
// apps/backend/src/app/common/middleware/zod-validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export type ValidationTarget = 'body' | 'query' | 'params';

export const validateRequest = (
  schema: ZodSchema,
  target: ValidationTarget = 'body',
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Валидация и парсинг
      const validated = await schema.parseAsync(req[target]);

      // Замена оригинального объекта на валидированный
      req[target] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      next(error);
    }
  };
};
```

**Схемы валидации:** см. [SHARED_ZOD_SCHEMAS.md](./SHARED_ZOD_SCHEMAS.md)

---

## 🗄️ Работа с Prisma

### PrismaClient Singleton

```typescript
// apps/backend/src/app/common/prisma.service.ts
import { PrismaClient } from '@prisma/client';

class PrismaService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
      });

      process.on('beforeExit', async () => {
        await PrismaService.instance.$disconnect();
      });
    }

    return PrismaService.instance;
  }
}

export const prisma = PrismaService.getInstance();
```

### Использование в Service

```typescript
import { prisma } from '../../common/prisma.service';

export class RoomsService {
  async createRoom(ownerId: string, data: CreateRoomInput) {
    return await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt,
        maxParticipants: data.maxParticipants || 10,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findRooms(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where: {
          status: filters.status as any,
        },
        skip,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.room.count({
        where: {
          status: filters.status as any,
        },
      }),
    ]);

    return {
      rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
```

---

## ✅ Best Practices

### 1. Всегда используйте select в Prisma

```typescript
// ❌ Плохо - возвращает password
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Хорошо - явно указываем поля
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    avatar: true,
    // password: false
  },
});
```

### 2. Обрабатывайте ошибки Prisma

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.user.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new Error('Email уже существует');
    }
  }
  throw error;
}
```

### 3. Используйте транзакции для связанных операций

```typescript
await prisma.$transaction([
  prisma.roomMember.deleteMany({ where: { roomId } }),
  prisma.room.delete({ where: { id: roomId } }),
]);
```

### 4. Создавайте TypeScript types для ответов

```typescript
import { Prisma } from '@prisma/client';

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
} as const;

export type UserPublic = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;
```

### 5. Используйте environment variables

```typescript
// ❌ Плохо
const token = jwt.sign({ userId }, 'hardcoded-secret');

// ✅ Хорошо
const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret');
```

---

## 🔄 Error Handling

### Global Error Middleware

```typescript
// apps/backend/src/app/common/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('Error:', error);

  if (error.message.includes('уже существует')) {
    return res.status(409).json({ error: error.message });
  }

  if (error.message.includes('не найден')) {
    return res.status(404).json({ error: error.message });
  }

  if (error.message.includes('Неверный')) {
    return res.status(401).json({ error: error.message });
  }

  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
  });
};
```

---

## 📚 Связанная документация

- [Prisma Usage](./PRISMA_USAGE.md) — работа с Prisma ORM
- [Architecture](./ARCHITECTURE.md) — общая архитектура проекта

---

**Последнее обновление:** 2025-01-29
