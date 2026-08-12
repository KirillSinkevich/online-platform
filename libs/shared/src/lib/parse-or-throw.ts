import type { ZodType } from 'zod';
import { HttpError } from './http-error.js';

/**
 * Валидирует данные по zod-схеме и превращает неудачу в HttpError(400).
 * Благодаря этому приложению-хосту достаточно знать только про HttpError,
 * а не про конкретную библиотеку валидации.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new HttpError(400, `Validation failed: ${details}`);
  }

  return result.data;
}
