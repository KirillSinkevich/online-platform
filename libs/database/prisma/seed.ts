import argon2 from 'argon2';
import { prisma } from '../src/lib/prisma.js';
import { Role } from '../src/generated/prisma/enums.js';

/**
 * Создаёт первого учителя из переменных окружения.
 *
 * Скрипт идемпотентен: если пользователь с таким email уже есть, ничего
 * не меняется. Поэтому его безопасно запускать повторно — в том числе
 * шагом деплоя на каждой выкатке.
 *
 * Запуск: pnpm nx run database:prisma-seed
 */
async function seedTeacher(): Promise<void> {
  const email = process.env['SEED_TEACHER_EMAIL'];
  const password = process.env['SEED_TEACHER_PASSWORD'];

  if (!email || !password) {
    throw new Error(
      'SEED_TEACHER_EMAIL и SEED_TEACHER_PASSWORD должны быть заданы в окружении',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Учитель ${email} уже существует — пропускаем`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: Role.TEACHER,
      firstName: process.env['SEED_TEACHER_FIRST_NAME'] ?? 'Teacher',
      lastName: process.env['SEED_TEACHER_LAST_NAME'] ?? '',
    },
  });

  console.log(`Учитель ${email} создан`);
}

async function main(): Promise<void> {
  await seedTeacher();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
