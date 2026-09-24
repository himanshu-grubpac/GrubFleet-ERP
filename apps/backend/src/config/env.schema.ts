import { z } from 'zod';

/** Deployment tier (branch/env mapping). Independent of NODE_ENV runtime mode. */
export const appEnvSchema = z.enum([
  'development',
  'staging',
  'preprod',
  'production',
]);

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    APP_ENV: appEnvSchema.default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().default('api/v1'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
  })
  .superRefine((data, ctx) => {
    if (data.APP_ENV !== 'production') {
      return;
    }
    if (!data.JWT_ACCESS_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'Required when APP_ENV is production (min 32 characters)',
      });
    }
    if (!data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'Required when APP_ENV is production (min 32 characters)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Environment validation failed: ${message}`);
  }
  return parsed.data;
}
