import baseConfig from '../../eslint.config.mjs';

export default [
  // Prisma Client генерируется автоматически — наши правила стиля к нему неприменимы.
  {
    ignores: ['src/generated/**'],
  },
  ...baseConfig,
];
