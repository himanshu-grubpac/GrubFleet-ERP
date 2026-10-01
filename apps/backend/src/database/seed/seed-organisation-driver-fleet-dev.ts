/**
 * Dev-only: active lease + vehicle allocations for driver assign flow.
 *
 *   npm run seed:dev:organisation-driver-fleet -w backend
 *
 * Run before or as part of reset:dev:organisation-drivers. Idempotent by contract number + registration.
 */
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  fleetVehicleAllocations,
  fleetVehicles,
  leaseContracts,
} from '../schema';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';

export const DEV_SEED_DRIVER_FLEET_CONTRACT_NUMBER = 'LC-DEV-DRIVER-001';

const VEHICLE_FIXTURES = [
  {
    registrationNo: 'VH-1042',
    vin: 'DEVSEEDVH1042VIN00001',
    assetClass: 'Sedan — Standard',
  },
  {
    registrationNo: 'VH-2099',
    vin: 'DEVSEEDVH2099VIN00001',
    assetClass: 'SUV — Premium',
  },
] as const;

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });
  const devOrgId = await resolveDevOrganizationId(db);

  const expiry = new Date('2028-12-31T00:00:00.000Z');

  let contractId: string;
  const [existingContract] = await db
    .select({ id: leaseContracts.id })
    .from(leaseContracts)
    .where(
      and(
        eq(leaseContracts.organizationId, devOrgId),
        eq(
          leaseContracts.contractNumber,
          DEV_SEED_DRIVER_FLEET_CONTRACT_NUMBER,
        ),
      ),
    )
    .limit(1);

  if (existingContract) {
    contractId = existingContract.id;
  } else {
    const [inserted] = await db
      .insert(leaseContracts)
      .values({
        organizationId: devOrgId,
        contractNumber: DEV_SEED_DRIVER_FLEET_CONTRACT_NUMBER,
        status: 'active',
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        endDate: new Date('2027-12-31T00:00:00.000Z'),
        termMonths: 36,
      })
      .returning({ id: leaseContracts.id });
    contractId = inserted.id;
  }

  let vehiclesInserted = 0;
  let allocationsInserted = 0;

  for (const fixture of VEHICLE_FIXTURES) {
    let vehicleId: string;
    const [existingVehicle] = await db
      .select({ id: fleetVehicles.id })
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.organizationId, devOrgId),
          eq(fleetVehicles.registrationNo, fixture.registrationNo),
        ),
      )
      .limit(1);

    if (existingVehicle) {
      vehicleId = existingVehicle.id;
    } else {
      const [insertedVehicle] = await db
        .insert(fleetVehicles)
        .values({
          organizationId: devOrgId,
          vin: fixture.vin,
          registrationNo: fixture.registrationNo,
          registrationExpiry: expiry,
          insuranceExpiry: expiry,
          assetClass: fixture.assetClass,
          status: 'leased',
        })
        .returning({ id: fleetVehicles.id });
      vehicleId = insertedVehicle.id;
      vehiclesInserted += 1;
    }

    const [existingAllocation] = await db
      .select({ id: fleetVehicleAllocations.id })
      .from(fleetVehicleAllocations)
      .where(
        and(
          eq(fleetVehicleAllocations.organizationId, devOrgId),
          eq(fleetVehicleAllocations.contractId, contractId),
          eq(fleetVehicleAllocations.vehicleId, vehicleId),
        ),
      )
      .limit(1);

    if (!existingAllocation) {
      await db.insert(fleetVehicleAllocations).values({
        organizationId: devOrgId,
        contractId,
        vehicleId,
      });
      allocationsInserted += 1;
    }
  }

  console.log(
    `Dev driver-assign fleet fixtures complete (org=${devOrgId}, contract=${DEV_SEED_DRIVER_FLEET_CONTRACT_NUMBER}, db=${maskDatabaseUrl(connectionString)}).`,
  );
  console.log(
    `Vehicles inserted: ${vehiclesInserted}, allocations inserted: ${allocationsInserted}.`,
  );

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
