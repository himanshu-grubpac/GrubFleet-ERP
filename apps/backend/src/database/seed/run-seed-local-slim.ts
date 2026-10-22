/**
 * Local slim professional seed — permissions, admin bootstrap, org + asset sample rows.
 *
 *   npm run db:seed -w backend   (alias: db:seed:local-slim)
 *
 * Requires: Docker Postgres (grubpac_erp), APP_ENV=development, migrations applied.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { permissions } from '../schema';
import { buildPhase1PermissionCatalog } from './permission-catalog';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ORG_NAME,
  DEV_ORG_SLUG,
  seedDevAdminBootstrap,
} from './dev-admin-bootstrap';
import {
  LOCAL_DEFAULT_DATABASE_URL,
  maskDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';
import { assertLocalSlimOrgAssetSeedAllowed } from './staging-demo-guards';
import {
  countSlimSeedScopeRows,
  seedLocalOrgAndAssetSlim,
} from './seed-local-org-and-asset-slim';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ?? LOCAL_DEFAULT_DATABASE_URL;

  assertLocalSlimOrgAssetSeedAllowed(connectionString);

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

  await seedDevAdminBootstrap(db);
  const devOrgId = await resolveDevOrganizationId(db);
  const summary = await seedLocalOrgAndAssetSlim(db, devOrgId);
  const tableCounts = await countSlimSeedScopeRows(db, devOrgId);

  console.log(
    JSON.stringify(
      {
        database: maskDatabaseUrl(connectionString),
        login: {
          email: DEV_ADMIN_EMAIL,
          password: DEV_ADMIN_PASSWORD,
          organizationSlug: DEV_ORG_SLUG,
          organizationName: DEV_ORG_NAME,
        },
        seedRun: summary,
        orgScopedTableCounts: tableCounts,
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
