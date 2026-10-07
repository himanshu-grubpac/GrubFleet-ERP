import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.staging') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/** Internal marker on notes/descriptions — never shown as primary UI copy. */
export const STAGING_DEMO_SEED_SOURCE = 'staging-interconnected-seed-v2';

/** Prior seed runs (purge matches these too). */
export const STAGING_DEMO_LEGACY_SEED_MARKERS = ['staging-demo-v1'] as const;

/** Legacy demo inbox domain — purge only. */
export const STAGING_DEMO_EMAIL_DOMAIN = '@grubpac-demo.local';

const STAGING_SEED_EMAIL_DOMAIN = 'grubfleet-logistics.in';

/**
 * Professional contact email for seeded org rows (idempotent per role + stable key).
 */
export function stagingSeedContactEmail(role: string, stableKey: string): string {
  const local = `${role}.${stableKey}`.replace(/[^a-z0-9.]/gi, '.').toLowerCase();
  return `${local}@${STAGING_SEED_EMAIL_DOMAIN}`;
}

/** Person-style email for employees, POCs, drivers (display-realistic). */
export function stagingSeedPersonEmail(
  firstName: string,
  lastName: string,
  companyDomain: string,
): string {
  const local = `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return `${local}@${companyDomain}`;
}

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
