/**
 * Dev-only: idempotent sample organisation suppliers (five rows — all four API types).
 *
 * Canonical dev data only. Run clean before seed when the list has integration or manual junk:
 *   npm run reset:dev:organisation-suppliers -w backend
 *
 * Seed only (skips rows already present by marker email):
 *   npm run seed:dev:organisation-suppliers -w backend
 *
 * Requires: npm run db:seed -w backend (dev org + admin) and migrations applied.
 */
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { organisationSuppliers } from '../schema';
import type { OrganisationSupplierType } from '../../modules/organisation/constants/supplier-type.constants';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';

/** Marker emails / names — kept by default clean; removed with --purge-all */
export const DEV_SEED_SUPPLIER_EMAIL_DOMAIN = '@grubpac.local';
export const DEV_SEED_SUPPLIER_EMAIL_PREFIX = 'dev.seed.supplier.';
export const DEV_SEED_SUPPLIER_NAME_PREFIX = 'Dev Seed Supplier';

export function isDevSeedSupplierMarker(row: {
  contactEmail: string;
  name: string;
}): boolean {
  const email = row.contactEmail.trim().toLowerCase();
  const emailMatches =
    email.startsWith(DEV_SEED_SUPPLIER_EMAIL_PREFIX.toLowerCase()) &&
    email.endsWith(DEV_SEED_SUPPLIER_EMAIL_DOMAIN.toLowerCase());
  if (emailMatches) {
    return true;
  }
  return row.name.startsWith(DEV_SEED_SUPPLIER_NAME_PREFIX);
}

type SupplierSeedRow = {
  seedKey: string;
  name: string;
  supplierType: OrganisationSupplierType;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  agreementReference: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
  addressCountry: string;
  isActive: boolean;
};

const SUPPLIER_SEEDS: SupplierSeedRow[] = [
  {
    seedKey: 'bike',
    name: 'Dev Seed Supplier — Hero MotoCorp Fleet Partner',
    supplierType: 'bike',
    contactPerson: 'Rajesh Kumar',
    contactPhone: '+919876543201',
    contactEmail: `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}bike${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`,
    agreementReference: 'AGR-BIKE-2024-001',
    addressLine1: 'Plot 45, Industrial Area Phase 2',
    addressLine2: 'Near Manesar Toll Plaza',
    addressCity: 'Gurugram',
    addressState: 'Haryana',
    addressDistrict: 'Gurugram',
    addressPincode: '122015',
    addressCountry: 'IN',
    isActive: true,
  },
  {
    seedKey: 'driver',
    name: 'Dev Seed Supplier — BlueLine Driver Staffing',
    supplierType: 'driver',
    contactPerson: 'Priya Sharma',
    contactPhone: '+919876543202',
    contactEmail: `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}driver${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`,
    agreementReference: 'AGR-DRV-2024-014',
    addressLine1: 'B-Wing, Andheri Kurla Road',
    addressLine2: 'MIDC Andheri East',
    addressCity: 'Mumbai',
    addressState: 'Maharashtra',
    addressDistrict: 'Mumbai Suburban',
    addressPincode: '400093',
    addressCountry: 'IN',
    isActive: true,
  },
  {
    seedKey: 'spare_parts',
    name: 'Dev Seed Supplier — FleetParts India Warehouse',
    supplierType: 'spare_parts',
    contactPerson: 'Anil Mehta',
    contactPhone: '+919876543203',
    contactEmail: `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}spare-parts${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`,
    agreementReference: 'AGR-SPR-2024-088',
    addressLine1: 'Peenya Industrial Area, 4th Main',
    addressLine2: 'Sector 7',
    addressCity: 'Bengaluru',
    addressState: 'Karnataka',
    addressDistrict: 'Bengaluru Urban',
    addressPincode: '560058',
    addressCountry: 'IN',
    isActive: true,
  },
  {
    seedKey: 'compliance',
    name: 'Dev Seed Supplier — SecureFleet RTO & Insurance',
    supplierType: 'compliance',
    contactPerson: 'Meera Iyer',
    contactPhone: '+919876543204',
    contactEmail: `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}compliance${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`,
    agreementReference: 'AGR-CMP-2024-031',
    addressLine1: '12, Anna Salai',
    addressLine2: 'Teynampet',
    addressCity: 'Chennai',
    addressState: 'Tamil Nadu',
    addressDistrict: 'Chennai',
    addressPincode: '600018',
    addressCountry: 'IN',
    isActive: true,
  },
  {
    seedKey: 'spare_parts_us',
    name: 'Dev Seed Supplier — NorthStar Fleet Parts (US)',
    supplierType: 'spare_parts',
    contactPerson: 'James Carter',
    contactPhone: '+14155552671',
    contactEmail: `${DEV_SEED_SUPPLIER_EMAIL_PREFIX}spare-parts-us${DEV_SEED_SUPPLIER_EMAIL_DOMAIN}`,
    agreementReference: 'AGR-US-SPR-2024-002',
    addressLine1: '850 Battery Street',
    addressLine2: 'Suite 200',
    addressCity: 'San Francisco',
    addressState: 'California',
    addressDistrict: 'San Francisco',
    addressPincode: '94111',
    addressCountry: 'US',
    isActive: false,
  },
];

/** Expected row count after reset:dev:organisation-suppliers (includes one inactive US spare-parts row). */
export const DEV_SEED_SUPPLIER_EXPECTED_COUNT = SUPPLIER_SEEDS.length;

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);

  let inserted = 0;
  let skipped = 0;

  for (const seed of SUPPLIER_SEEDS) {
    const existing = await db
      .select({ id: organisationSuppliers.id })
      .from(organisationSuppliers)
      .where(
        and(
          eq(organisationSuppliers.organizationId, devOrgId),
          eq(organisationSuppliers.contactEmail, seed.contactEmail),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    await db.insert(organisationSuppliers).values({
      organizationId: devOrgId,
      name: seed.name,
      supplierType: seed.supplierType,
      contactPerson: seed.contactPerson,
      contactPhone: seed.contactPhone,
      contactEmail: seed.contactEmail,
      agreementReference: seed.agreementReference,
      addressLine1: seed.addressLine1,
      addressLine2: seed.addressLine2 ?? null,
      addressCity: seed.addressCity ?? null,
      addressState: seed.addressState,
      addressDistrict: seed.addressDistrict,
      addressPincode: seed.addressPincode,
      addressCountry: seed.addressCountry,
      isActive: seed.isActive,
    });
    inserted += 1;
  }

  console.log(
    `Dev organisation suppliers seed complete (org=${devOrgId}, db=${maskDatabaseUrl(connectionString)}).`,
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
