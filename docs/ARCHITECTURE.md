# 🏗️ Архитектура проекта Online Platform MVP

> Документ описывает архитектуру, структуру и технологический стек проекта платформы для онлайн занятий.

---

## 📋 Содержание

- [Обзор проекта](#project-overview)
- [Технологический стек](#tech-stack)
- [Структура монорепозитория](#monorepo-structure)
- [Frontend архитектура](#frontend-architecture)
- [Backend архитектура](#backend-architecture)
- [Shared библиотеки](#shared-libraries)
- [База данных](#database)
- [Деплой и инфраструктура](#deployment-infrastructure)

---

## 🎯 Обзор проекта {#project-overview}

**Online Platform MVP** - платформа для проведения онлайн занятий с поддержкой:

- 🎥 Видео-конференций (Agora SDK)
- 💬 Real-time чата (Socket.io)
- 🎨 Интерактивной доски (HTML5 Canvas)
- 📊 Dashboard для учителей и учеников
- 📅 Планирования уроков
- 📧 Уведомлений

---

## 🛠️ Технологический стек {#tech-stack}

### Frontend

```text
Framework:       Angular 21.x (Standalone Components)
Language:        TypeScript 5.9.x
Styling:         SCSS (стилизация через .scss)
Build:           Angular Build (application)
State:           RxJS + Angular Signals
Validation:      Zod (shared schemas from libs/shared)
Video SDK:       Agora Web SDK (планируется)
WebSocket:       Socket.io Client (планируется)
HTTP Client:     Angular HttpClient
Forms:           Angular Reactive Forms
Routing:         Angular Router (with Guards)
Unit Tests:      Vitest 4.x
E2E Tests:       Playwright
```

### Backend

```text
Framework:       Express.js 4.21.x
Language:        TypeScript 5.9.x
ORM:             Prisma (type-safe database access)
Validation:      Zod (shared schemas from libs/shared)
Database:        PostgreSQL (планируется)
Cache:           Redis (опционально, планируется)
WebSocket:       Socket.io (планируется)
Auth:            JWT (планируется)
Password:        bcrypt (планируется)
File Upload:     multer (планируется)
Testing:         Vitest + Supertest (планируется)
```

### Инфраструктура

```text
Monorepo:        Nx 22.3.x
Package Manager: pnpm 9.0.x
Containerization: Docker + Docker Compose
CI/CD:           GitHub Actions
Deployment:      Docker containers (планируется)
Reverse Proxy:   nginx (планируется)
```

---

## 📁 Структура монорепозитория {#monorepo-structure}

```text
online-platform/
├── apps/                          # Приложения
│   ├── web/                       # Angular приложение (Frontend)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── app.html
│   │   │   │   ├── app.routes.ts
│   │   │   │   ├── app.scss
│   │   │   │   ├── app.spec.ts
│   │   │   │   └── app.ts
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── styles.scss       # Глобальные SCSS стили
│   │   ├── public/               # Статические ресурсы (favicon и т.д.)
│   │   ├── eslint.config.mjs
│   │   ├── project.json          # Nx конфигурация
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.spec.json
│   │
│   ├── web-e2e/                   # E2E тесты (Playwright)
│   │   ├── src/
│   │   ├── playwright.config.ts
│   │   └── project.json
│   │
│   └── backend/                   # Express приложение (планируется)
│       ├── src/
│       │   ├── app/
│       │   │   ├── modules/      # Feature модули
│       │   │   ├── common/       # Общие утилиты
│       │   │   └── app.ts
│       │   ├── prisma/           # Prisma схема
│       │   │   ├── schema.prisma
│       │   │   ├── migrations/
│       │   │   └── seed.ts
│       │   ├── config/           # Конфигурация
│       │   └── main.ts
│       ├── project.json
│       └── tsconfig.json
│
├── docs/                          # Документация
│   └── ARCHITECTURE.md
│
├── .github/                       # CI/CD
│   └── workflows/
│       └── ci.yml
│
├── .vscode/                       # Настройки редактора
│   ├── extensions.json
│   └── launch.json
│
├── nx.json                        # Nx конфигурация
├── package.json                   # Зависимости
├── pnpm-workspace.yaml            # pnpm workspace
├── tsconfig.base.json             # Базовый TypeScript конфиг
├── eslint.config.mjs              # ESLint (root)
├── vitest.workspace.ts            # Vitest workspace
├── .editorconfig
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc
├── AGENTS.md                      # Правила для AI-агентов
├── CLAUDE.md
└── README.md
```

**Планируется** (целевая структура по мере развития):

- **apps/web/src/app/** — добавить папки `core/` (singleton сервисы, interceptors, guards), `features/` (lazy-loaded модули), `shared/` (компоненты, directives, pipes); при необходимости — `assets/`, `environments/`.
- **apps/backend/** — Express-приложение: `src/app/modules/`, `common/`, `prisma/`, `config/`, `main.ts`.
- **libs/shared/** — общая библиотека: `interfaces/`, `types/`, `constants/`, `utils/`, `validators/`.
- **tools/scripts/** — скрипты для CI/CD и вспомогательные задачи.
- **docker/** — `web.Dockerfile`, `backend.Dockerfile`, `nginx.conf`; в корне — `docker-compose.yml`, `docker-compose.dev.yml`.

---

## 🎨 Frontend архитектура {#frontend-architecture}

### Структура приложения (Frontend)

Целевая структура (сейчас в `app/` только корневые файлы; папки `core/`, `features/`, `shared/` добавляются по мере развития):

```text
apps/web/src/app/
├── core/                          # Core модуль (singleton сервисы)
│   ├── services/
│   │   ├── auth.service.ts       # Аутентификация
│   │   ├── api.service.ts        # HTTP клиент
│   │   └── storage.service.ts    # LocalStorage wrapper
│   ├── guards/
│   │   ├── auth.guard.ts         # Проверка аутентификации
│   │   └── role.guard.ts         # Проверка ролей
│   ├── interceptors/
│   │   ├── auth.interceptor.ts   # JWT токены
│   │   ├── error.interceptor.ts  # Обработка ошибок
│   │   └── loading.interceptor.ts # Loading индикатор
│   └── models/
│       └── user.model.ts
│
├── features/                      # Feature модули (lazy-loaded)
│   ├── auth/                     # Модуль аутентификации
│   │   ├── components/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── password-reset/
│   │   ├── services/
│   │   │   └── auth-api.service.ts
│   │   └── auth.routes.ts
│   │
│   ├── video-room/               # Модуль видео-комнаты
│   │   ├── components/
│   │   │   ├── room/
│   │   │   ├── video-grid/
│   │   │   ├── video-controls/
│   │   │   └── participant-list/
│   │   ├── services/
│   │   │   ├── agora.service.ts  # Agora SDK wrapper
│   │   │   ├── room.service.ts
│   │   │   └── media.service.ts
│   │   └── video-room.routes.ts
│   │
│   ├── chat/                     # Модуль чата
│   │   ├── components/
│   │   │   ├── chat-window/
│   │   │   ├── message-list/
│   │   │   ├── message-input/
│   │   │   └── file-upload/
│   │   ├── services/
│   │   │   ├── chat.service.ts
│   │   │   └── socket.service.ts # Socket.io wrapper
│   │   └── chat.routes.ts
│   │
│   ├── whiteboard/               # Модуль интерактивной доски
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   ├── toolbar/
│   │   │   └── color-picker/
│   │   ├── services/
│   │   │   ├── whiteboard.service.ts
│   │   │   └── drawing.service.ts
│   │   └── whiteboard.routes.ts
│   │
│   └── dashboard/                # Модуль dashboard
│       ├── components/
│       │   ├── teacher-dashboard/
│       │   ├── student-dashboard/
│       │   ├── room-list/
│       │   └── statistics/
│       ├── services/
│       │   └── dashboard.service.ts
│       └── dashboard.routes.ts
│
└── shared/                        # Shared компоненты
    ├── components/
    │   ├── button/
    │   ├── modal/
    │   ├── input/
    │   ├── avatar/
    │   └── loader/
    ├── directives/
    │   ├── click-outside.directive.ts
    │   └── auto-focus.directive.ts
    └── pipes/
        ├── date-format.pipe.ts
        └── file-size.pipe.ts
```

---

## ⚙️ Backend архитектура {#backend-architecture}

### Структура приложения (Backend)

```text
apps/backend/src/
├── prisma/                        # Prisma ORM
│   ├── schema.prisma             # Схема базы данных
│   ├── migrations/               # Миграции (автогенерация)
│   └── seed.ts                   # Тестовые данные
│
└── app/
    ├── modules/                   # Feature модули
    │   ├── auth/                 # Модуль аутентификации
    │   │   ├── auth.controller.ts    # HTTP endpoints + Zod валидация
    │   │   └── auth.service.ts       # Бизнес-логика + Prisma queries
    │   │
    │   ├── users/                # Модуль пользователей
    │   │   ├── users.controller.ts   # HTTP endpoints + Zod
    │   │   └── users.service.ts      # Бизнес-логика + Prisma
    │   │
    │   ├── rooms/                # Модуль комнат
    │   │   ├── rooms.controller.ts   # HTTP endpoints + Zod
    │   │   └── rooms.service.ts      # Бизнес-логика + Prisma
    │   │
    │   ├── chat/                 # Модуль чата (WebSocket)
    │   │   ├── chat.gateway.ts       # Socket.io gateway
    │   │   └── chat.service.ts
    │   │
    │   └── storage/              # Модуль хранения файлов
    │       ├── storage.controller.ts
    │       └── storage.service.ts
    │
    └── common/                    # Общие утилиты
        ├── prisma.service.ts     # PrismaClient singleton
        ├── middleware/
        │   ├── auth.middleware.ts        # JWT проверка
        │   ├── zod-validation.middleware.ts  # Zod валидация wrapper
        │   ├── logger.middleware.ts
        │   └── rate-limit.middleware.ts
        └── utils/
            ├── bcrypt.util.ts
            ├── jwt.util.ts
            └── response.util.ts

Примечание: Упрощенная 2-слойная архитектура
- Controller: HTTP requests + Zod валидация (из @org/shared/schemas)
- Service: бизнес-логика + Prisma queries (БД)
- Zod schemas: libs/shared (используются на frontend И backend)
```

### Архитектурные слои (упрощенная версия)

```text
┌─────────────────────────────────────┐
│  libs/shared (Zod schemas)           │  ← Shared валидация
└─────────────────────────────────────┘
         ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│    Frontend      │  │    Backend       │
│    (Angular)     │  │   (Express)      │
└──────────────────┘  └──────────────────┘
                              ↓
┌─────────────────────────────────────┐
│  Controller Layer                    │  ← HTTP endpoints + Zod валидация
├─────────────────────────────────────┤
│  Service Layer                       │  ← Бизнес-логика + Prisma queries
├─────────────────────────────────────┤
│  Prisma ORM                          │  ← Type-safe DB access
├─────────────────────────────────────┤
│  Database (PostgreSQL)               │  ← Хранение данных
└─────────────────────────────────────┘
```

---

## 📦 Shared библиотеки {#shared-libraries}

### Структура

```text
libs/shared/src/lib/
├── schemas/                       # Zod schemas (используются на frontend И backend)
│   ├── auth/
│   │   ├── register.schema.ts    # RegisterSchema, типы
│   │   ├── login.schema.ts       # LoginSchema, типы
│   │   └── index.ts
│   ├── rooms/
│   │   ├── room.schema.ts        # RoomSchema, CreateRoomSchema
│   │   └── index.ts
│   ├── common/
│   │   ├── pagination.schema.ts
│   │   └── index.ts
│   └── index.ts                  # Экспорт всех схем
│
├── types/                         # Дополнительные TypeScript типы
│   ├── api-response.type.ts
│   └── index.ts
│
├── constants/                     # Константы
│   ├── api-routes.constant.ts
│   ├── socket-events.constant.ts
│   ├── validation.constant.ts    # Константы для Zod валидации
│   └── index.ts
│
└── utils/                         # Утилиты
    ├── date.util.ts
    ├── string.util.ts
    └── index.ts

Примечание:
- Zod schemas в libs/shared используются ВЕЗДЕ (frontend + backend)
- Prisma используется ТОЛЬКО на backend для БД
- Типы автоматически выводятся из Zod: z.infer<typeof Schema>
```

## 💾 База данных (Prisma Schema) {#database}

```prisma
// apps/backend/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(STUDENT)
  avatar        String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  ownedRooms    Room[]    @relation("RoomOwner")
  roomMembers   RoomMember[]
  sentMessages  Message[]

  @@map("users")
}

// Room model
model Room {
  id            String      @id @default(uuid())
  title         String
  description   String?
  status        RoomStatus  @default(SCHEDULED)
  scheduledAt   DateTime?
  startedAt     DateTime?
  endedAt       DateTime?
  maxParticipants Int       @default(10)

  ownerId       String
  owner         User        @relation("RoomOwner", fields: [ownerId], references: [id])

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations
  members       RoomMember[]
  messages      Message[]

  @@map("rooms")
}

// Room Member model (many-to-many)
model RoomMember {
  id          String    @id @default(uuid())
  userId      String
  roomId      String
  joinedAt    DateTime  @default(now())
  leftAt      DateTime?

  user        User      @relation(fields: [userId], references: [id])
  room        Room      @relation(fields: [roomId], references: [id])

  @@unique([userId, roomId])
  @@map("room_members")
}

// Message model
model Message {
  id          String      @id @default(uuid())
  content     String
  type        MessageType @default(TEXT)
  fileUrl     String?

  userId      String
  user        User        @relation(fields: [userId], references: [id])

  roomId      String
  room        Room        @relation(fields: [roomId], references: [id])

  createdAt   DateTime    @default(now())

  @@map("messages")
}

// Enums
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

## 🐳 Деплой и инфраструктура {#deployment-infrastructure}

### Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine

  redis:
    image: redis:7-alpine

  backend:
    build: ./docker/backend.Dockerfile
    ports:
      - '3000:3000'

  web:
    build: ./docker/web.Dockerfile

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
```

---

## 🎯 Команды для разработки

```bash
# --- Инфраструктура (БД) ---
pnpm db:up                   # Поднять PostgreSQL (docker compose)
pnpm db:down                 # Остановить контейнеры
pnpm db:logs                 # Логи postgres
pnpm db:studio               # Открыть Prisma Studio GUI

# --- Запуск приложений ---
pnpm dev                     # Всё сразу: db + backend + frontend (параллельно)
pnpm backend                 # Только backend :3000
pnpm frontend                # Только frontend :4200

# --- Сборка ---
nx run web:build             # Frontend production сборка
nx run web:build:development # Frontend development сборка
nx run backend:build         # Backend сборка

# --- Тесты ---
nx run web:test              # Frontend unit-тесты (Vitest)
nx run backend:test          # Backend unit-тесты (Jest)
nx e2e web-e2e               # Frontend E2E (Playwright)
nx e2e backend-e2e           # Backend E2E (Jest + Supertest)

# --- Качество кода ---
nx run web:lint
nx run backend:lint
nx run-many -t lint,test     # Lint + тесты по всем проектам

# --- Nx affected (только изменённые проекты) ---
nx affected -t build,test,lint

# --- Prisma (см. docs/PRISMA_USAGE.md) ---
nx run backend:prisma:generate   # Генерация Prisma Client
nx run backend:prisma:migrate    # Создать миграцию
```

---

**Последнее обновление:** 2026-03-27
