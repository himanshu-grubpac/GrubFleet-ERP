/**
 * Local Docker only: refresh dev admin login after DB clone (no finance/inventory demo seed).
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
  seedOrganizationAdminUser,
} from './dev-admin-bootstrap';

const LOCAL_DB_NAME = 'grubpac_erp';

function assertLocalTarget(connectionString: string): void {
  let host: string;
  let dbName: string;
  try {
    const url = new URL(connectionString.replace(/^postgresql:/, 'postgres:'));
    host = url.hostname;
    dbName = url.pathname.replace(/^\//, '').split('?')[0];
  } catch {
    throw new Error('Invalid DATABASE_URL');
  }
  if (dbName !== LOCAL_DB_NAME) {
    throw new Error(
      `Refusing admin bootstrap: expected database ${LOCAL_DB_NAME}, got ${dbName}`,
    );
  }
  if (
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    host !== 'host.docker.internal'
  ) {
    throw new Error(
      `Refusing admin bootstrap: expected localhost target, got host ${host}`,
    );
  }
}

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
  assertLocalTarget(connectionString);

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

  await seedOrganizationAdminUser(db, {
    email: DEV_ADMIN_EMAIL,
    password: DEV_ADMIN_PASSWORD,
    fullName: 'Dev Admin',
  });

  await pool.end();
  console.log(
    `Local dev admin bootstrap complete (${DEV_ADMIN_EMAIL}; password from dev-admin-bootstrap constants).`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
