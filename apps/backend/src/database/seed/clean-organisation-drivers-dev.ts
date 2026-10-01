/**
 * Dev-only: purge organisation drivers for the dev org.
 *
 *   npm run clean:dev:organisation-drivers -w backend
 */
import { and, eq, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { organisationDrivers } from '../schema';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';
import {
  DEV_SEED_DRIVER_EMAIL_DOMAIN,
  DEV_SEED_DRIVER_EMAIL_PREFIX,
  DEV_SEED_DRIVER_NAME_PREFIX,
} from './seed-organisation-drivers-dev';

function devSeedDriverKeepCondition() {
  const emailPattern = `${DEV_SEED_DRIVER_EMAIL_PREFIX}%${DEV_SEED_DRIVER_EMAIL_DOMAIN}`;
  return or(
    sql`lower(${organisationDrivers.email}) LIKE ${emailPattern.toLowerCase()}`,
    sql`${organisationDrivers.name} LIKE ${`${DEV_SEED_DRIVER_NAME_PREFIX}%`}`,
  );
}

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const purgeAll = process.argv.includes('--purge-all');

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);

  const deleteWhere = purgeAll
    ? eq(organisationDrivers.organizationId, devOrgId)
    : and(
        eq(organisationDrivers.organizationId, devOrgId),
        sql`NOT (${devSeedDriverKeepCondition()})`,
      );

  const deleted = await db
    .delete(organisationDrivers)
    .where(deleteWhere)
    .returning({ id: organisationDrivers.id });

  console.log(
    `Dev organisation drivers clean complete (org=${devOrgId}, db=${maskDatabaseUrl(connectionString)}, purgeAll=${purgeAll}).`,
  );
  console.log(`Removed ${deleted.length} driver row(s).`);

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
