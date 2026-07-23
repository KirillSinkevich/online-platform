# Shared Zod Schemas

> Общие Zod схемы для валидации на Frontend и Backend

---

## 📋 Содержание

- [Введение](#введение)
- [Структура](#структура)
- [Создание схем](#создание-схем)
- [Использование на Frontend](#использование-на-frontend)
- [Использование на Backend](#использование-на-backend)
- [Примеры схем](#примеры-схем)
- [Best Practices](#best-practices)

---

## 🎯 Введение

**Shared Zod Schemas** — единый источник валидации для всего приложения.

### Преимущества

- ✅ **Single Source of Truth** — одни схемы для frontend и backend
- ✅ **Type Safety** — автоматический вывод TypeScript типов
- ✅ **No Duplication** — не нужно писать валидацию дважды
- ✅ **Consistency** — одинаковые правила валидации везде
- ✅ **Nx Monorepo** — легкий import через `@org/shared/schemas`

### Архитектура

```text
┌────────────────────────────────────────────┐
│         libs/shared/schemas                │
│  ┌──────────────────────────────────────┐  │
│  │  RegisterSchema                      │  │
│  │  LoginSchema                         │  │
│  │  CreateRoomSchema                    │  │
│  │  + TypeScript types (z.infer)       │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
         ↓                           ↓
┌──────────────────┐       ┌──────────────────┐
│   Frontend       │       │    Backend       │
│   (Angular)      │       │   (Express)      │
├──────────────────┤       ├──────────────────┤
│ import {         │       │ import {         │
│  RegisterSchema  │       │  RegisterSchema  │
│ } from           │       │ } from           │
│ '@org/shared'    │       │ '@org/shared'    │
│                  │       │                  │
│ • Forms          │       │ • Middleware     │
│ • API responses  │       │ • Controllers    │
└──────────────────┘       └──────────────────┘
```

---

## 📁 Структура

```text
libs/shared/
├── src/
│   ├── lib/
│   │   ├── schemas/
│   │   │   ├── auth/
│   │   │   │   ├── register.schema.ts
│   │   │   │   ├── login.schema.ts
│   │   │   │   ├── user.schema.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── rooms/
│   │   │   │   ├── room.schema.ts
│   │   │   │   ├── create-room.schema.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── pagination.schema.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts              # Главный экспорт
│   │   │
│   │   ├── constants/
│   │   │   └── validation.constants.ts
│   │   │
│   │   └── types/
│   │       └── index.ts
│   │
│   └── index.ts                       # Public API
│
├── project.json
├── tsconfig.json
└── package.json
```

---

## 🔧 Создание схем

### Базовые Value Objects

```typescript
// libs/shared/src/lib/constants/validation.constants.ts

export const VALIDATION = {
  EMAIL: {
    MIN: 5,
    MAX: 100,
  },
  PASSWORD: {
    MIN: 8,
    MAX: 72,
  },
  NAME: {
    MIN: 2,
    MAX: 50,
  },
  ROOM_TITLE: {
    MIN: 3,
    MAX: 100,
  },
  ROOM_DESCRIPTION: {
    MAX: 500,
  },
} as const;
```

### Auth Schemas

```typescript
// libs/shared/src/lib/schemas/auth/user.schema.ts
import { z } from 'zod';
import { VALIDATION } from '../../constants/validation.constants';

// ============================================
// Base Value Object Schemas
// ============================================

export const EmailSchema = z
  .string()
  .min(VALIDATION.EMAIL.MIN, 'Email слишком короткий')
  .max(VALIDATION.EMAIL.MAX, 'Email слишком длинный')
  .email('Некорректный формат email')
  .toLowerCase()
  .trim();

export const PasswordSchema = z
  .string()
  .min(
    VALIDATION.PASSWORD.MIN,
    `Пароль должен содержать минимум ${VALIDATION.PASSWORD.MIN} символов`,
  )
  .max(VALIDATION.PASSWORD.MAX, 'Пароль слишком длинный')
  .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
  .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру');

export const NameSchema = z
  .string()
  .min(VALIDATION.NAME.MIN, 'Имя слишком короткое')
  .max(VALIDATION.NAME.MAX, 'Имя слишком длинное')
  .trim();

export const RoleSchema = z.enum(['TEACHER', 'STUDENT']);

// ============================================
// User Entity Schema
// ============================================

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  email: EmailSchema,
  name: NameSchema,
  role: RoleSchema,
  avatar: z.string().url().nullable(),
  createdAt: z.coerce.date(), // coerce для парсинга ISO string
  updatedAt: z.coerce.date(),
});

// ============================================
// Type Exports
// ============================================

export type UserPublic = z.infer<typeof UserPublicSchema>;
export type Role = z.infer<typeof RoleSchema>;
```

```typescript
// libs/shared/src/lib/schemas/auth/register.schema.ts
import { z } from 'zod';
import {
  EmailSchema,
  PasswordSchema,
  NameSchema,
  RoleSchema,
  UserPublicSchema,
} from './user.schema';

// ============================================
// Register Request/Response
// ============================================

export const RegisterRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string(),
    name: NameSchema,
    role: RoleSchema.default('STUDENT'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export const RegisterResponseSchema = z.object({
  user: UserPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

// ============================================
// Type Exports
// ============================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
```

```typescript
// libs/shared/src/lib/schemas/auth/login.schema.ts
import { z } from 'zod';
import { EmailSchema, UserPublicSchema } from './user.schema';

// ============================================
// Login Request/Response
// ============================================

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Введите пароль'),
});

export const LoginResponseSchema = z.object({
  user: UserPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

// ============================================
// Type Exports
// ============================================

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
```

```typescript
// libs/shared/src/lib/schemas/auth/index.ts
export * from './user.schema';
export * from './register.schema';
export * from './login.schema';
```

### Room Schemas

```typescript
// libs/shared/src/lib/schemas/rooms/room.schema.ts
import { z } from 'zod';
import { VALIDATION } from '../../constants/validation.constants';
import { UserPublicSchema } from '../auth/user.schema';

// ============================================
// Enums
// ============================================

export const RoomStatusSchema = z.enum(['SCHEDULED', 'ACTIVE', 'ENDED']);

// ============================================
// Room Entity Schema
// ============================================

export const RoomSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: RoomStatusSchema,
  scheduledAt: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  maxParticipants: z.number().int(),
  ownerId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const RoomWithOwnerSchema = RoomSchema.extend({
  owner: UserPublicSchema,
  _count: z
    .object({
      members: z.number().int(),
      messages: z.number().int(),
    })
    .optional(),
});

// ============================================
// Type Exports
// ============================================

export type Room = z.infer<typeof RoomSchema>;
export type RoomWithOwner = z.infer<typeof RoomWithOwnerSchema>;
export type RoomStatus = z.infer<typeof RoomStatusSchema>;
```

```typescript
// libs/shared/src/lib/schemas/rooms/create-room.schema.ts
import { z } from 'zod';
import { VALIDATION } from '../../constants/validation.constants';
import { RoomWithOwnerSchema } from './room.schema';

// ============================================
// Create Room Request/Response
// ============================================

export const CreateRoomRequestSchema = z.object({
  title: z
    .string()
    .min(VALIDATION.ROOM_TITLE.MIN, 'Название слишком короткое')
    .max(VALIDATION.ROOM_TITLE.MAX, 'Название слишком длинное')
    .trim(),
  description: z
    .string()
    .max(VALIDATION.ROOM_DESCRIPTION.MAX, 'Описание слишком длинное')
    .optional(),
  scheduledAt: z.string().datetime().optional(),
  maxParticipants: z.number().int().min(2).max(100).default(10),
});

export const CreateRoomResponseSchema = z.object({
  room: RoomWithOwnerSchema,
});

// ============================================
// Update Room Request/Response
// ============================================

export const UpdateRoomRequestSchema = z.object({
  title: z
    .string()
    .min(VALIDATION.ROOM_TITLE.MIN)
    .max(VALIDATION.ROOM_TITLE.MAX)
    .optional(),
  description: z
    .string()
    .max(VALIDATION.ROOM_DESCRIPTION.MAX)
    .nullable()
    .optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
});

export const UpdateRoomResponseSchema = z.object({
  room: RoomWithOwnerSchema,
});

// ============================================
// Type Exports
// ============================================

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof CreateRoomResponseSchema>;
export type UpdateRoomRequest = z.infer<typeof UpdateRoomRequestSchema>;
export type UpdateRoomResponse = z.infer<typeof UpdateRoomResponseSchema>;
```

```typescript
// libs/shared/src/lib/schemas/rooms/index.ts
export * from './room.schema';
export * from './create-room.schema';
```

### Common Schemas

```typescript
// libs/shared/src/lib/schemas/common/pagination.schema.ts
import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default('10'),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
```

### Main Export

```typescript
// libs/shared/src/lib/schemas/index.ts
export * from './auth';
export * from './rooms';
export * from './common';
```

```typescript
// libs/shared/src/index.ts
export * from './lib/schemas';
export * from './lib/constants/validation.constants';
```

---

## 🎨 Использование на Frontend

### В Angular Component

```typescript
// apps/web/src/app/features/auth/components/login/login.component.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ZodError } from 'zod';

// Import из shared library
import {
  LoginRequestSchema,
  LoginRequest,
  type LoginResponse,
} from '@org/shared/schemas';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: [''],
      password: [''],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    try {
      // Валидация с Zod
      const loginData: LoginRequest = LoginRequestSchema.parse(this.form.value);

      this.loading.set(true);
      this.error.set(null);

      this.authService.login(loginData).subscribe({
        next: (response: LoginResponse) => {
          localStorage.setItem('access_token', response.accessToken);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const firstError = err.errors[0];
        this.error.set(firstError.message);
      }
    }
  }
}
```

### В Angular Service (API)

```typescript
// apps/web/src/app/features/auth/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Import из shared library
import {
  LoginRequest,
  LoginResponse,
  LoginResponseSchema,
  RegisterRequest,
  RegisterResponse,
  RegisterResponseSchema,
} from '@org/shared/schemas';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post(`${this.apiUrl}/auth/login`, data).pipe(
      map((response) => LoginResponseSchema.parse(response)), // Валидация response
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post(`${this.apiUrl}/auth/register`, data)
      .pipe(map((response) => RegisterResponseSchema.parse(response)));
  }
}
```

---

## ⚙️ Использование на Backend

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

### В Express Controller

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
  }

  private async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Тип уже валидирован и гарантирован middleware
      const data = req.body as RegisterRequest;

      const result = await this.authService.register(data);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  private async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as LoginRequest;

      const result = await this.authService.login(data);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
```

### В Express Service

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
    // Проверка существования
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Создание пользователя
    const passwordHash = await bcrypt.hash(input.password, 10);

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

    // Генерация токенов
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginRequest): Promise<LoginResponse> {
    // ... аналогично
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

---

## ✅ Best Practices

### 1. Используйте константы для валидации

```typescript
// ✅ Хорошо
export const VALIDATION = {
  PASSWORD: { MIN: 8, MAX: 72 },
} as const;

const PasswordSchema = z.string().min(VALIDATION.PASSWORD.MIN);

// ❌ Плохо - magic numbers
const PasswordSchema = z.string().min(8);
```

### 2. Переиспользуйте базовые схемы

```typescript
// ✅ Хорошо
export const EmailSchema = z.string().email();

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string(),
});

export const RegisterSchema = z.object({
  email: EmailSchema, // Переиспользуем
  password: PasswordSchema,
});
```

### 3. Используйте `.coerce` для дат

```typescript
// ✅ Хорошо - работает с ISO string и Date
export const UserSchema = z.object({
  createdAt: z.coerce.date(),
});

// ❌ Плохо - работает только с Date объектами
export const UserSchema = z.object({
  createdAt: z.date(),
});
```

### 4. Экспортируйте типы

```typescript
// ✅ Хорошо - автоматический вывод типов
export const LoginSchema = z.object({ ... });
export type Login = z.infer<typeof LoginSchema>;

// ❌ Плохо - дублирование
export const LoginSchema = z.object({ ... });
export interface Login {
  email: string;
  password: string;
}
```

### 5. Разделяйте Request и Response схемы

```typescript
// ✅ Хорошо
export const LoginRequestSchema = z.object({ ... });
export const LoginResponseSchema = z.object({ ... });

// ❌ Плохо - одна схема для всего
export const LoginSchema = z.object({ ... });
```

---

## 📚 Дополнительные ресурсы

- [Zod Documentation](https://zod.dev/)
- [Nx Shared Libraries](https://nx.dev/concepts/more-concepts/creating-libraries)

---

**Последнее обновление:** 2025-01-29
