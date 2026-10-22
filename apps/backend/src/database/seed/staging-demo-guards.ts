import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.staging') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/** Internal marker on notes/descriptions — never shown as primary UI copy. */
export const STAGING_DEMO_SEED_SOURCE = 'staging-interconnected-seed-v2';

/** Prior seed runs (purge matches these too). */
export const STAGING_DEMO_LEGACY_SEED_MARKERS = ['staging-demo-v1'] as const;

/** Workshop staging demo rows (notes / descriptions). */
export const STAGING_WORKSHOP_DEMO_SEED_SOURCE = 'staging-workshop-demo-v1';

/** Legacy demo inbox domain — purge only. */
export const STAGING_DEMO_EMAIL_DOMAIN = '@grubpac-demo.local';

const STAGING_SEED_EMAIL_DOMAIN = 'grubfleet-logistics.in';

/**
 * Professional contact email for seeded org rows (idempotent per role + stable key).
 */
export function stagingSeedContactEmail(
  role: string,
  stableKey: string,
): string {
  const local = `${role}.${stableKey}`
    .replace(/[^a-z0-9.]/gi, '.')
    .toLowerCase();
  return `${local}@${STAGING_SEED_EMAIL_DOMAIN}`;
}

/** Person-style email for employees, POCs, drivers (display-realistic). */
export function stagingSeedPersonEmail(
  firstName: string,
  lastName: string,
  companyDomain: string,
): string {
  const local = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z]/g, '');
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

const STAGING_NONPROD_DB_NAME = 'grubfleet_erp_nonprod';
const PREPROD_DB_NAME = 'grubfleet_erp_preprod';

function assertStagingNonprodDatabaseUrl(connectionString: string): void {
  let dbName: string | undefined;
  try {
    dbName = new URL(connectionString).pathname
      .replace(/^\//, '')
      .split('?')[0];
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (dbName !== STAGING_NONPROD_DB_NAME) {
    throw new Error(
      `Refusing asset register clean: expected database "${STAGING_NONPROD_DB_NAME}", got "${dbName ?? '(unknown)'}".`,
    );
  }
  if (/grubfleet_erp_production/i.test(connectionString)) {
    throw new Error(
      'Refusing asset register clean against production database.',
    );
  }
}

/**
 * Full Asset Register purge on staging nonprod RDS only.
 * Requires CLEAN_ASSET_REGISTER_STAGING=1 and APP_ENV=staging.
 */
const LOCAL_DEV_DB_NAMES = new Set(['grubpac_erp', 'grubfleet_erp_dev']);

function assertLocalDevelopmentDatabaseUrl(connectionString: string): void {
  let dbName: string | undefined;
  try {
    dbName = new URL(connectionString).pathname
      .replace(/^\//, '')
      .split('?')[0];
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (!dbName || !LOCAL_DEV_DB_NAMES.has(dbName)) {
    throw new Error(
      `Refusing local asset register demo seed: expected local dev database (${[...LOCAL_DEV_DB_NAMES].join(' or ')}), got "${dbName ?? '(unknown)'}".`,
    );
  }
  if (
    /grubfleet_erp_nonprod|grubfleet_erp_production|rds\.amazonaws\.com/i.test(
      connectionString,
    )
  ) {
    throw new Error(
      'Refusing local asset register demo seed against non-local or RDS URL.',
    );
  }
}

/** Marker on seeded asset-register rows (description / notes). */
export const LOCAL_ASSET_REGISTER_DEMO_SEED_SOURCE =
  'local-asset-register-demo-v1';

/** Slim local org + asset seed (2–3 rows per submodule). */
export const LOCAL_SLIM_ORG_ASSET_SEED_SOURCE = 'local-slim-org-asset-v1';

/**
 * Local Docker Postgres — slim professional dev data for org + asset modules.
 * Invoked via `npm run db:seed:local-slim -w backend` (APP_ENV=development).
 */
export function assertLocalSlimOrgAssetSeedAllowed(
  connectionString: string,
): void {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === 'production' || appEnv === 'staging' || appEnv === 'pre-production') {
    throw new Error(
      `Refusing local slim seed when APP_ENV=${appEnv ?? '(unset)'}.`,
    );
  }
  if (appEnv !== 'development') {
    throw new Error(
      `Refusing local slim seed: set APP_ENV=development (got ${appEnv ?? '(unset)'}).`,
    );
  }
  assertLocalDevelopmentDatabaseUrl(connectionString);
  if (/rds\.amazonaws\.com/i.test(connectionString)) {
    throw new Error('Refusing local slim seed against RDS.');
  }
}

/**
 * Local Docker Postgres only — full Asset Register demo rows for dev org.
 * Requires SEED_LOCAL_ASSET_REGISTER_DEMO=1 and APP_ENV=development.
 */
export function assertLocalAssetRegisterDemoSeedAllowed(): void {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === 'production' || appEnv === 'pre-production') {
    throw new Error(
      `Refusing local asset register demo seed when APP_ENV=${appEnv ?? '(unset)'}.`,
    );
  }
  if (process.env.SEED_LOCAL_ASSET_REGISTER_DEMO !== '1') {
    throw new Error(
      'Refusing local asset register demo seed: set SEED_LOCAL_ASSET_REGISTER_DEMO=1 explicitly.',
    );
  }
  if (appEnv !== 'development') {
    throw new Error(
      `Refusing local asset register demo seed: APP_ENV must be development (got ${appEnv ?? '(unset)'}).`,
    );
  }
  assertLocalDevelopmentDatabaseUrl(resolveStagingDatabaseUrl());
}

/**
 * Purge staging interconnected demo rows only (keeps users, roles, org shell).
 * Requires PURGE_STAGING_DEMO=1 and APP_ENV=staging on nonprod RDS.
 */
export function assertStagingDemoPurgeAllowed(): void {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === 'production' || appEnv === 'pre-production') {
    throw new Error(
      `Refusing staging demo purge when APP_ENV=${appEnv ?? '(unset)'}.`,
    );
  }
  if (process.env.PURGE_STAGING_DEMO !== '1') {
    throw new Error(
      'Refusing staging demo purge: set PURGE_STAGING_DEMO=1 explicitly.',
    );
  }
  if (appEnv !== 'staging') {
    throw new Error(
      `Refusing staging demo purge: APP_ENV must be staging (got ${appEnv ?? '(unset)'}).`,
    );
  }
  assertStagingNonprodDatabaseUrl(resolveStagingDatabaseUrl());
}

function assertPreprodDatabaseUrl(connectionString: string): void {
  let dbName: string | undefined;
  try {
    dbName = new URL(connectionString.replace(/^postgresql:/, 'postgres:'))
      .pathname.replace(/^\//, '')
      .split('?')[0];
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (dbName !== PREPROD_DB_NAME) {
    throw new Error(
      `Refusing pre-prod business purge: expected database "${PREPROD_DB_NAME}", got "${dbName ?? '(unknown)'}".`,
    );
  }
  if (/grubfleet_erp_production/i.test(connectionString)) {
    throw new Error('Refusing pre-prod purge against production database.');
  }
}

/**
 * Purge pre-prod org business + demo rows; keeps users, password hashes, memberships, roles, org shell.
 * Requires PURGE_PREPROD_BUSINESS=1 and APP_ENV=preprod.
 */
export function assertPreprodBusinessPurgeAllowed(): void {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === 'production' || appEnv === 'pre-production') {
    throw new Error(
      `Refusing pre-prod business purge when APP_ENV=${appEnv ?? '(unset)'} (use preprod).`,
    );
  }
  if (process.env.PURGE_PREPROD_BUSINESS !== '1') {
    throw new Error(
      'Refusing pre-prod business purge: set PURGE_PREPROD_BUSINESS=1 explicitly.',
    );
  }
  if (appEnv !== 'preprod') {
    throw new Error(
      `Refusing pre-prod business purge: APP_ENV must be preprod (got ${appEnv ?? '(unset)'}).`,
    );
  }
  assertPreprodDatabaseUrl(resolveStagingDatabaseUrl());
}

export function assertStagingAssetRegisterCleanAllowed(): void {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === 'production' || appEnv === 'pre-production') {
    throw new Error(
      `Refusing asset register clean when APP_ENV=${appEnv ?? '(unset)'}.`,
    );
  }
  if (process.env.CLEAN_ASSET_REGISTER_STAGING !== '1') {
    throw new Error(
      'Refusing asset register clean: set CLEAN_ASSET_REGISTER_STAGING=1 explicitly.',
    );
  }
  if (appEnv !== 'staging') {
    throw new Error(
      `Refusing asset register clean: APP_ENV must be staging (got ${appEnv ?? '(unset)'}).`,
    );
  }
  assertStagingNonprodDatabaseUrl(resolveStagingDatabaseUrl());
}
