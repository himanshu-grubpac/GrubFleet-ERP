import * as dotenv from 'dotenv';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { permissions } from '../schema';
import { buildPhase1PermissionCatalog } from './permission-catalog';
import { seedDevAdminBootstrap } from './dev-admin-bootstrap';
import { assertStagingDemoSeedAllowed } from './staging-demo-guards';
import { seedStagingInterconnectedDemo } from './seed-staging-interconnected-demo';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';

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

  await seedDevAdminBootstrap(db);
  console.log(
    'Dev admin bootstrap complete (user, org, membership, role, grants).',
  );
  console.log(
    'Credentials: see .project-tracking/SEED_CREDENTIALS.local.md (local only).',
  );

  if (process.env.SEED_STAGING_DEMO === '1') {
    assertStagingDemoSeedAllowed();
    const summary = await seedStagingInterconnectedDemo(db);
    console.log('Staging interconnected demo seed complete.');
    console.log(JSON.stringify(summary, null, 2));
  }

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
