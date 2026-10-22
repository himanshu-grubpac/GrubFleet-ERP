/**
 * Pre-prod RDS (grubfleet_erp_preprod): remove demo + all org business rows for dev org.
 * Preserves auth users, password hashes, memberships, roles, permission catalog, org shell.
 *
 *   APP_ENV=preprod PURGE_PREPROD_BUSINESS=1 DATABASE_URL=... npx ts-node ...
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { purgeStagingAllOrgBusinessData } from './purge-staging-all-org-business';
import { purgeStagingInterconnectedDemo } from './purge-staging-interconnected-demo';
import {
  assertPreprodBusinessPurgeAllowed,
  maskDatabaseUrl,
  resolveStagingDatabaseUrl,
} from './staging-demo-guards';

async function main(): Promise<void> {
  assertPreprodBusinessPurgeAllowed();
  const connectionString = resolveStagingDatabaseUrl();
  console.log(
    JSON.stringify({ phase: 'start', db: maskDatabaseUrl(connectionString) }),
  );

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const demoPurged = await purgeStagingInterconnectedDemo(db);
  const allOrgPurged = await purgeStagingAllOrgBusinessData(db);
  console.log(
    JSON.stringify({ phase: 'complete', demoPurged, allOrgPurged }, null, 2),
  );

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
