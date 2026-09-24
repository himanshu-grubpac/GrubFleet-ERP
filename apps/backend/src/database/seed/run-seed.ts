import * as dotenv from 'dotenv';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { permissions } from '../schema';
import { buildProvisionalPermissionCatalog } from './permission-catalog';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const catalog = buildProvisionalPermissionCatalog();
  for (const item of catalog) {
    await db
      .insert(permissions)
      .values({
        key: item.key,
        module: item.module,
        action: item.action,
        description: item.description,
      })
      .onConflictDoNothing({ target: permissions.key });
  }

  console.log(`Seeded ${catalog.length} provisional permissions (idempotent).`);
  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
