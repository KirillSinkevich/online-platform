# 📚 Документация проекта Online Platform

> Полная документация по архитектуре и использованию технологий проекта

---

## 📋 Оглавление документов

### 🏗️ Архитектура

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — главный документ по архитектуре проекта
  - Технологический стек
  - Структура монорепозитория
  - Frontend и Backend архитектура
  - База данных (Prisma схема)
  - Деплой и инфраструктура

### 📦 Shared (libs/shared)

- **[SHARED_ZOD_SCHEMAS.md](./SHARED_ZOD_SCHEMAS.md)** — Zod схемы для frontend и backend
  - Структура shared библиотеки
  - Создание схем (Auth, Room, Common)
  - Использование на Frontend (Angular)
  - Использование на Backend (Express)
  - Best practices

### 🎨 Frontend (Angular)

- **[ZOD_USAGE.md](./ZOD_USAGE.md)** — использование Zod на frontend
  - Интеграция с Angular Reactive Forms
  - Валидация API responses
  - Import shared схем
  - Best practices

### ⚙️ Backend (Express)

- **[PRISMA_USAGE.md](./PRISMA_USAGE.md)** — использование Prisma ORM на backend
  - Установка и настройка
  - Prisma Schema
  - Миграции
  - CRUD операции
  - Отношения между моделями
  - Best practices

- **[BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md)** — структура backend приложения
  - Упрощенная архитектура (без DDD)
  - Пример модуля (Controller + Service)
  - Валидация с Zod (shared schemas)
  - Работа с Prisma
  - Error handling

---

## 🚀 Быстрый старт

### Frontend разработка

1. Изучите [ARCHITECTURE.md](./ARCHITECTURE.md) для понимания общей структуры
2. Читайте [ZOD_USAGE.md](./ZOD_USAGE.md) для валидации форм
3. Используйте примеры из документации для создания компонентов

### Backend разработка

1. Изучите [ARCHITECTURE.md](./ARCHITECTURE.md) для понимания общей структуры
2. Читайте [PRISMA_USAGE.md](./PRISMA_USAGE.md) для работы с БД
3. Следуйте структуре из [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md)

---

## 🎯 Принципы проекта

### ✅ Используем

- **Zod:** Shared схемы в libs/shared для валидации на frontend И backend
- **Prisma:** Только для работы с БД на backend
- **Shared:** Zod schemas + TypeScript types (автовывод из Zod)
- **Архитектура:** Упрощенная 2-слойная (Controller + Service)

### ❌ НЕ используем (пока)

- ❌ Domain-Driven Design (DDD) — слишком сложно для MVP
- ❌ Repository pattern — используем Prisma напрямую в Services
- ❌ express-validator — заменен на Zod

---

## 📦 Структура технологий

```text
┌────────────────────────────────────────────────┐
│         libs/shared (Zod schemas)              │
│  • RegisterRequestSchema, LoginRequestSchema   │
│  • CreateRoomSchema, RoomSchema                │
│  • TypeScript types (z.infer)                  │
└────────────────────────────────────────────────┘
         ↓                           ↓
┌──────────────────┐       ┌──────────────────────┐
│   FRONTEND       │       │     BACKEND          │
│   (Angular)      │       │    (Express)         │
├──────────────────┤       ├──────────────────────┤
│ • Zod (shared)   │       │ • Zod (shared)       │
│ • Forms          │       │ • Prisma (БД)        │
│ • RxJS + Signals │       │ • JWT + bcrypt       │
└──────────────────┘       └──────────────────────┘
                                    ↓
            ┌────────────────────────────────────┐
            │   DATABASE (PostgreSQL)            │
            └────────────────────────────────────┘
```

---

## 🔧 Команды разработки

```bash
# Frontend
nx serve web                    # Запустить Angular app (:4200)
nx test web                     # Unit тесты
nx e2e web-e2e                  # E2E тесты
nx lint web                     # Линтинг

# Backend (когда будет создан)
nx serve backend                # Запустить Express server (:3000)
nx run backend:prisma:generate  # Сгенерировать Prisma Client
nx run backend:prisma:migrate   # Создать миграцию
nx run backend:prisma:studio    # Открыть Prisma Studio

# Общие
nx graph                        # Визуализация зависимостей
nx affected:test                # Тестировать только измененное
nx affected:build               # Собрать только измененное
```

---

## 📖 Порядок чтения документации

Для новых разработчиков рекомендуется следующий порядок:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** ← начните здесь
2. **[SHARED_ZOD_SCHEMAS.md](./SHARED_ZOD_SCHEMAS.md)** ← важно для понимания валидации
3. **[ZOD_USAGE.md](./ZOD_USAGE.md)** (для frontend разработчиков)
4. **[PRISMA_USAGE.md](./PRISMA_USAGE.md)** (для backend разработчиков)
5. **[BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md)** (для backend разработчиков)

---

## 🤝 Вклад в документацию

При добавлении новых функций или изменении архитектуры:

1. Обновите соответствующий документ
2. Добавьте примеры кода
3. Обновите дату "Последнее обновление" внизу документа
4. Если добавили новый документ, добавьте ссылку в этот README

---

## 📝 Заметки

- **Актуальность:** Документация обновляется вместе с кодом
- **Примеры:** Все примеры кода можно копировать и использовать
- **Вопросы:** Если что-то неясно, создайте issue в репозитории

---

**Последнее обновление:** 2025-01-29
