import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { resolveStagingDatabaseUrl } from './staging-demo-guards';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';

async function main(): Promise<void> {
  const connectionString = resolveStagingDatabaseUrl();
  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(sql`${schema.organizations.slug} = ${DEV_ORG_SLUG}`)
    .limit(1);
  if (!org) {
    console.log(JSON.stringify({ error: 'org_not_found', slug: DEV_ORG_SLUG }));
    await pool.end();
    process.exit(1);
  }

  const oid = org.id;
  type CountRow = { c: number };
  const readCount = (rows: CountRow[]) => rows[0]?.c ?? 0;

  const count = async (table: string) => {
    const r = await pool.query<CountRow>(
      `select count(*)::int as c from ${table} where organization_id = $1`,
      [oid],
    );
    return readCount(r.rows);
  };

  const users = await pool.query<CountRow>(
    'select count(*)::int as c from users',
  );
  const memberships = await pool.query<CountRow>(
    'select count(*)::int as c from memberships where organization_id = $1',
    [oid],
  );

  console.log(
    JSON.stringify(
      {
        orgSlug: DEV_ORG_SLUG,
        organizationId: oid,
        usersTotal: readCount(users.rows),
        memberships: readCount(memberships.rows),
        organisation_locations: await count('organisation_locations'),
        organisation_clients: await count('organisation_clients'),
        organisation_suppliers: await count('organisation_suppliers'),
        organisation_employees: await count('organisation_employees'),
        organisation_drivers: await count('organisation_drivers'),
        asset_register_vehicles: await count('asset_register_vehicles'),
        asset_register_asset_classes: await count(
          'asset_register_asset_classes',
        ),
        lease_contracts: await count('lease_contracts'),
        finance_invoices: await count('finance_invoices'),
        inventory_catalog_parts: await count('inventory_catalog_parts'),
        workshop_work_orders: await count('workshop_work_orders'),
        fleet_clients: await count('fleet_clients'),
        organisation_location_types: await count('organisation_location_types'),
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
