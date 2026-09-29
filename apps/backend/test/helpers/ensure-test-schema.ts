import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

let migratePromise: Promise<Pool> | null = null;

export async function ensureTestSchema(): Promise<Pool> {
  if (!migratePromise) {
    migratePromise = (async () => {
      const connectionString =
        process.env.DATABASE_URL ??
        'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';

      const pool = new Pool({ connectionString });
      const db = drizzle(pool);
      const migrationsFolder = path.resolve(__dirname, '../../drizzle');
      await migrate(db, { migrationsFolder });
      return pool;
    })();
  }
  return migratePromise;
}
