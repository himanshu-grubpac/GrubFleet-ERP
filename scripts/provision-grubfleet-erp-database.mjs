/**
 * Create a logical PostgreSQL database on shared grubpac-v2 (or any server in DATABASE_URL).
 *
 * Usage:
 *   set ADMIN_DATABASE_URL=postgresql://user:pass@host:5432/postgres?sslmode=require
 *   node scripts/provision-grubfleet-erp-database.mjs grubfleet_erp_fleet_beta
 *
 * Or derive admin URL from an existing tier URL (connects to `postgres` maintenance DB):
 *   set DATABASE_URL=postgresql://user:pass@host:5432/grubfleet_erp_preprod?sslmode=require
 *   node scripts/provision-grubfleet-erp-database.mjs grubfleet_erp_fleet_beta
 */
import pg from 'pg';

const targetDb = process.argv[2]?.trim();
if (!targetDb || !/^[a-z][a-z0-9_]*$/.test(targetDb)) {
  console.error(
    'Usage: node scripts/provision-grubfleet-erp-database.mjs <database_name>',
  );
  process.exit(1);
}

function adminConnectionString() {
  const admin = process.env.ADMIN_DATABASE_URL?.trim();
  if (admin) return admin;

  const tierUrl = process.env.DATABASE_URL?.trim();
  if (!tierUrl) {
    console.error('Set ADMIN_DATABASE_URL or DATABASE_URL.');
    process.exit(1);
  }

  const url = new URL(tierUrl);
  url.pathname = '/postgres';
  return url.toString();
}

let adminUrl = adminConnectionString();
const useRdsSsl =
  /amazonaws\.com/i.test(adminUrl) || /sslmode=require/i.test(adminUrl);

if (useRdsSsl) {
  const parsed = new URL(adminUrl);
  parsed.searchParams.delete('sslmode');
  adminUrl = parsed.toString();
}

const pool = new pg.Pool({
  connectionString: adminUrl,
  ssl: useRdsSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  const exists = await pool.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [targetDb],
  );
  if (exists.rowCount > 0) {
    console.log(`Database "${targetDb}" already exists — nothing to do.`);
    process.exit(0);
  }

  await pool.query(`CREATE DATABASE "${targetDb.replace(/"/g, '')}"`);
  console.log(`Created database "${targetDb}".`);
} finally {
  await pool.end();
}
