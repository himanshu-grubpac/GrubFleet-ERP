/**
 * Dev-only: remove integration-test users and extra org roles for grubpac-dev.
 * Keeps admin@grubpac.local, Organization Admin, and System Administrator.
 *
 * Run: npm run clean:dev:rbac-test-artifacts -w backend
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  assertDevOnly,
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
  const result = await cleanDevRbacTestArtifacts(db, devOrgId);

  console.log(
    JSON.stringify(
      {
        connection: maskDatabaseUrl(connectionString),
        ...result,
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
