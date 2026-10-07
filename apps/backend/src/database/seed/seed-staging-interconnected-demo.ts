/**
 * Staging RDS only — cross-linked demo data (Indian addresses, GST-style refs).
 *
 * Run after migrations + base db:seed (org + admin):
 *   $env:APP_ENV='staging'; $env:SEED_STAGING_DEMO='1'; $env:DATABASE_URL='...'; npm run db:seed -w backend
 *
 * Or standalone:
 *   ts-node -r tsconfig-paths/register src/database/seed/seed-staging-interconnected-demo.ts
 */
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { SYSTEM_LOCATION_TYPE_PRESETS } from '../../modules/organisation/constants/system-location-type-presets';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  assetRegisterAssetClasses,
  assetRegisterAssetMasters,
  assetRegisterVehicleAssignments,
  assetRegisterVehicles,
} from '../schema/asset-register.schema';
import {
  financeInvoiceLines,
  financeInvoicePayments,
  financeInvoices,
  inventoryCatalogParts,
} from '../schema/finance.schema';
import {
  fleetClientPocs,
  fleetClients,
  leaseContractAssetLines,
  leaseContracts,
} from '../schema/fleet-leasing.schema';
import {
  inventoryPartsRequests,
  inventoryStockReceipts,
} from '../schema/inventory.schema';
import {
  organisationClientPocs,
  organisationClients,
  organisationDrivers,
  organisationEmployees,
  organisationLocations,
  organisationLocationTypes,
  organisationSuppliers,
} from '../schema/organisation.schema';
import { organizations } from '../schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';
import {
  assertStagingDemoSeedAllowed,
  maskDatabaseUrl,
  resolveStagingDatabaseUrl,
  STAGING_DEMO_EMAIL_DOMAIN,
  STAGING_DEMO_SEED_SOURCE,
} from './staging-demo-guards';

type AppDb = NodePgDatabase<typeof schema>;

export type StagingDemoSeedSummary = {
  seedSource: string;
  organizationId: string;
  inserted: Record<string, number>;
  skipped: Record<string, number>;
};

function demoEmail(localPart: string): string {
  return `${localPart}${STAGING_DEMO_EMAIL_DOMAIN}`;
}

function demoIndex(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/** Inclusive 0..count-1 for programmatic seed rows. */
function seq(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

const LEASE_DEMO_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'awaiting_assets',
  'deactivated',
  'billing_paused',
  'pending_termination',
  'closed',
  'concluded',
] as const;

type LeaseDemoStatus = (typeof LEASE_DEMO_STATUSES)[number];

const VEHICLE_OPERATIONAL_STATUSES = [
  'available',
  'leased',
  'workshop',
  'sold',
  'retired',
] as const;

const PARTS_REQUEST_STATUSES = [
  'blocked',
  'fulfilled',
  'reserved',
  'cancelled',
  'lapsed',
] as const;

const FINANCE_INVOICE_STATUSES = [
  'unpaid',
  'partially_paid',
  'paid',
  'cancelled',
] as const;

const LOCATION_TYPE_PRESET_KEYS = [
  'office',
  'warehouse',
  'workshop',
  'retail_outlet',
  'other',
] as const;

const INDIAN_DEMO_SITES = [
  {
    key: 'blr-hq',
    name: 'GrubFleet Bengaluru HQ',
    preset: 'office' as const,
    city: 'Bengaluru',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    pincode: '560103',
    line1: 'Embassy Tech Village, Outer Ring Road',
  },
  {
    key: 'mum-hub',
    name: 'Mumbai Western Logistics Hub',
    preset: 'warehouse' as const,
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    district: 'Raigad',
    pincode: '410208',
    line1: 'Taloja MIDC, Plot 14',
  },
  {
    key: 'del-sales',
    name: 'Delhi NCR Sales Office',
    preset: 'office' as const,
    city: 'Gurugram',
    state: 'Haryana',
    district: 'Gurugram',
    pincode: '122002',
    line1: 'DLF Cyber City, Phase 2, Tower 5',
  },
  {
    key: 'hyd-workshop',
    name: 'Hyderabad Fleet Workshop',
    preset: 'workshop' as const,
    city: 'Hyderabad',
    state: 'Telangana',
    district: 'Medchal-Malkajgiri',
    pincode: '500039',
    line1: 'IDA Uppal, Shed 7',
  },
  {
    key: 'chn-retail',
    name: 'Chennai Anna Nagar Retail Hub',
    preset: 'retail_outlet' as const,
    city: 'Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    pincode: '600040',
    line1: 'Anna Nagar 2nd Avenue',
  },
  {
    key: 'pun-depot',
    name: 'Pune Hinjawadi Spare Depot',
    preset: 'warehouse' as const,
    city: 'Pune',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411057',
    line1: 'Hinjawadi Phase 2, Plot 18',
  },
  {
    key: 'ahm-yard',
    name: 'Ahmedabad Sanand Yard',
    preset: 'other' as const,
    city: 'Ahmedabad',
    state: 'Gujarat',
    district: 'Ahmedabad',
    pincode: '382110',
    line1: 'Sanand GIDC, Block C',
  },
  {
    key: 'kochi-office',
    name: 'Kochi Infopark Liaison Office',
    preset: 'office' as const,
    city: 'Kochi',
    state: 'Kerala',
    district: 'Ernakulam',
    pincode: '682030',
    line1: 'Kakkanad Infopark Road',
  },
  {
    key: 'jaipur-retail',
    name: 'Jaipur Sitapura Retail Counter',
    preset: 'retail_outlet' as const,
    city: 'Jaipur',
    state: 'Rajasthan',
    district: 'Jaipur',
    pincode: '302022',
    line1: 'Sitapura Industrial Area',
  },
  {
    key: 'lko-warehouse',
    name: 'Lucknow Transport Nagar Warehouse',
    preset: 'warehouse' as const,
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    pincode: '226012',
    line1: 'Transport Nagar, Sector B',
  },
  {
    key: 'bbsr-workshop',
    name: 'Bhubaneswar Patia Workshop',
    preset: 'workshop' as const,
    city: 'Bhubaneswar',
    state: 'Odisha',
    district: 'Khordha',
    pincode: '751024',
    line1: 'Patia Industrial Estate',
  },
  {
    key: 'indore-other',
    name: 'Indore Pithampur Holding Yard',
    preset: 'other' as const,
    city: 'Indore',
    state: 'Madhya Pradesh',
    district: 'Dhar',
    pincode: '454775',
    line1: 'Pithampur Sector 3',
  },
] as const;

const ORG_SUPPLIER_TYPES = [
  'bike',
  'driver',
  'spare_parts',
  'compliance',
] as const;

async function resolveOrganizationId(db: AppDb): Promise<string> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) {
    throw new Error(
      `Organization slug "${DEV_ORG_SLUG}" not found. Run base db:seed on staging first.`,
    );
  }
  return org.id;
}

async function ensureSystemLocationTypes(
  db: AppDb,
  organizationId: string,
): Promise<Map<string, string>> {
  for (const preset of SYSTEM_LOCATION_TYPE_PRESETS) {
    await db
      .insert(organisationLocationTypes)
      .values({
        organizationId,
        name: preset.name,
        presetKey: preset.presetKey,
        isSystem: true,
      })
      .onConflictDoNothing({
        target: [
          organisationLocationTypes.organizationId,
          organisationLocationTypes.presetKey,
        ],
      });
  }
  const rows = await db
    .select({
      id: organisationLocationTypes.id,
      presetKey: organisationLocationTypes.presetKey,
    })
    .from(organisationLocationTypes)
    .where(eq(organisationLocationTypes.organizationId, organizationId));
  const byPreset = new Map<string, string>();
  for (const row of rows) {
    if (row.presetKey) byPreset.set(row.presetKey, row.id);
  }
  return byPreset;
}

export async function seedStagingInterconnectedDemo(
  db: AppDb,
): Promise<StagingDemoSeedSummary> {
  const organizationId = await resolveOrganizationId(db);
  const inserted: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const bump = (key: string, didInsert: boolean) => {
    if (didInsert) inserted[key] = (inserted[key] ?? 0) + 1;
    else skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const typeIds = await ensureSystemLocationTypes(db, organizationId);
  for (const presetKey of LOCATION_TYPE_PRESET_KEYS) {
    if (!typeIds.get(presetKey)) {
      throw new Error(
        `Missing system location type preset "${presetKey}" for staging demo org.`,
      );
    }
  }

  const locationIds = new Map<string, string>();
  for (const [index, site] of INDIAN_DEMO_SITES.entries()) {
    const locationTypeId = typeIds.get(site.preset);
    if (!locationTypeId) continue;
    const seed = {
      key: site.key,
      name: site.name,
      locationTypeId,
      addressLine1: site.line1,
      addressCity: site.city,
      addressState: site.state,
      addressDistrict: site.district,
      addressPincode: site.pincode,
      siteContactEmail: demoEmail(`staging.demo.location.${site.key}`),
      siteContactPhone: `+9198${demoIndex(index + 1, 2)}01234${demoIndex(index + 1, 2)}`,
    };
    const [existing] = await db
      .select({ id: organisationLocations.id })
      .from(organisationLocations)
      .where(
        and(
          eq(organisationLocations.organizationId, organizationId),
          eq(organisationLocations.siteContactEmail, seed.siteContactEmail),
        ),
      )
      .limit(1);
    if (existing) {
      locationIds.set(seed.key, existing.id);
      bump('locations', false);
      continue;
    }
    const [row] = await db
      .insert(organisationLocations)
      .values({
        organizationId,
        name: seed.name,
        locationTypeId: seed.locationTypeId,
        addressLine1: seed.addressLine1,
        addressCity: seed.addressCity,
        addressState: seed.addressState,
        addressDistrict: seed.addressDistrict,
        addressPincode: seed.addressPincode,
        addressCountry: 'IN',
        siteContactPhone: seed.siteContactPhone,
        siteContactEmail: seed.siteContactEmail,
        isActive: true,
      })
      .returning({ id: organisationLocations.id });
    locationIds.set(seed.key, row.id);
    bump('locations', true);
  }

  const supplierCityPool = [
    { city: 'Pune', state: 'Maharashtra', district: 'Pune', pin: '411026' },
    {
      city: 'Chennai',
      state: 'Tamil Nadu',
      district: 'Chennai',
      pin: '600058',
    },
    {
      city: 'New Delhi',
      state: 'Delhi',
      district: 'South East Delhi',
      pin: '110020',
    },
    {
      city: 'Bengaluru',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      pin: '560058',
    },
  ] as const;

  const supplierSeeds = ORG_SUPPLIER_TYPES.flatMap((supplierType, typeIdx) =>
    seq(3).map((i) => {
      const n = typeIdx * 3 + i + 1;
      const geo = supplierCityPool[i] ?? supplierCityPool[0];
      const typeLabel =
        supplierType === 'spare_parts' ? 'Spare Parts' : supplierType;
      return {
        key: `${supplierType}-${i + 1}`,
        name: `Staging Demo ${typeLabel} Supplier ${n}`,
        supplierType,
        contactPerson: `Demo Contact ${n}`,
        contactPhone: `+9199${demoIndex(n, 4)}`,
        contactEmail: demoEmail(
          `staging.demo.supplier.${supplierType}.${i + 1}`,
        ),
        agreementReference: `GSTIN: 27AABCD${demoIndex(n, 4)}E${i + 1}Z5`,
        addressLine1: `Industrial Estate Unit ${n}`,
        addressCity: geo.city,
        addressState: geo.state,
        addressDistrict: geo.district,
        addressPincode: geo.pin,
        isActive: n !== 11 && n !== 12,
      };
    }),
  );

  const supplierIds = new Map<string, string>();
  for (const seed of supplierSeeds) {
    const [existing] = await db
      .select({ id: organisationSuppliers.id })
      .from(organisationSuppliers)
      .where(
        and(
          eq(organisationSuppliers.organizationId, organizationId),
          eq(organisationSuppliers.contactEmail, seed.contactEmail),
        ),
      )
      .limit(1);
    if (existing) {
      supplierIds.set(seed.key, existing.id);
      bump('suppliers', false);
      continue;
    }
    const [row] = await db
      .insert(organisationSuppliers)
      .values({
        organizationId,
        name: seed.name,
        supplierType: seed.supplierType,
        contactPerson: seed.contactPerson,
        contactPhone: seed.contactPhone,
        contactEmail: seed.contactEmail,
        agreementReference: seed.agreementReference,
        addressLine1: seed.addressLine1,
        addressCity: seed.addressCity ?? null,
        addressState: seed.addressState,
        addressDistrict: seed.addressDistrict,
        addressPincode: seed.addressPincode,
        addressCountry: 'IN',
        isActive: seed.isActive,
      })
      .returning({ id: organisationSuppliers.id });
    supplierIds.set(seed.key, row.id);
    bump('suppliers', true);
  }

  const employeeDepartments = [
    'Operations',
    'Fleet',
    'Finance',
    'Workshop',
    'Procurement',
    'HR',
  ] as const;
  const locationKeys = INDIAN_DEMO_SITES.map((s) => s.key);
  const employeeSeeds = seq(14).map((i) => ({
    key: `emp-${i + 1}`,
    fullName: `Staging Demo Employee ${i + 1}`,
    designation: `Demo ${employeeDepartments[i % employeeDepartments.length]} Lead`,
    department: employeeDepartments[i % employeeDepartments.length],
    locationKey: locationKeys[i % locationKeys.length] ?? 'blr-hq',
    companyEmail: demoEmail(`staging.demo.employee.${i + 1}`),
    mobile: `+9197${demoIndex(i + 1, 4)}`,
    isActive: i < 12,
  }));

  const employeeIds = new Map<string, string>();
  for (const seed of employeeSeeds) {
    const [existing] = await db
      .select({ id: organisationEmployees.id })
      .from(organisationEmployees)
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          eq(organisationEmployees.companyEmail, seed.companyEmail),
        ),
      )
      .limit(1);
    if (existing) {
      employeeIds.set(seed.key, existing.id);
      bump('employees', false);
      continue;
    }
    const [row] = await db
      .insert(organisationEmployees)
      .values({
        organizationId,
        fullName: seed.fullName,
        designation: seed.designation,
        department: seed.department,
        locationId: locationIds.get(seed.locationKey) ?? null,
        companyEmail: seed.companyEmail,
        mobile: seed.mobile,
        dateOfJoining: '2024-04-01',
        isActive: seed.isActive,
      })
      .returning({ id: organisationEmployees.id });
    employeeIds.set(seed.key, row.id);
    bump('employees', true);
  }

  const blrLocationId = locationIds.get('blr-hq');
  const opsLeadId = employeeIds.get('emp-1');
  if (blrLocationId && opsLeadId) {
    await db
      .update(organisationLocations)
      .set({ responsibleEmployeeId: opsLeadId })
      .where(eq(organisationLocations.id, blrLocationId));
  }

  const clientGeoPool = [
    { city: 'Pune', state: 'Maharashtra', district: 'Pune', pin: '411057' },
    {
      city: 'Kolkata',
      state: 'West Bengal',
      district: 'Kolkata',
      pin: '700091',
    },
    { city: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', pin: '302022' },
    { city: 'Kochi', state: 'Kerala', district: 'Ernakulam', pin: '682030' },
    {
      city: 'Bengaluru',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      pin: '560001',
    },
    {
      city: 'Ahmedabad',
      state: 'Gujarat',
      district: 'Ahmedabad',
      pin: '380015',
    },
  ] as const;

  const clientSeeds = seq(14).map((i) => {
    const geo = clientGeoPool[i % clientGeoPool.length] ?? clientGeoPool[0];
    return {
      key: `client-${i + 1}`,
      name: `Staging Demo Client ${i + 1} Pvt Ltd`,
      addressLine1: `Plot ${i + 1}, Demo Industrial Area`,
      addressCity: geo.city,
      addressState: geo.state,
      addressDistrict: geo.district,
      addressPincode: geo.pin,
      pocName: `Client POC ${i + 1}`,
      pocPhone: `+9196${demoIndex(i + 1, 4)}`,
      pocEmail: demoEmail(`staging.demo.client.${i + 1}`),
      isActive: i < 12,
    };
  });

  const orgClientIds = new Map<string, string>();
  for (const seed of clientSeeds) {
    const [existingPoc] = await db
      .select({ clientId: organisationClientPocs.clientId })
      .from(organisationClientPocs)
      .innerJoin(
        organisationClients,
        eq(organisationClientPocs.clientId, organisationClients.id),
      )
      .where(
        and(
          eq(organisationClients.organizationId, organizationId),
          eq(organisationClientPocs.email, seed.pocEmail),
        ),
      )
      .limit(1);
    if (existingPoc) {
      orgClientIds.set(seed.key, existingPoc.clientId);
      bump('clients', false);
      continue;
    }
    const [client] = await db
      .insert(organisationClients)
      .values({
        organizationId,
        name: seed.name,
        addressLine1: seed.addressLine1,
        addressCity: seed.addressCity,
        addressState: seed.addressState,
        addressDistrict: seed.addressDistrict,
        addressPincode: seed.addressPincode,
        addressCountry: 'IN',
        isActive: seed.isActive,
      })
      .returning({ id: organisationClients.id });
    await db.insert(organisationClientPocs).values({
      clientId: client.id,
      name: seed.pocName,
      contactNumber: seed.pocPhone,
      email: seed.pocEmail,
      isPrimary: true,
      sortOrder: 0,
    });
    orgClientIds.set(seed.key, client.id);
    bump('clients', true);
  }

  const driverSupplierKeys = ['driver-1', 'driver-2', 'driver-3'] as const;
  const driverSeeds = seq(15).map((i) => {
    const supplierKey =
      driverSupplierKeys[i % driverSupplierKeys.length] ?? 'driver-1';
    const licenseExpired = i >= 10;
    const isActive = i >= 5 && i < 10 ? false : true;
    const licenseExpiry = licenseExpired ? '2024-06-30' : '2027-12-31';
    return {
      key: `driver-${i + 1}`,
      name: `Staging Demo Driver ${i + 1}`,
      cprNo: `STDEMO-CPR-${demoIndex(i + 1, 3)}`,
      phone: `+9195${demoIndex(i + 1, 4)}`,
      email: demoEmail(`staging.demo.driver.${i + 1}`),
      licenseNumber: `DL-STDEMO-${demoIndex(i + 1, 4)}`,
      licenseExpiry,
      supplierKey,
      addressLine1: `Driver Colony Block ${i + 1}`,
      addressCity: 'Bengaluru',
      addressState: 'Karnataka',
      addressDistrict: 'Bengaluru Urban',
      addressPincode: '560001',
      isActive,
      assignVehicleIndex: i < 5 ? i : null,
    };
  });

  for (const seed of driverSeeds) {
    const supplierId = supplierIds.get(seed.supplierKey);
    if (!supplierId) continue;
    const [existing] = await db
      .select({ id: organisationDrivers.id })
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.cprNo, seed.cprNo),
        ),
      )
      .limit(1);
    if (existing) {
      bump('drivers', false);
      continue;
    }
    await db.insert(organisationDrivers).values({
      organizationId,
      name: seed.name,
      cprNo: seed.cprNo,
      phone: seed.phone,
      email: seed.email,
      licenseNumber: seed.licenseNumber,
      licenseExpiry: seed.licenseExpiry,
      supplierId,
      addressLine1: seed.addressLine1,
      addressCity: seed.addressCity,
      addressState: seed.addressState,
      addressDistrict: seed.addressDistrict,
      addressPincode: seed.addressPincode,
      addressCountry: 'IN',
      isActive: seed.isActive,
    });
    bump('drivers', true);
  }

  const assetClassSeeds = [
    {
      key: 'scooter-2w-a',
      code: 'SD2A',
      name: 'Petrol Scooter — Standard',
      vehicleType: '2W' as const,
      fuelType: 'Petrol',
      fuelTankCapacity: '5.5',
      ratedLoadFrom: '80',
      ratedLoadTo: '150',
      isActive: true,
    },
    {
      key: 'scooter-2w-b',
      code: 'SD2B',
      name: 'Electric Scooter — City',
      vehicleType: '2W' as const,
      fuelType: 'Electric',
      fuelTankCapacity: '0',
      ratedLoadFrom: '70',
      ratedLoadTo: '120',
      isActive: false,
    },
    {
      key: 'auto-3w-a',
      code: 'SD3A',
      name: 'CNG Passenger Auto',
      vehicleType: '3W' as const,
      fuelType: 'CNG',
      fuelTankCapacity: '4',
      ratedLoadFrom: '200',
      ratedLoadTo: '400',
      isActive: true,
    },
    {
      key: 'cargo-3w',
      code: 'SDC3',
      name: 'Electric Cargo Loader',
      vehicleType: '3W' as const,
      fuelType: 'Electric',
      fuelTankCapacity: '0',
      ratedLoadFrom: '300',
      ratedLoadTo: '500',
      isActive: true,
    },
    {
      key: 'auto-3w-b',
      code: 'SD3B',
      name: 'Diesel Cargo Auto',
      vehicleType: '3W' as const,
      fuelType: 'Diesel',
      fuelTankCapacity: '12',
      ratedLoadFrom: '250',
      ratedLoadTo: '450',
      isActive: true,
    },
    {
      key: 'lcv-4w-a',
      code: 'SD4A',
      name: 'Diesel Light Commercial Van',
      vehicleType: '4W' as const,
      fuelType: 'Diesel',
      fuelTankCapacity: '45',
      ratedLoadFrom: '750',
      ratedLoadTo: '1200',
      isActive: true,
    },
    {
      key: 'lcv-4w-b',
      code: 'SD4B',
      name: 'CNG Mini Truck',
      vehicleType: '4W' as const,
      fuelType: 'CNG',
      fuelTankCapacity: '20',
      ratedLoadFrom: '600',
      ratedLoadTo: '1000',
      isActive: true,
    },
  ] as const;

  const assetClassIds = new Map<string, { id: string; name: string }>();
  for (const seed of assetClassSeeds) {
    const [existing] = await db
      .select({
        id: assetRegisterAssetClasses.id,
        name: assetRegisterAssetClasses.name,
      })
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.code, seed.code),
        ),
      )
      .limit(1);
    if (existing) {
      assetClassIds.set(seed.key, { id: existing.id, name: existing.name });
      bump('assetClasses', false);
      continue;
    }
    const [row] = await db
      .insert(assetRegisterAssetClasses)
      .values({
        organizationId,
        name: seed.name,
        description: STAGING_DEMO_SEED_SOURCE,
        code: seed.code,
        vehicleType: seed.vehicleType,
        fuelType: seed.fuelType,
        fuelTankCapacity: seed.fuelTankCapacity,
        ratedLoadFrom: seed.ratedLoadFrom,
        ratedLoadTo: seed.ratedLoadTo,
        mileageFrom: '35',
        mileageTo: '45',
        mileageUnit: 'km/L',
        defaultIntakeChecklist: 'Standard Intake Checklist',
        isActive: seed.isActive,
      })
      .returning({
        id: assetRegisterAssetClasses.id,
        name: assetRegisterAssetClasses.name,
      });
    assetClassIds.set(seed.key, { id: row.id, name: row.name });
    bump('assetClasses', true);
  }

  const masterNameByClass: Record<string, string[]> = {
    'scooter-2w-a': ['Honda Activa 6G', 'TVS Jupiter 125'],
    'scooter-2w-b': ['Ather 450X'],
    'auto-3w-a': ['Bajaj RE CNG', 'Piaggio Ape CNG'],
    'cargo-3w': ['Euler HiLoad EV', 'Mahindra Treo Zor'],
    'auto-3w-b': ['Bajaj Maxima Cargo'],
    'lcv-4w-a': ['Tata Ace Gold', 'Ashok Leyland Dost'],
    'lcv-4w-b': ['Mahindra Supro CNG'],
  };

  const masterIds = new Map<string, string>();
  for (const [classKey, names] of Object.entries(masterNameByClass)) {
    const classRef = assetClassIds.get(classKey);
    if (!classRef) continue;
    for (const [masterIdx, name] of names.entries()) {
      const masterKey = `${classKey}-m${masterIdx + 1}`;
      const [existing] = await db
        .select({ id: assetRegisterAssetMasters.id })
        .from(assetRegisterAssetMasters)
        .where(
          and(
            eq(assetRegisterAssetMasters.organizationId, organizationId),
            eq(assetRegisterAssetMasters.assetClassId, classRef.id),
            eq(assetRegisterAssetMasters.name, name),
          ),
        )
        .limit(1);
      if (existing) {
        masterIds.set(masterKey, existing.id);
        bump('assetMasters', false);
        continue;
      }
      const [row] = await db
        .insert(assetRegisterAssetMasters)
        .values({
          organizationId,
          assetClassId: classRef.id,
          name,
          isActive: masterIdx === 0,
        })
        .returning({ id: assetRegisterAssetMasters.id });
      masterIds.set(masterKey, row.id);
      bump('assetMasters', true);
    }
  }

  const vehicleClassKeys = [
    'scooter-2w-a',
    'auto-3w-a',
    'lcv-4w-a',
    'cargo-3w',
    'auto-3w-b',
    'lcv-4w-b',
    'scooter-2w-a',
    'auto-3w-a',
    'lcv-4w-a',
    'cargo-3w',
    'scooter-2w-a',
    'auto-3w-a',
    'lcv-4w-a',
    'cargo-3w',
    'lcv-4w-b',
  ] as const;

  const vehicleSeeds = seq(15).map((i) => {
    const classKey = vehicleClassKeys[i] ?? 'scooter-2w-a';
    const n = i + 1;
    return {
      key: `v${n}`,
      classKey,
      masterKey: `${classKey}-m1`,
      fleetCode: `STDEMO-${1000 + n}`,
      registrationNumber: `KA${demoIndex(n, 2)}ST${1000 + n}`,
      chassisNumber: `STGDM${1000 + n}CHASSIS0001`,
      operationalStatus:
        VEHICLE_OPERATIONAL_STATUSES[i % VEHICLE_OPERATIONAL_STATUSES.length],
      isActive: i !== 14,
    };
  });

  const vehicleIds = new Map<string, string>();
  const dateSpan = {
    registrationStartDate: '2025-01-01',
    registrationEndDate: '2030-01-01',
    insuranceStartDate: '2025-01-01',
    insuranceEndDate: '2026-01-01',
    warrantyStartDate: '2025-01-01',
    warrantyEndDate: '2027-01-01',
  };

  for (const seed of vehicleSeeds) {
    const classRef = assetClassIds.get(seed.classKey);
    const masterId = masterIds.get(seed.masterKey);
    if (!classRef || !masterId) continue;

    const [existing] = await db
      .select({ id: assetRegisterVehicles.id })
      .from(assetRegisterVehicles)
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.fleetCode, seed.fleetCode),
        ),
      )
      .limit(1);
    if (existing) {
      vehicleIds.set(seed.key, existing.id);
      bump('vehicles', false);
      continue;
    }
    const [row] = await db
      .insert(assetRegisterVehicles)
      .values({
        organizationId,
        assetClassId: classRef.id,
        assetMasterId: masterId,
        fleetCode: seed.fleetCode,
        registrationNumber: seed.registrationNumber,
        chassisNumber: seed.chassisNumber,
        modelYear: 2024,
        odometer: 12500,
        ...dateSpan,
        insurancePremium: '8500.00',
        specialNotes: STAGING_DEMO_SEED_SOURCE,
        operationalStatus: seed.operationalStatus,
        isActive: seed.isActive,
      })
      .returning({ id: assetRegisterVehicles.id });
    vehicleIds.set(seed.key, row.id);
    bump('vehicles', true);
  }

  const fleetClientIds = new Map<string, string>();
  const clientKeys = clientSeeds.map((c) => c.key);

  for (const [index, clientKey] of clientKeys.entries()) {
    const orgClientId = orgClientIds.get(clientKey);
    if (!orgClientId) continue;
    const clientCode = `STDEMO-C${index + 1}`;
    const [existing] = await db
      .select({ id: fleetClients.id })
      .from(fleetClients)
      .where(
        and(
          eq(fleetClients.organizationId, organizationId),
          eq(fleetClients.clientCode, clientCode),
        ),
      )
      .limit(1);
    if (existing) {
      fleetClientIds.set(clientKey, existing.id);
      bump('fleetClients', false);
      continue;
    }
    const orgClient = clientSeeds.find((c) => c.key === clientKey);
    const [row] = await db
      .insert(fleetClients)
      .values({
        organizationId,
        clientCode,
        companyName: orgClient?.name ?? clientKey,
        taxId: `27AABCD${1000 + index}E${index + 1}Z5`,
        address: orgClient?.addressLine1 ?? 'India',
        organisationClientId: orgClientId,
        isActive: true,
      })
      .returning({ id: fleetClients.id });
    if (orgClient) {
      await db.insert(fleetClientPocs).values({
        clientId: row.id,
        name: orgClient.pocName,
        contactNumber: orgClient.pocPhone,
        email: orgClient.pocEmail,
        isPrimary: true,
        sortOrder: 0,
      });
    }
    fleetClientIds.set(clientKey, row.id);
    bump('fleetClients', true);
  }

  const leaseStatusSeeds: Array<{
    contractNumber: string;
    status: LeaseDemoStatus;
    clientKey: string;
    classKey: string;
    vehicleKey: string | null;
    billingFrequency: 'monthly' | 'quarterly' | 'annual';
    assignVehicle: boolean;
  }> = LEASE_DEMO_STATUSES.map((status, index) => ({
    contractNumber: `STDEMO-LC-${demoIndex(index + 1, 3)}`,
    status,
    clientKey: clientKeys[index % clientKeys.length] ?? 'client-1',
    classKey:
      vehicleClassKeys[index % vehicleClassKeys.length] ?? 'scooter-2w-a',
    vehicleKey: index < 5 ? (`v${index + 1}` as const) : null,
    billingFrequency: 'monthly',
    assignVehicle:
      status === 'active' ||
      status === 'approved' ||
      status === 'awaiting_assets',
  }));

  leaseStatusSeeds.push({
    contractNumber: 'STDEMO-LC-011',
    status: 'active',
    clientKey: clientKeys[11] ?? 'client-12',
    classKey: 'lcv-4w-a',
    vehicleKey: 'v6',
    billingFrequency: 'quarterly',
    assignVehicle: true,
  });
  leaseStatusSeeds.push({
    contractNumber: 'STDEMO-LC-012',
    status: 'active',
    clientKey: clientKeys[10] ?? 'client-11',
    classKey: 'cargo-3w',
    vehicleKey: 'v7',
    billingFrequency: 'annual',
    assignVehicle: true,
  });

  const leaseContractIds = new Map<string, string>();
  for (const seed of leaseStatusSeeds) {
    const fleetClientId = fleetClientIds.get(seed.clientKey);
    const classRef = assetClassIds.get(seed.classKey);

    const [existing] = await db
      .select({ id: leaseContracts.id })
      .from(leaseContracts)
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          eq(leaseContracts.contractNumber, seed.contractNumber),
        ),
      )
      .limit(1);

    let contractId: string;
    if (existing) {
      contractId = existing.id;
      bump('leaseContracts', false);
    } else {
      const liveStatuses: LeaseDemoStatus[] = [
        'active',
        'approved',
        'awaiting_assets',
        'billing_paused',
        'pending_termination',
        'deactivated',
        'closed',
        'concluded',
      ];
      const hasTerm = liveStatuses.includes(seed.status);
      const [row] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: seed.contractNumber,
          clientId: fleetClientId ?? null,
          status: seed.status,
          startDate: hasTerm ? new Date('2025-04-01T00:00:00.000Z') : undefined,
          endDate: hasTerm ? new Date('2028-03-31T00:00:00.000Z') : undefined,
          termMonths: hasTerm ? 36 : undefined,
          securityDeposit: hasTerm ? '50000.00' : undefined,
          billingFrequency: seed.billingFrequency,
          billingPaused: seed.status === 'billing_paused',
          description: STAGING_DEMO_SEED_SOURCE,
        })
        .returning({ id: leaseContracts.id });
      contractId = row.id;
      bump('leaseContracts', true);

      if (classRef) {
        await db
          .insert(leaseContractAssetLines)
          .values({
            contractId,
            assetClass: classRef.name,
            committedQuantity: seed.status === 'awaiting_assets' ? 3 : 1,
            ratePerVehicleMonth: '12500.00',
            availabilityCovered: seed.status !== 'awaiting_assets',
            availabilityStatus:
              seed.status === 'awaiting_assets' ? 'shortfall' : 'covered',
            availableNowCount: seed.status === 'awaiting_assets' ? 0 : 1,
            sortOrder: 0,
          })
          .onConflictDoNothing({
            target: [
              leaseContractAssetLines.contractId,
              leaseContractAssetLines.assetClass,
            ],
          });
      }
    }
    leaseContractIds.set(seed.contractNumber, contractId);

    if (!seed.assignVehicle || !seed.vehicleKey || !fleetClientId) continue;
    const vehicleId = vehicleIds.get(seed.vehicleKey);
    if (!vehicleId) continue;

    const [existingAssignment] = await db
      .select({ id: assetRegisterVehicleAssignments.id })
      .from(assetRegisterVehicleAssignments)
      .where(
        and(
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          eq(assetRegisterVehicleAssignments.vehicleId, vehicleId),
          eq(assetRegisterVehicleAssignments.leaseContractId, contractId),
        ),
      )
      .limit(1);
    if (!existingAssignment) {
      await db.insert(assetRegisterVehicleAssignments).values({
        organizationId,
        vehicleId,
        leaseContractId: contractId,
        fleetClientId,
        organisationClientId: orgClientIds.get(seed.clientKey) ?? null,
      });
      await db
        .update(assetRegisterVehicles)
        .set({ operationalStatus: 'leased' })
        .where(eq(assetRegisterVehicles.id, vehicleId));
      bump('leaseAssignments', true);
    } else {
      bump('leaseAssignments', false);
    }
  }

  for (const seed of driverSeeds) {
    if (seed.assignVehicleIndex === null) continue;
    const vehicle = vehicleSeeds[seed.assignVehicleIndex];
    if (!vehicle) continue;
    const classRef = assetClassIds.get(vehicle.classKey);
    const activeLeaseNumber = 'STDEMO-LC-004';
    await db
      .update(organisationDrivers)
      .set({
        assignedVehicleCode: vehicle.fleetCode,
        assignedVehicleAssetClass: classRef?.name ?? null,
        assignedActiveLeaseId: activeLeaseNumber,
        vehicleTiedToContract: true,
      })
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.cprNo, seed.cprNo),
        ),
      );
  }

  const partSeeds = seq(12).map((i) => ({
    key: `part-${i + 1}`,
    name: `Staging Demo Spare Part ${i + 1}`,
    partCode: `STDEMO-P${demoIndex(i + 1, 3)}`,
    isActive: i < 10,
  }));

  const partIds = new Map<string, string>();
  for (const seed of partSeeds) {
    const [existing] = await db
      .select({ id: inventoryCatalogParts.id })
      .from(inventoryCatalogParts)
      .where(
        and(
          eq(inventoryCatalogParts.organizationId, organizationId),
          eq(inventoryCatalogParts.partCode, seed.partCode),
        ),
      )
      .limit(1);
    if (existing) {
      partIds.set(seed.key, existing.id);
      bump('parts', false);
      continue;
    }
    const [row] = await db
      .insert(inventoryCatalogParts)
      .values({
        organizationId,
        name: seed.name,
        partCode: seed.partCode,
        unitOfMeasure: 'Each',
        reorderThreshold: 10,
        retailMarkupPercent: 22,
        wholesaleMarkupPercent: 12,
        compatibleAssetClasses: [
          'Petrol Scooter — Standard',
          'Diesel Light Commercial Van',
        ],
        isActive: seed.isActive,
      })
      .returning({ id: inventoryCatalogParts.id });
    partIds.set(seed.key, row.id);
    bump('parts', true);
  }

  const spareSupplierKeys = [
    'spare_parts-1',
    'spare_parts-2',
    'bike-1',
  ] as const;

  for (const index of seq(12)) {
    const partKey = `part-${(index % 12) + 1}`;
    const partId = partIds.get(partKey);
    const locationKey =
      locationKeys[(index + 1) % locationKeys.length] ?? 'mum-hub';
    const locationId = locationIds.get(locationKey);
    const supplierKey =
      spareSupplierKeys[index % spareSupplierKeys.length] ?? 'spare_parts-1';
    const supplierId = supplierIds.get(supplierKey);
    if (!partId || !locationId) continue;
    const receiptNumber = `STDEMO-SR-${demoIndex(index + 1, 3)}`;
    const [existing] = await db
      .select({ id: inventoryStockReceipts.id })
      .from(inventoryStockReceipts)
      .where(
        and(
          eq(inventoryStockReceipts.organizationId, organizationId),
          eq(inventoryStockReceipts.receiptNumber, receiptNumber),
        ),
      )
      .limit(1);
    if (existing) {
      bump('stockReceipts', false);
      continue;
    }
    await db.insert(inventoryStockReceipts).values({
      organizationId,
      receiptNumber,
      partId,
      supplierId: supplierId ?? null,
      locationId,
      purchaseDate: '2025-06-15',
      quantityReceived: 20 + index * 5,
      unitCostMinor: 85000 + index * 15000,
      batchLotReference: `LOT-STDEMO-${index + 1}`,
      notes: STAGING_DEMO_SEED_SOURCE,
      isActive: true,
    });
    bump('stockReceipts', true);
  }

  for (const index of seq(12)) {
    const status =
      PARTS_REQUEST_STATUSES[index % PARTS_REQUEST_STATUSES.length];
    const partKey = `part-${(index % 12) + 1}`;
    const partId = partIds.get(partKey);
    const locationId = locationIds.get('blr-hq');
    if (!partId || !locationId) continue;
    const requestNumber = `STDEMO-PR-${demoIndex(index + 1, 3)}`;
    const [existing] = await db
      .select({ id: inventoryPartsRequests.id })
      .from(inventoryPartsRequests)
      .where(
        and(
          eq(inventoryPartsRequests.organizationId, organizationId),
          eq(inventoryPartsRequests.requestNumber, requestNumber),
        ),
      )
      .limit(1);
    if (existing) {
      bump('partsRequests', false);
      continue;
    }
    const vehicle = vehicleSeeds[index % vehicleSeeds.length];
    await db.insert(inventoryPartsRequests).values({
      organizationId,
      requestNumber,
      workOrderRef: `WO-STDEMO-${2025}${demoIndex(index + 1, 2)}`,
      partId,
      locationId,
      quantityRequested: 2 + (index % 4),
      requestType: index % 2 === 0 ? 'internal' : 'external',
      vehicleRef: vehicle?.fleetCode ?? 'STDEMO-1001',
      status,
      compatibilityOk: status !== 'blocked',
    });
    bump('partsRequests', true);
  }

  const purchaseInvoices = seq(12).map((index) => {
    const supplierKey =
      supplierSeeds[index % supplierSeeds.length]?.key ?? 'spare_parts-1';
    const status =
      FINANCE_INVOICE_STATUSES[index % FINANCE_INVOICE_STATUSES.length];
    const amountMinor = 4500000 + index * 250000;
    const paidRatio =
      status === 'paid' ? 1 : status === 'partially_paid' ? 0.4 : 0;
    return {
      number: `STDEMO-PI-${demoIndex(index + 1, 3)}`,
      supplierKey,
      amountMinor,
      status,
      amountPaidMinor: Math.floor(amountMinor * paidRatio),
      lineKind:
        index % 2 === 0 ? ('spare_parts' as const) : ('vehicle' as const),
    };
  });

  for (const [index, inv] of purchaseInvoices.entries()) {
    const supplierId = supplierIds.get(inv.supplierKey);
    if (!supplierId) continue;
    const [existing] = await db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceNumber, inv.number),
        ),
      )
      .limit(1);
    if (existing) {
      bump('purchaseInvoices', false);
      continue;
    }
    const [row] = await db
      .insert(financeInvoices)
      .values({
        organizationId,
        invoiceNumber: inv.number,
        invoiceType: 'purchase',
        status: inv.status,
        supplierId,
        partyName:
          supplierSeeds.find((s) => s.key === inv.supplierKey)?.name ??
          'Supplier',
        description: `Staging demo purchase — ${STAGING_DEMO_SEED_SOURCE}`,
        totalAmountMinor: inv.amountMinor,
        amountPaidMinor: inv.amountPaidMinor,
        invoiceDate: '2025-07-01',
        notes: STAGING_DEMO_SEED_SOURCE,
        purchaseLineKind: inv.lineKind,
        cancelReason:
          inv.status === 'cancelled'
            ? 'Demo cancellation for filter coverage'
            : null,
      })
      .returning({ id: financeInvoices.id });
    const partId = partIds.get(`part-${(index % 12) + 1}`);
    const vehicleId = vehicleIds.get(`v${(index % 15) + 1}`);
    if (inv.lineKind === 'spare_parts' && partId) {
      await db.insert(financeInvoiceLines).values({
        invoiceId: row.id,
        lineKind: 'spare_parts',
        inventoryPartId: partId,
        quantity: 10,
        unitCostMinor: Math.floor(inv.amountMinor / 10),
        lineAmountMinor: inv.amountMinor,
        batchLot: `LOT-STDEMO-${index + 1}`,
      });
    } else if (inv.lineKind === 'vehicle' && vehicleId) {
      await db.insert(financeInvoiceLines).values({
        invoiceId: row.id,
        lineKind: 'vehicle',
        vehicleId,
        quantity: 1,
        lineAmountMinor: inv.amountMinor,
      });
    }
    if (inv.amountPaidMinor > 0) {
      const paymentNumber = `STDEMO-VP-${demoIndex(index + 1, 3)}`;
      const [vpExisting] = await db
        .select({ id: financeInvoicePayments.id })
        .from(financeInvoicePayments)
        .where(
          and(
            eq(financeInvoicePayments.organizationId, organizationId),
            eq(financeInvoicePayments.paymentNumber, paymentNumber),
          ),
        )
        .limit(1);
      if (!vpExisting) {
        await db.insert(financeInvoicePayments).values({
          invoiceId: row.id,
          organizationId,
          amountMinor: inv.amountPaidMinor,
          paymentDate: '2025-07-10',
          paymentMethod: index % 2 === 0 ? 'NEFT' : 'UPI',
          paymentReference: `UTR-STDEMO-${demoIndex(index + 1, 3)}`,
          paymentNumber,
        });
        bump('vendorPayments', true);
      } else {
        bump('vendorPayments', false);
      }
    }
    bump('purchaseInvoices', true);
  }

  for (const index of seq(12)) {
    const clientKey = clientKeys[index];
    if (!clientKey) continue;
    const orgClientId = orgClientIds.get(clientKey);
    const contractNumber = `STDEMO-LC-${demoIndex(index + 1, 3)}`;
    const leaseId = leaseContractIds.get(contractNumber);
    if (!orgClientId) continue;
    const billingStatus =
      FINANCE_INVOICE_STATUSES[(index + 1) % FINANCE_INVOICE_STATUSES.length];
    const amountMinor = 1250000 + index * 50000;
    const paidRatio =
      billingStatus === 'paid'
        ? 1
        : billingStatus === 'partially_paid'
          ? 0.5
          : 0;
    const number = `STDEMO-BI-${demoIndex(index + 1, 3)}`;
    const [existing] = await db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceNumber, number),
        ),
      )
      .limit(1);
    if (existing) {
      bump('billingInvoices', false);
      continue;
    }
    const clientName =
      clientSeeds.find((c) => c.key === clientKey)?.name ?? 'Client';
    const [row] = await db
      .insert(financeInvoices)
      .values({
        organizationId,
        invoiceNumber: number,
        invoiceType: 'billing',
        status: billingStatus,
        clientId: orgClientId,
        leaseContractId: leaseId ?? null,
        partyName: clientName,
        description: `Lease billing Jul 2025 — ${STAGING_DEMO_SEED_SOURCE}`,
        totalAmountMinor: amountMinor,
        amountPaidMinor: Math.floor(amountMinor * paidRatio),
        invoiceDate: '2025-07-31',
        billingPeriod: '2025-07',
        notes: STAGING_DEMO_SEED_SOURCE,
        purchaseLineKind: 'billing_lease',
        cancelReason:
          billingStatus === 'cancelled'
            ? 'Demo billing void for filter coverage'
            : null,
      })
      .returning({ id: financeInvoices.id });
    await db.insert(financeInvoiceLines).values({
      invoiceId: row.id,
      lineKind: 'billing_lease',
      assetClassName: assetClassIds.get(
        vehicleSeeds[index]?.classKey ?? 'scooter-2w-a',
      )?.name,
      quantity: 1,
      lineAmountMinor: amountMinor,
    });
    bump('billingInvoices', true);
  }

  for (const index of seq(12)) {
    const vehicleKey = `v${index + 1}`;
    const vehicleId = vehicleIds.get(vehicleKey);
    if (!vehicleId) continue;
    const saleStatus =
      FINANCE_INVOICE_STATUSES[(index + 2) % FINANCE_INVOICE_STATUSES.length];
    const amountMinor = 18500000 + index * 500000;
    const paidRatio =
      saleStatus === 'paid' ? 1 : saleStatus === 'partially_paid' ? 0.35 : 0;
    const number = `STDEMO-SI-${demoIndex(index + 1, 3)}`;
    const [existing] = await db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceNumber, number),
        ),
      )
      .limit(1);
    if (existing) {
      bump('saleInvoices', false);
      continue;
    }
    const [row] = await db
      .insert(financeInvoices)
      .values({
        organizationId,
        invoiceNumber: number,
        invoiceType: 'sale',
        status: saleStatus,
        partyName: clientSeeds[index]?.name ?? 'Buyer',
        description: `Vehicle sale invoice — ${STAGING_DEMO_SEED_SOURCE}`,
        totalAmountMinor: amountMinor,
        amountPaidMinor: Math.floor(amountMinor * paidRatio),
        invoiceDate: '2025-08-01',
        notes: STAGING_DEMO_SEED_SOURCE,
        purchaseLineKind: 'sale_vehicle',
        cancelReason:
          saleStatus === 'cancelled'
            ? 'Demo sale void for filter coverage'
            : null,
      })
      .returning({ id: financeInvoices.id });
    await db.insert(financeInvoiceLines).values({
      invoiceId: row.id,
      lineKind: 'sale_vehicle',
      vehicleId,
      quantity: 1,
      lineAmountMinor: amountMinor,
    });
    bump('saleInvoices', true);
  }

  return {
    seedSource: STAGING_DEMO_SEED_SOURCE,
    organizationId,
    inserted,
    skipped,
  };
}

async function runStandalone(): Promise<void> {
  assertStagingDemoSeedAllowed();
  const connectionString = resolveStagingDatabaseUrl();
  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });
  try {
    const summary = await seedStagingInterconnectedDemo(db);
    console.log(
      `Staging interconnected demo seed complete (db=${maskDatabaseUrl(connectionString)}).`,
    );
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runStandalone().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
