/**
 * Set one user's password hash on pre-prod or fleet-beta DB only (ops; password via env).
 * SET_USER_PASSWORD_EMAIL, SET_USER_PASSWORD_PLAIN, DATABASE_URL required.
 */
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { users } from '../schema';
import {
  assertPasswordMeetsPolicy,
  hashPassword,
} from '../../modules/auth/utils/password-policy.util';

const ALLOWED_DB = new Set([
  'grubfleet_erp_preprod',
  'grubfleet_erp_fleet_beta',
]);

function assertAllowedDatabase(connectionString: string): string {
  let dbName: string;
  try {
    dbName = new URL(
      connectionString.replace(/^postgresql:/, 'postgres:'),
    ).pathname
      .replace(/^\//, '')
      .split('?')[0];
  } catch {
    throw new Error('Invalid DATABASE_URL');
  }
  if (!ALLOWED_DB.has(dbName)) {
    throw new Error(
      `Refusing password set: database must be one of ${[...ALLOWED_DB].join(', ')}, got ${dbName}`,
    );
  }
  return dbName;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  const dbName = assertAllowedDatabase(connectionString);

  const email = process.env.SET_USER_PASSWORD_EMAIL?.trim().toLowerCase();
  const plain = process.env.SET_USER_PASSWORD_PLAIN;
  if (!email || !plain) {
    throw new Error(
      'SET_USER_PASSWORD_EMAIL and SET_USER_PASSWORD_PLAIN are required',
    );
  }
  assertPasswordMeetsPolicy(plain);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const passwordHash = await hashPassword(plain);
  const updated = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email });

  await pool.end();

  if (updated.length === 0) {
    throw new Error(`No user found for email ${email} on ${dbName}`);
  }
  console.log(
    `Password updated for ${updated[0].email} on ${dbName} (hash only; plain not logged).`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
