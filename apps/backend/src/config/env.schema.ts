import { z } from 'zod';

/** Deployment tier (branch/env mapping). Independent of NODE_ENV runtime mode. */
export const appEnvSchema = z.enum([
  'development',
  'staging',
  'preprod',
  'fleetbeta',
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
    /** Forgot-password reset token lifetime (seconds). Default 1 hour. */
    PASSWORD_RESET_TOKEN_TTL_SEC: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    /** log = structured log only; webhook = POST JSON to PASSWORD_RESET_WEBHOOK_URL */
    PASSWORD_RESET_EMAIL_MODE: z.enum(['log', 'webhook']).default('log'),
    PASSWORD_RESET_WEBHOOK_URL: z.string().url().optional(),
    PASSWORD_RESET_PORTAL_BASE_URL: z.string().default('http://localhost:3000'),
    PASSWORD_RESET_PORTAL_PATH: z.string().default('/login/reset-password'),
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
