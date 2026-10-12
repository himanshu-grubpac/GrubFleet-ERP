/**
 * Staging (nonprod RDS): delete all Asset Register module rows.
 *
 * Unlinks finance_invoice_lines.vehicle_id only (no finance invoice deletes).
 * Does not touch organisation, fleet, workshop, inventory, or permission catalog.
 *
 * Requires:
 *   APP_ENV=staging
 *   CLEAN_ASSET_REGISTER_STAGING=1
 *   DATABASE_URL → grubfleet_erp_nonprod on grubpac-v2 (from samconfig.staging.toml)
 *
 *   npx ts-node -r tsconfig-paths/register src/database/seed/clean-asset-register-staging.ts
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  assetRegisterAssetClasses,
  assetRegisterAssetMasters,
  assetRegisterFleetCodeCounters,
  assetRegisterVehicleAssignments,
  assetRegisterVehicles,
} from '../schema/asset-register.schema';
import { financeInvoiceLines } from '../schema/finance.schema';
import {
  assertStagingAssetRegisterCleanAllowed,
  maskDatabaseUrl,
  resolveStagingDatabaseUrl,
} from './staging-demo-guards';

type CountKey =
  | 'financeInvoiceLinesUnlinked'
  | 'assetRegisterVehicleAssignments'
  | 'assetRegisterVehicles'
  | 'assetRegisterAssetMasters'
  | 'assetRegisterAssetClasses'
  | 'assetRegisterFleetCodeCounters';

async function countRows(pool: Pool, tableName: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${tableName}`,
  );
  return Number.parseInt(result.rows[0]?.count ?? '0', 10);
}

async function main(): Promise<void> {
  assertStagingAssetRegisterCleanAllowed();
  const connectionString = resolveStagingDatabaseUrl();

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const before: Record<CountKey, number> = {
    financeInvoiceLinesUnlinked: 0,
    assetRegisterVehicleAssignments: await countRows(
      pool,
      'asset_register_vehicle_assignments',
    ),
    assetRegisterVehicles: await countRows(pool, 'asset_register_vehicles'),
    assetRegisterAssetMasters: await countRows(
      pool,
      'asset_register_asset_masters',
    ),
    assetRegisterAssetClasses: await countRows(
      pool,
      'asset_register_asset_classes',
    ),
    assetRegisterFleetCodeCounters: await countRows(
      pool,
      'asset_register_fleet_code_counters',
    ),
  };

  const linkedLines = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(financeInvoiceLines)
    .where(sql`${financeInvoiceLines.vehicleId} IS NOT NULL`);
  before.financeInvoiceLinesUnlinked = linkedLines[0]?.n ?? 0;

  console.log(
    JSON.stringify(
      {
        phase: 'before',
        db: maskDatabaseUrl(connectionString),
        counts: before,
      },
      null,
      2,
    ),
  );

  await db.transaction(async (tx) => {
    if (before.financeInvoiceLinesUnlinked > 0) {
      await tx
        .update(financeInvoiceLines)
        .set({ vehicleId: null })
        .where(sql`${financeInvoiceLines.vehicleId} IS NOT NULL`);
    }

    await tx.delete(assetRegisterVehicleAssignments);
    await tx.delete(assetRegisterVehicles);
    await tx.delete(assetRegisterAssetMasters);
    await tx.delete(assetRegisterAssetClasses);
    await tx.delete(assetRegisterFleetCodeCounters);
  });

  const after: Record<CountKey, number> = {
    financeInvoiceLinesUnlinked: 0,
    assetRegisterVehicleAssignments: await countRows(
      pool,
      'asset_register_vehicle_assignments',
    ),
    assetRegisterVehicles: await countRows(pool, 'asset_register_vehicles'),
    assetRegisterAssetMasters: await countRows(
      pool,
      'asset_register_asset_masters',
    ),
    assetRegisterAssetClasses: await countRows(
      pool,
      'asset_register_asset_classes',
    ),
    assetRegisterFleetCodeCounters: await countRows(
      pool,
      'asset_register_fleet_code_counters',
    ),
  };

  const linkedAfter = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(financeInvoiceLines)
    .where(sql`${financeInvoiceLines.vehicleId} IS NOT NULL`);
  after.financeInvoiceLinesUnlinked = linkedAfter[0]?.n ?? 0;

  const deleted: Record<string, number> = {
    financeInvoiceLinesUnlinked:
      before.financeInvoiceLinesUnlinked - after.financeInvoiceLinesUnlinked,
    assetRegisterVehicleAssignments:
      before.assetRegisterVehicleAssignments -
      after.assetRegisterVehicleAssignments,
    assetRegisterVehicles:
      before.assetRegisterVehicles - after.assetRegisterVehicles,
    assetRegisterAssetMasters:
      before.assetRegisterAssetMasters - after.assetRegisterAssetMasters,
    assetRegisterAssetClasses:
      before.assetRegisterAssetClasses - after.assetRegisterAssetClasses,
    assetRegisterFleetCodeCounters:
      before.assetRegisterFleetCodeCounters -
      after.assetRegisterFleetCodeCounters,
  };

  console.log(
    JSON.stringify(
      {
        phase: 'after',
        db: maskDatabaseUrl(connectionString),
        deleted,
        counts: after,
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
