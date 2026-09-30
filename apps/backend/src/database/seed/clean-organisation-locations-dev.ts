/**
 * Dev-only cleanup: clears organisation employees + locations for grubpac-dev, then
 * removes integration-test RBAC users/roles (keeps dev admin + Organization Admin).
 *
 * Run (local Docker Postgres): npm run clean:dev:organisation-data -w backend
 * Manual: npx ts-node -r tsconfig-paths/register src/database/seed/clean-organisation-locations-dev.ts --confirm-dev
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  assertDevOnly,
  cleanDevOrganisationEmployeesAndLocations,
  cleanDevRbacTestArtifacts,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);
  const organisationData = await cleanDevOrganisationEmployeesAndLocations(
    db,
    pool,
    devOrgId,
  );
  const rbac = await cleanDevRbacTestArtifacts(db, devOrgId);

  console.log(
    JSON.stringify(
      {
        connection: maskDatabaseUrl(connectionString),
        organisationData,
        rbac,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
