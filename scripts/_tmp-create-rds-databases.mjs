import pg from 'pg';

const stagingUrl = process.env.STAGING_DB_URL;
if (!stagingUrl) {
  console.error('Missing STAGING_DB_URL');
  process.exit(1);
}

const admin = new URL(stagingUrl);
admin.pathname = '/postgres';

const client = new pg.Client({
  connectionString: admin.toString(),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

for (const db of ['grubfleet_preprod', 'grubfleet_production']) {
  const ex = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
  if (ex.rowCount === 0) {
    await client.query(`CREATE DATABASE ${db}`);
    console.log('CREATED', db);
  } else {
    console.log('EXISTS', db);
  }
}

await client.end();
