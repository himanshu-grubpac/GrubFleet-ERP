/**
 * Fleet + beta only: permission catalog + one org-admin login user (no demo/business seed).
 * Requires DATABASE_URL pointing at grubfleet_erp_fleet_beta and SEED_USER_* env vars.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { permissions } from '../schema';
import { buildPhase1PermissionCatalog } from './permission-catalog';
import { seedOrganizationAdminUser } from './dev-admin-bootstrap';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const FLEET_BETA_DB_MARKER = 'grubfleet_erp_fleet_beta';

function assertFleetBetaDatabase(connectionString: string): void {
  let dbName: string;
  try {
    dbName = new URL(
      connectionString.replace(/^postgresql:/, 'postgres:'),
    ).pathname
      .replace(/^\//, '')
      .split('?')[0];
  } catch {
    throw new Error('Invalid DATABASE_URL');
  }
  if (dbName !== FLEET_BETA_DB_MARKER) {
    throw new Error(
      `Refusing minimal login seed: expected database ${FLEET_BETA_DB_MARKER}, got ${dbName}`,
    );
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  assertFleetBetaDatabase(connectionString);

  const email = process.env.SEED_USER_EMAIL?.trim();
  const password = process.env.SEED_USER_PASSWORD;
  const fullName = process.env.SEED_USER_FULL_NAME?.trim() || 'Fleet Beta User';

  if (!email || !password) {
    throw new Error('SEED_USER_EMAIL and SEED_USER_PASSWORD are required');
  }

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const catalog = buildPhase1PermissionCatalog();
  for (const item of catalog) {
    await db
      .insert(permissions)
      .values({
        key: item.key,
        module: item.module,
        action: item.action,
        kind: item.kind,
        description: item.description,
      })
      .onConflictDoUpdate({
        target: permissions.key,
        set: {
          module: item.module,
          action: item.action,
          kind: item.kind,
          description: item.description,
        },
      });
  }

  console.log(
    `Seeded ${catalog.length} Phase 1 module permissions (idempotent).`,
  );

  await seedOrganizationAdminUser(db, { email, password, fullName });
  console.log(
    `Minimal org-admin login seeded for ${email.toLowerCase()} (no business/demo data).`,
  );

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
