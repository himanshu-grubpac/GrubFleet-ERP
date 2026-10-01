/**
 * Dev-only: purge organisation suppliers for the dev org (grubpac-dev).
 *
 * Default — removes integration junk (e.g. Lattice Supplier *), manual/API rows, and
 * any row that is not a canonical dev seed marker (dev.seed.supplier.*@grubpac.local
 * or name prefix "Dev Seed Supplier"). Keeps the five seed rows.
 *
 *   npm run clean:dev:organisation-suppliers -w backend
 *
 * --purge-all — delete every supplier for the dev org (including seed markers). Pair with seed.
 *
 *   npx ts-node -r tsconfig-paths/register src/database/seed/clean-organisation-suppliers-dev.ts --confirm-dev --purge-all
 */
import { and, eq, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { organisationSuppliers } from '../schema';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';
import {
  DEV_SEED_SUPPLIER_EMAIL_DOMAIN,
  DEV_SEED_SUPPLIER_EMAIL_PREFIX,
  DEV_SEED_SUPPLIER_NAME_PREFIX,
} from './seed-organisation-suppliers-dev';

function devSeedSupplierKeepCondition() {
  const emailPattern = `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}%${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`;
  return or(
    sql`lower(${organisationSuppliers.contactEmail}) LIKE ${emailPattern.toLowerCase()}`,
    sql`${organisationSuppliers.name} LIKE ${`${DEV_SEED_SUPPLIER_NAME_PREFIX}%`}`,
  );
}

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const purgeAll = process.argv.includes('--purge-all');

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);

  const beforeRows = await db
    .select({
      id: organisationSuppliers.id,
      name: organisationSuppliers.name,
      contactEmail: organisationSuppliers.contactEmail,
    })
    .from(organisationSuppliers)
    .where(eq(organisationSuppliers.organizationId, devOrgId));

  const deleteWhere = purgeAll
    ? eq(organisationSuppliers.organizationId, devOrgId)
    : and(
        eq(organisationSuppliers.organizationId, devOrgId),
        sql`NOT (${devSeedSupplierKeepCondition()})`,
      );

  const deleted = await db
    .delete(organisationSuppliers)
    .where(deleteWhere)
    .returning({
      name: organisationSuppliers.name,
      contactEmail: organisationSuppliers.contactEmail,
    });

  const afterRows = await db
    .select({ id: organisationSuppliers.id })
    .from(organisationSuppliers)
    .where(eq(organisationSuppliers.organizationId, devOrgId));

  console.log(
    `Cleaned dev organisation suppliers (org=${devOrgId}, db=${maskDatabaseUrl(connectionString)}, mode=${purgeAll ? 'purge-all' : 'purge-non-seed'}).`,
  );
  console.log(
    `Before: ${beforeRows.length}, deleted: ${deleted.length}, remaining: ${afterRows.length}`,
  );
  for (const row of deleted) {
    console.log(`  - ${row.name} <${row.contactEmail}>`);
  }

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
