/**
 * Staging nonprod RDS: remove interconnected + workshop demo rows for dev org.
 * Preserves auth users, memberships, roles, permission catalog, org shell.
 *
 *   APP_ENV=staging PURGE_STAGING_DEMO=1 DATABASE_URL=... npx ts-node ...
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { purgeStagingInterconnectedDemo } from './purge-staging-interconnected-demo';
import {
  assertStagingDemoPurgeAllowed,
  maskDatabaseUrl,
  resolveStagingDatabaseUrl,
} from './staging-demo-guards';

async function main(): Promise<void> {
  assertStagingDemoPurgeAllowed();
  const connectionString = resolveStagingDatabaseUrl();
  console.log(
    JSON.stringify({ phase: 'start', db: maskDatabaseUrl(connectionString) }),
  );

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const purged = await purgeStagingInterconnectedDemo(db);
  console.log(JSON.stringify({ phase: 'complete', purged }, null, 2));

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
