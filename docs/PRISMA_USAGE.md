# Использование Prisma на Backend (Express)

> Документация по использованию Prisma ORM для работы с PostgreSQL в Express приложении

---

## 📋 Содержание

- [Введение](#введение)
- [Установка и настройка](#установка-и-настройка)
- [Prisma Schema](#prisma-schema)
- [Генерация клиента](#генерация-клиента)
- [Миграции](#миграции)
- [CRUD операции](#crud-операции)
- [Отношения между моделями](#отношения-между-моделями)
- [Продвинутые запросы](#продвинутые-запросы)
- [Best Practices](#best-practices)

---

## 🎯 Введение

**Prisma** используется на backend для:

- ✅ Type-safe доступ к базе данных
- ✅ Автоматическая генерация миграций
- ✅ Управление схемой БД
- ✅ Query builder с автодополнением

**Важно:** Prisma используется ТОЛЬКО на backend. Frontend использует HTTP API.

---

## 📦 Установка и настройка

### 1. Установка зависимостей

```bash
# В корне проекта
pnpm add @prisma/client
pnpm add -D prisma

# Инициализация Prisma (когда backend будет создан)
cd apps/backend
npx prisma init
```

### 2. Структура файлов

```text
apps/backend/
├── src/
│   ├── prisma/
│   │   ├── schema.prisma      # Схема БД
│   │   ├── migrations/        # Миграции (генерируются автоматически)
│   │   └── seed.ts           # Seed данные для разработки
│   ├── app/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.repository.ts   # Prisma queries
│   │   │   └── rooms/
│   │   │       └── ...
│   │   └── common/
│   │       └── prisma.service.ts         # PrismaClient singleton
│   └── main.ts
└── .env
```

### 3. Environment Variables

```bash
# apps/backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/online_platform_dev?schema=public"
```

```bash
# apps/backend/.env.example
DATABASE_URL="postgresql://user:password@localhost:5432/online_platform_dev?schema=public"
```

---

## 🗄️ Prisma Schema

### Базовая структура

```prisma
// apps/backend/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User Model
// ============================================
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hash
  name      String
  role      Role     @default(STUDENT)
  avatar    String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  ownedRooms   Room[]       @relation("RoomOwner")
  roomMembers  RoomMember[]
  sentMessages Message[]

  @@map("users")
}

// ============================================
// Room Model
// ============================================
model Room {
  id              String     @id @default(uuid())
  title           String
  description     String?
  status          RoomStatus @default(SCHEDULED)
  scheduledAt     DateTime?
  startedAt       DateTime?
  endedAt         DateTime?
  maxParticipants Int        @default(10)

  ownerId   String
  owner     User   @relation("RoomOwner", fields: [ownerId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  members  RoomMember[]
  messages Message[]

  @@map("rooms")
}

// ============================================
// RoomMember Model (many-to-many)
// ============================================
model RoomMember {
  id       String    @id @default(uuid())
  userId   String
  roomId   String
  joinedAt DateTime  @default(now())
  leftAt   DateTime?

  user User @relation(fields: [userId], references: [id])
  room Room @relation(fields: [roomId], references: [id])

  @@unique([userId, roomId])
  @@map("room_members")
}

// ============================================
// Message Model
// ============================================
model Message {
  id      String      @id @default(uuid())
  content String
  type    MessageType @default(TEXT)
  fileUrl String?

  userId String
  user   User   @relation(fields: [userId], references: [id])

  roomId String
  room   Room   @relation(fields: [roomId], references: [id])

  createdAt DateTime @default(now())

  @@map("messages")
}

// ============================================
// Enums
// ============================================
enum Role {
  TEACHER
  STUDENT
}

enum RoomStatus {
  SCHEDULED
  ACTIVE
  ENDED
}

enum MessageType {
  TEXT
  FILE
  IMAGE
}
```

---

## 🔧 Генерация клиента

### Команды

```bash
# Сгенерировать Prisma Client (после изменения schema)
npx prisma generate --schema=apps/backend/src/prisma/schema.prisma

# Или через Nx (если настроен target)
nx run backend:prisma:generate
```

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

      // Graceful shutdown
      process.on('beforeExit', async () => {
        await PrismaService.instance.$disconnect();
      });
    }

    return PrismaService.instance;
  }
}

export const prisma = PrismaService.getInstance();
```

---

## 🔄 Миграции

### Создание миграции

```bash
# Development: создать и применить миграцию
npx prisma migrate dev --name init --schema=apps/backend/src/prisma/schema.prisma

# Production: применить миграции
npx prisma migrate deploy --schema=apps/backend/src/prisma/schema.prisma

# Prisma Studio (GUI для просмотра данных)
npx prisma studio --schema=apps/backend/src/prisma/schema.prisma
```

### Workflow

1. Изменить `schema.prisma`
2. Запустить `prisma migrate dev --name <migration_name>`
3. Prisma создаст SQL миграцию в `prisma/migrations/`
4. Миграция автоматически применится к БД
5. Prisma Client автоматически регенерируется

---

## 📝 CRUD операции

### Create

```typescript
// apps/backend/src/app/modules/users/users.service.ts
import { prisma } from '../../common/prisma.service';
import * as bcrypt from 'bcrypt';

export class UsersService {
  async createUser(data: { email: string; password: string; name: string }) {
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        name: data.name,
        role: 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        // НЕ включаем password в select!
      },
    });

    return user;
  }
}
```

### Read (Find)

```typescript
export class UsersService {
  // Найти одного по ID
  async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        // password НЕ включаем
      },
    });
  }

  // Найти по email
  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  // Найти всех
  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
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

### Update

```typescript
export class UsersService {
  async updateUser(id: string, data: { name?: string; avatar?: string }) {
    return await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        updatedAt: true,
      },
    });
  }

  // Изменить пароль
  async changePassword(id: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hash },
    });
  }
}
```

### Delete

```typescript
export class UsersService {
  async deleteUser(id: string) {
    await prisma.user.delete({
      where: { id },
    });
  }

  // Soft delete (альтернатива)
  async softDeleteUser(id: string) {
    await prisma.user.update({
      where: { id },
      data: {
        // Можно добавить поле deletedAt в схему
        // deletedAt: new Date(),
      },
    });
  }
}
```

---

## 🔗 Отношения между моделями

### Include (загрузка связанных данных)

```typescript
// apps/backend/src/app/modules/rooms/rooms.service.ts
export class RoomsService {
  async findRoomWithOwner(id: string) {
    return await prisma.room.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
            // password НЕ включаем
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });
  }
}
```

### Create с отношениями

```typescript
export class RoomsService {
  async createRoom(
    ownerId: string,
    data: {
      title: string;
      description?: string;
      scheduledAt?: Date;
      maxParticipants?: number;
    },
  ) {
    return await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt,
        maxParticipants: data.maxParticipants ?? 10,
        owner: {
          connect: { id: ownerId }, // Связать с существующим User
        },
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

  // Добавить участника в комнату
  async joinRoom(roomId: string, userId: string) {
    // Проверить, что пользователь еще не в комнате
    const existing = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
    });

    if (existing) {
      throw new Error('Пользователь уже в комнате');
    }

    // Добавить участника
    return await prisma.roomMember.create({
      data: {
        user: { connect: { id: userId } },
        room: { connect: { id: roomId } },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }
}
```

---

## 🚀 Продвинутые запросы

### Фильтрация

```typescript
export class RoomsService {
  async findRooms(filters: {
    status?: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
    ownerId?: string;
    search?: string;
  }) {
    return await prisma.room.findMany({
      where: {
        status: filters.status,
        ownerId: filters.ownerId,
        OR: filters.search
          ? [
              { title: { contains: filters.search, mode: 'insensitive' } },
              {
                description: { contains: filters.search, mode: 'insensitive' },
              },
            ]
          : undefined,
      },
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
    });
  }
}
```

### Транзакции

```typescript
export class RoomsService {
  async deleteRoomWithMessages(roomId: string) {
    // Все операции выполнятся атомарно
    return await prisma.$transaction(async (tx) => {
      // 1. Удалить все сообщения
      await tx.message.deleteMany({
        where: { roomId },
      });

      // 2. Удалить всех участников
      await tx.roomMember.deleteMany({
        where: { roomId },
      });

      // 3. Удалить комнату
      await tx.room.delete({
        where: { id: roomId },
      });
    });
  }
}
```

### Агрегация

```typescript
export class RoomsService {
  async getRoomStats() {
    return await prisma.room.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      _avg: {
        maxParticipants: true,
      },
    });
  }

  async getUserRoomCount(userId: string) {
    return await prisma.room.count({
      where: { ownerId: userId },
    });
  }
}
```

### Raw SQL (если нужно)

```typescript
export class UsersService {
  async complexQuery() {
    // Используйте только если Prisma API недостаточно
    const users = await prisma.$queryRaw`
      SELECT u.*, COUNT(r.id) as room_count
      FROM users u
      LEFT JOIN rooms r ON r.owner_id = u.id
      GROUP BY u.id
      HAVING COUNT(r.id) > 5
    `;

    return users;
  }
}
```

---

## ✅ Best Practices

### 1. Всегда используйте select

```typescript
// ❌ Плохо - возвращает все поля (включая password)
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Хорошо - явно указываем нужные поля
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    // password: false (не включаем)
  },
});
```

### 2. Используйте транзакции для связанных операций

```typescript
// ✅ Хорошо - атомарная операция
await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { ... } }),
  prisma.room.update({ where: { id }, data: { ... } }),
]);
```

### 3. Избегайте N+1 проблемы

```typescript
// ❌ Плохо - N+1 запросов
const rooms = await prisma.room.findMany();
for (const room of rooms) {
  room.owner = await prisma.user.findUnique({ where: { id: room.ownerId } });
}

// ✅ Хорошо - 1 запрос
const rooms = await prisma.room.findMany({
  include: { owner: true },
});
```

### 4. Используйте пагинацию

```typescript
// ✅ Хорошо
const rooms = await prisma.room.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

### 5. Обрабатывайте ошибки Prisma

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.user.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('Email уже существует');
    }
  }
  throw error;
}
```

### 6. Создайте типы для результатов запросов

```typescript
import { Prisma } from '@prisma/client';

// Тип для User без пароля
const userSelectArgs = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
} as const;

export type UserPublic = Prisma.UserGetPayload<{
  select: typeof userSelectArgs;
}>;
```

---

## 🔐 Seed данные

```typescript
// apps/backend/src/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Создать тестовых пользователей
  const password = await bcrypt.hash('Password123', 10);

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      password,
      name: 'Иван Учитель',
      role: 'TEACHER',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      password,
      name: 'Петр Студент',
      role: 'STUDENT',
    },
  });

  // Создать тестовую комнату
  const room = await prisma.room.create({
    data: {
      title: 'Математика 101',
      description: 'Вводный курс по математике',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 86400000), // +1 день
      maxParticipants: 20,
      ownerId: teacher.id,
    },
  });

  console.log({ teacher, student, room });
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Запуск seed:

```bash
npx prisma db seed
```

Добавьте в `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node apps/backend/src/prisma/seed.ts"
  }
}
```

---

## 📚 Дополнительные ресурсы

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**Последнее обновление:** 2025-01-29
