import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.staging') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/** Stable marker stored on seeded rows (notes, descriptions, receipt numbers). */
export const STAGING_DEMO_SEED_SOURCE = 'staging-demo-v1';

export const STAGING_DEMO_EMAIL_DOMAIN = '@grubpac-demo.local';

export function maskDatabaseUrl(connectionString: string): string {
  return connectionString.replace(/:[^:@/]+@/, ':***@');
}

export function resolveStagingDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL is required for staging demo seed (set from staging tier env or samconfig).',
    );
  }
  return url;
}

/**
 * Staging interconnected demo — never production/pre-prod.
 * Requires explicit SEED_STAGING_DEMO=1 and APP_ENV=staging.
 */
export function assertStagingDemoSeedAllowed(): void {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === 'production' || appEnv === 'pre-production') {
    throw new Error(
      `Refusing staging demo seed when APP_ENV=${appEnv ?? '(unset)'}.`,
    );
  }
  if (process.env.SEED_STAGING_DEMO !== '1') {
    throw new Error(
      'Refusing staging demo seed: set SEED_STAGING_DEMO=1 explicitly.',
    );
  }
  if (appEnv !== 'staging') {
    throw new Error(
      `Refusing staging demo seed: APP_ENV must be staging (got ${appEnv ?? '(unset)'}).`,
    );
  }
}
