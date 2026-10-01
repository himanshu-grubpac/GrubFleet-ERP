/**
 * Dev-only: purge organisation clients for the dev org.
 *
 *   npm run clean:dev:organisation-clients -w backend
 *
 * --purge-all — delete every client for the dev org (including seed markers).
 */
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { organisationClients } from '../schema';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';
import { DEV_SEED_CLIENT_NAME_PREFIX } from './seed-organisation-clients-dev';

function devSeedClientKeepCondition() {
  return sql`${organisationClients.name} LIKE ${`${DEV_SEED_CLIENT_NAME_PREFIX}%`}`;
}

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const purgeAll = process.argv.includes('--purge-all');

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);

  const deleteWhere = purgeAll
    ? eq(organisationClients.organizationId, devOrgId)
    : and(
        eq(organisationClients.organizationId, devOrgId),
        sql`NOT (${devSeedClientKeepCondition()})`,
      );

  const deleted = await db
    .delete(organisationClients)
    .where(deleteWhere)
    .returning({ id: organisationClients.id });

  console.log(
    `Dev organisation clients clean complete (org=${devOrgId}, db=${maskDatabaseUrl(connectionString)}, purgeAll=${purgeAll}).`,
  );
  console.log(`Deleted clients: ${deleted.length} (POCs cascade).`);

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
