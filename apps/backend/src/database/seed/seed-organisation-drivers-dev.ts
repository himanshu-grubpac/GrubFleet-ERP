/**
 * Dev-only: idempotent sample organisation drivers.
 *
 *   npm run reset:dev:organisation-drivers -w backend
 *
 * Requires: migrations, db:seed, and dev supplier seed (driver-type supplier).
 */
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { organisationDrivers, organisationSuppliers } from '../schema';
import {
  DEV_SEED_SUPPLIER_EMAIL_DOMAIN,
  DEV_SEED_SUPPLIER_EMAIL_PREFIX,
} from './seed-organisation-suppliers-dev';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';
import { DEV_SEED_DRIVER_FLEET_CONTRACT_NUMBER } from './seed-organisation-driver-fleet-dev';
import { leaseContracts } from '../schema';

export const DEV_SEED_DRIVER_EMAIL_DOMAIN = '@grubpac.local';
export const DEV_SEED_DRIVER_EMAIL_PREFIX = 'dev.seed.driver.';
export const DEV_SEED_DRIVER_NAME_PREFIX = 'Dev Seed Driver';

export function isDevSeedDriverMarker(row: {
  email: string;
  name: string;
}): boolean {
  const email = row.email.trim().toLowerCase();
  if (
    email.startsWith(DEV_SEED_DRIVER_EMAIL_PREFIX.toLowerCase()) &&
    email.endsWith(DEV_SEED_DRIVER_EMAIL_DOMAIN.toLowerCase())
  ) {
    return true;
  }
  return row.name.startsWith(DEV_SEED_DRIVER_NAME_PREFIX);
}

type DriverSeedRow = {
  seedKey: string;
  name: string;
  cprNo: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
  addressCountry: string;
  isActive: boolean;
  assignedVehicleCode?: string;
  assignedVehicleAssetClass?: string;
  assignedActiveLeaseId?: string;
  vehicleTiedToContract?: boolean;
};

const DRIVER_SEEDS: DriverSeedRow[] = [
  {
    seedKey: 'active-assigned',
    name: 'Dev Seed Driver — Yousif Al-Mahmood (assigned)',
    cprNo: '980123456',
    phone: '+971501234567',
    email: `${DEV_SEED_DRIVER_EMAIL_PREFIX}active-assigned${DEV_SEED_DRIVER_EMAIL_DOMAIN}`,
    licenseNumber: 'DL-048231',
    licenseExpiry: '2027-04-18',
    addressLine1: 'Building 12, Road 1234',
    addressDistrict: 'Manama',
    addressState: 'Capital',
    addressPincode: '12345',
    addressCountry: 'BH',
    isActive: true,
    assignedVehicleCode: 'VH-1042',
    assignedVehicleAssetClass: 'Sedan — Standard',
    assignedActiveLeaseId: undefined,
    vehicleTiedToContract: true,
  },
  {
    seedKey: 'inactive',
    name: 'Dev Seed Driver — Fatima Al-Binali (inactive)',
    cprNo: '990234567',
    phone: '+971502345678',
    email: `${DEV_SEED_DRIVER_EMAIL_PREFIX}inactive${DEV_SEED_DRIVER_EMAIL_DOMAIN}`,
    licenseNumber: 'DL-055123',
    licenseExpiry: '2027-08-21',
    addressLine1: 'Flat 4, Muharraq Central',
    addressDistrict: 'Muharraq',
    addressState: 'Muharraq',
    addressPincode: '23456',
    addressCountry: 'BH',
    isActive: false,
  },
  {
    seedKey: 'license-expired',
    name: 'Dev Seed Driver — Hassan Al-Doseri (expired license)',
    cprNo: '970345678',
    phone: '+971503456789',
    email: `${DEV_SEED_DRIVER_EMAIL_PREFIX}license-expired${DEV_SEED_DRIVER_EMAIL_DOMAIN}`,
    licenseNumber: 'DL-031992',
    licenseExpiry: '2024-06-01',
    addressLine1: 'Villa 8, Riffa Views',
    addressDistrict: 'Riffa',
    addressState: 'Southern',
    addressPincode: '34567',
    addressCountry: 'BH',
    isActive: true,
  },
  {
    seedKey: 'unassigned-active',
    name: 'Dev Seed Driver — Sara Al-Khalifa (unassigned)',
    cprNo: '960456789',
    phone: '+919876543210',
    email: `${DEV_SEED_DRIVER_EMAIL_PREFIX}unassigned${DEV_SEED_DRIVER_EMAIL_DOMAIN}`,
    licenseNumber: 'DL-127853',
    licenseExpiry: '2028-07-22',
    addressLine1: 'Sector 18, Gurugram',
    addressCity: 'Gurugram',
    addressState: 'Haryana',
    addressDistrict: 'Gurugram',
    addressPincode: '122015',
    addressCountry: 'IN',
    isActive: true,
  },
];

export const DEV_SEED_DRIVER_EXPECTED_COUNT = DRIVER_SEEDS.length;

async function resolveDriverSupplierId(
  db: ReturnType<typeof drizzle>,
  devOrgId: string,
): Promise<string> {
  const driverSupplierEmail = `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}driver${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`;
  const [row] = await db
    .select({ id: organisationSuppliers.id })
    .from(organisationSuppliers)
    .where(
      and(
        eq(organisationSuppliers.organizationId, devOrgId),
        eq(organisationSuppliers.contactEmail, driverSupplierEmail),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error(
      'Driver-type dev supplier not found. Run npm run seed:dev:organisation-suppliers -w backend first.',
    );
  }
  return row.id;
}

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);
  const supplierId = await resolveDriverSupplierId(db, devOrgId);

  const [devFleetContract] = await db
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
  const devFleetContractId = devFleetContract?.id ?? null;

  let inserted = 0;
  let skipped = 0;

  for (const seed of DRIVER_SEEDS) {
    const existing = await db
      .select({ id: organisationDrivers.id })
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, devOrgId),
          eq(organisationDrivers.email, seed.email),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    const assignedActiveLeaseId =
      seed.seedKey === 'active-assigned' && devFleetContractId
        ? devFleetContractId
        : (seed.assignedActiveLeaseId ?? null);

    await db.insert(organisationDrivers).values({
      organizationId: devOrgId,
      name: seed.name,
      cprNo: seed.cprNo,
      phone: seed.phone,
      email: seed.email,
      licenseNumber: seed.licenseNumber,
      licenseExpiry: seed.licenseExpiry,
      supplierId,
      addressLine1: seed.addressLine1,
      addressLine2: seed.addressLine2 ?? null,
      addressCity: seed.addressCity ?? null,
      addressState: seed.addressState,
      addressDistrict: seed.addressDistrict,
      addressPincode: seed.addressPincode,
      addressCountry: seed.addressCountry,
      isActive: seed.isActive,
      assignedVehicleCode: seed.assignedVehicleCode ?? null,
      assignedVehicleAssetClass: seed.assignedVehicleAssetClass ?? null,
      assignedActiveLeaseId,
      vehicleTiedToContract: seed.vehicleTiedToContract ?? false,
    });
    inserted += 1;
  }

  console.log(
    `Dev organisation drivers seed complete (org=${devOrgId}, db=${maskDatabaseUrl(connectionString)}).`,
  );
  console.log(`Inserted: ${inserted}, skipped (already present): ${skipped}.`);

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
