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
  const officeTypeId = typeIds.get('office');
  const warehouseTypeId = typeIds.get('warehouse');
  const workshopTypeId = typeIds.get('workshop');
  if (!officeTypeId || !warehouseTypeId || !workshopTypeId) {
    throw new Error('Missing system location types for staging demo org.');
  }

  const locationSeeds = [
    {
      key: 'blr-hq',
      name: 'GrubFleet Bengaluru HQ',
      locationTypeId: officeTypeId,
      addressLine1: 'Embassy Tech Village, Outer Ring Road',
      addressCity: 'Bengaluru',
      addressState: 'Karnataka',
      addressDistrict: 'Bengaluru Urban',
      addressPincode: '560103',
      siteContactEmail: demoEmail('staging.demo.location.blr-hq'),
      siteContactPhone: '+918012345601',
    },
    {
      key: 'mum-hub',
      name: 'Mumbai Western Logistics Hub',
      locationTypeId: warehouseTypeId,
      addressLine1: 'Taloja MIDC, Plot 14',
      addressCity: 'Navi Mumbai',
      addressState: 'Maharashtra',
      addressDistrict: 'Raigad',
      addressPincode: '410208',
      siteContactEmail: demoEmail('staging.demo.location.mum-hub'),
      siteContactPhone: '+912267890123',
    },
    {
      key: 'del-sales',
      name: 'Delhi NCR Sales Office',
      locationTypeId: officeTypeId,
      addressLine1: 'DLF Cyber City, Phase 2, Tower 5',
      addressCity: 'Gurugram',
      addressState: 'Haryana',
      addressDistrict: 'Gurugram',
      addressPincode: '122002',
      siteContactEmail: demoEmail('staging.demo.location.del-sales'),
      siteContactPhone: '+911244567890',
    },
    {
      key: 'hyd-workshop',
      name: 'Hyderabad Fleet Workshop',
      locationTypeId: workshopTypeId,
      addressLine1: 'IDA Uppal, Shed 7',
      addressCity: 'Hyderabad',
      addressState: 'Telangana',
      addressDistrict: 'Medchal-Malkajgiri',
      addressPincode: '500039',
      siteContactEmail: demoEmail('staging.demo.location.hyd-workshop'),
      siteContactPhone: '+914012345678',
    },
  ] as const;

  const locationIds = new Map<string, string>();
  for (const seed of locationSeeds) {
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

  const supplierSeeds = [
    {
      key: 'bike',
      name: 'Vikram Motors & EV Supplies',
      supplierType: 'bike' as const,
      contactPerson: 'Vikram Desai',
      contactPhone: '+919876543210',
      contactEmail: demoEmail('staging.demo.supplier.bike'),
      agreementReference: 'GSTIN: 27AABCV1234A1Z5',
      addressLine1: 'MIDC Bhosari, Pune',
      addressCity: 'Pune',
      addressState: 'Maharashtra',
      addressDistrict: 'Pune',
      addressPincode: '411026',
    },
    {
      key: 'spare',
      name: 'Lakshmi Auto Components LLP',
      supplierType: 'spare_parts' as const,
      contactPerson: 'Lakshmi Iyer',
      contactPhone: '+919812345678',
      contactEmail: demoEmail('staging.demo.supplier.spare'),
      agreementReference: 'GSTIN: 33AAACL5678B2Z9',
      addressLine1: 'Ambattur Industrial Estate',
      addressCity: 'Chennai',
      addressState: 'Tamil Nadu',
      addressDistrict: 'Chennai',
      addressPincode: '600058',
    },
    {
      key: 'compliance',
      name: 'National Fleet Compliance Services',
      supplierType: 'compliance' as const,
      contactPerson: 'Arjun Mehta',
      contactPhone: '+919900112233',
      contactEmail: demoEmail('staging.demo.supplier.compliance'),
      agreementReference: 'GSTIN: 07AAACN9012C3Z1',
      addressLine1: 'Okhla Phase 3',
      addressCity: 'New Delhi',
      addressState: 'Delhi',
      addressDistrict: 'South East Delhi',
      addressPincode: '110020',
    },
    {
      key: 'driver',
      name: 'Sagar Driver Staffing Pvt Ltd',
      supplierType: 'driver' as const,
      contactPerson: 'Sagar Patil',
      contactPhone: '+919711223344',
      contactEmail: demoEmail('staging.demo.supplier.driver'),
      agreementReference: 'GSTIN: 29AABCS3456D4Z8',
      addressLine1: 'Peenya Industrial Area',
      addressCity: 'Bengaluru',
      addressState: 'Karnataka',
      addressDistrict: 'Bengaluru Urban',
      addressPincode: '560058',
    },
  ] as const;

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
        isActive: true,
      })
      .returning({ id: organisationSuppliers.id });
    supplierIds.set(seed.key, row.id);
    bump('suppliers', true);
  }

  const employeeSeeds = [
    {
      key: 'ops-lead',
      fullName: 'Ananya Krishnan',
      designation: 'Regional Operations Lead',
      department: 'Operations',
      locationKey: 'blr-hq',
      companyEmail: demoEmail('staging.demo.employee.ananya'),
      mobile: '+919800112233',
    },
    {
      key: 'fleet-mgr',
      fullName: 'Rahul Sharma',
      designation: 'Fleet Manager',
      department: 'Fleet',
      locationKey: 'mum-hub',
      companyEmail: demoEmail('staging.demo.employee.rahul'),
      mobile: '+919811223344',
    },
    {
      key: 'finance',
      fullName: 'Priya Nair',
      designation: 'Finance Controller',
      department: 'Finance',
      locationKey: 'del-sales',
      companyEmail: demoEmail('staging.demo.employee.priya'),
      mobile: '+919822334455',
    },
    {
      key: 'workshop',
      fullName: 'Karthik Reddy',
      designation: 'Workshop Supervisor',
      department: 'Workshop',
      locationKey: 'hyd-workshop',
      companyEmail: demoEmail('staging.demo.employee.karthik'),
      mobile: '+919833445566',
    },
  ] as const;

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
      bump('employees', false);
      continue;
    }
    await db.insert(organisationEmployees).values({
      organizationId,
      fullName: seed.fullName,
      designation: seed.designation,
      department: seed.department,
      locationId: locationIds.get(seed.locationKey) ?? null,
      companyEmail: seed.companyEmail,
      mobile: seed.mobile,
      dateOfJoining: '2024-04-01',
      isActive: true,
    });
    bump('employees', true);
  }

  const clientSeeds = [
    {
      key: 'meridian',
      name: 'Meridian QuickCommerce Pvt Ltd',
      addressLine1: 'Plot 18, Hinjawadi Phase 2',
      addressCity: 'Pune',
      addressState: 'Maharashtra',
      addressDistrict: 'Pune',
      addressPincode: '411057',
      pocName: 'Aditi Rao',
      pocPhone: '+919876543201',
      pocEmail: demoEmail('staging.demo.client.meridian'),
    },
    {
      key: 'saffron',
      name: 'Saffron Foods Delivery LLP',
      addressLine1: 'Salt Lake Sector V, Block EP',
      addressCity: 'Kolkata',
      addressState: 'West Bengal',
      addressDistrict: 'Kolkata',
      addressPincode: '700091',
      pocName: 'Debojit Banerjee',
      pocPhone: '+919876543202',
      pocEmail: demoEmail('staging.demo.client.saffron'),
    },
    {
      key: 'northwind',
      name: 'Northwind Retail Logistics',
      addressLine1: 'Sitapura Industrial Area',
      addressCity: 'Jaipur',
      addressState: 'Rajasthan',
      addressDistrict: 'Jaipur',
      addressPincode: '302022',
      pocName: 'Meera Singh',
      pocPhone: '+919876543203',
      pocEmail: demoEmail('staging.demo.client.northwind'),
    },
    {
      key: 'coastal',
      name: 'Coastal Express Couriers',
      addressLine1: 'Kakkanad Infopark Road',
      addressCity: 'Kochi',
      addressState: 'Kerala',
      addressDistrict: 'Ernakulam',
      addressPincode: '682030',
      pocName: 'Arun Varma',
      pocPhone: '+919876543204',
      pocEmail: demoEmail('staging.demo.client.coastal'),
    },
  ] as const;

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
        isActive: true,
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

  const assetClassSeeds = [
    {
      key: 'scooter-2w',
      code: 'SD2W',
      name: 'Petrol Scooter — Standard',
      vehicleType: '2W' as const,
      fuelType: 'Petrol',
      fuelTankCapacity: '5.5',
      ratedLoadFrom: '80',
      ratedLoadTo: '150',
    },
    {
      key: 'auto-3w',
      code: 'SD3W',
      name: 'CNG Passenger Auto',
      vehicleType: '3W' as const,
      fuelType: 'CNG',
      fuelTankCapacity: '4',
      ratedLoadFrom: '200',
      ratedLoadTo: '400',
    },
    {
      key: 'lcv-4w',
      code: 'SD4W',
      name: 'Diesel Light Commercial Van',
      vehicleType: '4W' as const,
      fuelType: 'Diesel',
      fuelTankCapacity: '45',
      ratedLoadFrom: '750',
      ratedLoadTo: '1200',
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
        isActive: true,
      })
      .returning({
        id: assetRegisterAssetClasses.id,
        name: assetRegisterAssetClasses.name,
      });
    assetClassIds.set(seed.key, { id: row.id, name: row.name });
    bump('assetClasses', true);
  }

  const masterNames = [
    { classKey: 'scooter-2w', name: 'Honda Activa 6G' },
    { classKey: 'auto-3w', name: 'Bajaj RE CNG' },
    { classKey: 'lcv-4w', name: 'Tata Ace Gold' },
    { classKey: 'cargo-3w', name: 'Euler HiLoad EV' },
  ] as const;

  const masterIds = new Map<string, string>();
  for (const seed of masterNames) {
    const classRef = assetClassIds.get(seed.classKey);
    if (!classRef) continue;
    const [existing] = await db
      .select({ id: assetRegisterAssetMasters.id })
      .from(assetRegisterAssetMasters)
      .where(
        and(
          eq(assetRegisterAssetMasters.organizationId, organizationId),
          eq(assetRegisterAssetMasters.assetClassId, classRef.id),
          eq(assetRegisterAssetMasters.name, seed.name),
        ),
      )
      .limit(1);
    if (existing) {
      masterIds.set(seed.classKey, existing.id);
      bump('assetMasters', false);
      continue;
    }
    const [row] = await db
      .insert(assetRegisterAssetMasters)
      .values({
        organizationId,
        assetClassId: classRef.id,
        name: seed.name,
        isActive: true,
      })
      .returning({ id: assetRegisterAssetMasters.id });
    masterIds.set(seed.classKey, row.id);
    bump('assetMasters', true);
  }

  const vehicleSeeds = [
    {
      key: 'v1',
      classKey: 'scooter-2w',
      fleetCode: 'STDEMO-1001',
      registrationNumber: 'KA01ST1001',
      chassisNumber: 'STGDM1001CHASSIS0001',
    },
    {
      key: 'v2',
      classKey: 'auto-3w',
      fleetCode: 'STDEMO-1002',
      registrationNumber: 'MH02ST1002',
      chassisNumber: 'STGDM1002CHASSIS0001',
    },
    {
      key: 'v3',
      classKey: 'lcv-4w',
      fleetCode: 'STDEMO-1003',
      registrationNumber: 'DL03ST1003',
      chassisNumber: 'STGDM1003CHASSIS0001',
    },
    {
      key: 'v4',
      classKey: 'cargo-3w',
      fleetCode: 'STDEMO-1004',
      registrationNumber: 'TS04ST1004',
      chassisNumber: 'STGDM1004CHASSIS0001',
    },
  ] as const;

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
    const masterId = masterIds.get(seed.classKey);
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
        operationalStatus: 'available',
        isActive: true,
      })
      .returning({ id: assetRegisterVehicles.id });
    vehicleIds.set(seed.key, row.id);
    bump('vehicles', true);
  }

  const fleetClientIds = new Map<string, string>();
  const clientKeys = ['meridian', 'saffron', 'northwind', 'coastal'] as const;

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

  const leaseSeeds = clientKeys.map((clientKey, index) => ({
    clientKey,
    contractNumber: `STDEMO-LC-${String(index + 1).padStart(3, '0')}`,
    classKey: vehicleSeeds[index]?.classKey ?? 'scooter-2w',
    vehicleKey: vehicleSeeds[index]?.key ?? 'v1',
  }));

  const leaseContractIds = new Map<string, string>();
  for (const seed of leaseSeeds) {
    const fleetClientId = fleetClientIds.get(seed.clientKey);
    const classRef = assetClassIds.get(seed.classKey);
    if (!fleetClientId || !classRef) continue;

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
      const [row] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: seed.contractNumber,
          clientId: fleetClientId,
          status: 'active',
          startDate: new Date('2025-04-01T00:00:00.000Z'),
          endDate: new Date('2028-03-31T00:00:00.000Z'),
          termMonths: 36,
          securityDeposit: '50000.00',
          billingFrequency: 'monthly',
          description: STAGING_DEMO_SEED_SOURCE,
        })
        .returning({ id: leaseContracts.id });
      contractId = row.id;
      bump('leaseContracts', true);

      await db
        .insert(leaseContractAssetLines)
        .values({
          contractId,
          assetClass: classRef.name,
          committedQuantity: 1,
          ratePerVehicleMonth: '12500.00',
          availabilityCovered: true,
          availabilityStatus: 'covered',
          availableNowCount: 1,
          sortOrder: 0,
        })
        .onConflictDoNothing({
          target: [
            leaseContractAssetLines.contractId,
            leaseContractAssetLines.assetClass,
          ],
        });
    }
    leaseContractIds.set(seed.contractNumber, contractId);

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

  const partSeeds = [
    {
      key: 'brake',
      name: 'Front Brake Pad Set — 110cc',
      partCode: 'STDEMO-P001',
    },
    { key: 'filter', name: 'Engine Oil Filter — LCV', partCode: 'STDEMO-P002' },
    { key: 'tyre', name: 'Radial Tyre 4.00-12', partCode: 'STDEMO-P003' },
    {
      key: 'battery',
      name: 'EV Traction Battery Module',
      partCode: 'STDEMO-P004',
    },
  ] as const;

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
        compatibleAssetClasses: ['Petrol Scooter — Standard'],
        isActive: true,
      })
      .returning({ id: inventoryCatalogParts.id });
    partIds.set(seed.key, row.id);
    bump('parts', true);
  }

  const receiptKeys = ['brake', 'filter', 'tyre', 'battery'] as const;

  for (const [index, partKey] of receiptKeys.entries()) {
    const partId = partIds.get(partKey);
    const locationId = locationIds.get(
      index % 2 === 0 ? 'mum-hub' : 'hyd-workshop',
    );
    const supplierId = supplierIds.get(index % 2 === 0 ? 'spare' : 'bike');
    if (!partId || !locationId) continue;
    const receiptNumber = `STDEMO-SR-${String(index + 1).padStart(3, '0')}`;
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

  for (const [index, partKey] of receiptKeys.entries()) {
    const partId = partIds.get(partKey);
    const locationId = locationIds.get('blr-hq');
    if (!partId || !locationId) continue;
    const requestNumber = `STDEMO-PR-${String(index + 1).padStart(3, '0')}`;
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
    await db.insert(inventoryPartsRequests).values({
      organizationId,
      requestNumber,
      workOrderRef: `WO-STDEMO-${2025}${index + 1}`,
      partId,
      locationId,
      quantityRequested: 2,
      requestType: 'internal',
      vehicleRef: vehicleSeeds[index]?.fleetCode ?? 'STDEMO-1001',
      status: index === 0 ? 'fulfilled' : 'blocked',
      compatibilityOk: true,
    });
    bump('partsRequests', true);
  }

  const purchaseInvoices = supplierSeeds.map((s, index) => ({
    number: `STDEMO-PI-${String(index + 1).padStart(3, '0')}`,
    supplierKey: s.key,
    amountMinor: 4500000 + index * 250000,
  }));

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
        status: index === 0 ? 'paid' : 'partially_paid',
        supplierId,
        partyName:
          supplierSeeds.find((s) => s.key === inv.supplierKey)?.name ??
          'Supplier',
        description: `Staging demo spare parts purchase — ${STAGING_DEMO_SEED_SOURCE}`,
        totalAmountMinor: inv.amountMinor,
        amountPaidMinor:
          index === 0 ? inv.amountMinor : Math.floor(inv.amountMinor * 0.4),
        invoiceDate: '2025-07-01',
        notes: STAGING_DEMO_SEED_SOURCE,
        purchaseLineKind: 'spare_parts',
      })
      .returning({ id: financeInvoices.id });
    const partId = partIds.get(receiptKeys[index] ?? 'brake');
    if (partId) {
      await db.insert(financeInvoiceLines).values({
        invoiceId: row.id,
        lineKind: 'spare_parts',
        inventoryPartId: partId,
        quantity: 10,
        unitCostMinor: Math.floor(inv.amountMinor / 10),
        lineAmountMinor: inv.amountMinor,
        batchLot: `LOT-STDEMO-${index + 1}`,
      });
    }
    if (index === 0) {
      await db
        .insert(financeInvoicePayments)
        .values({
          invoiceId: row.id,
          organizationId,
          amountMinor: inv.amountMinor,
          paymentDate: '2025-07-10',
          paymentMethod: 'NEFT',
          paymentReference: 'UTR-STDEMO-001',
          paymentNumber: 'STDEMO-VP-001',
        })
        .onConflictDoNothing({
          target: [
            financeInvoicePayments.organizationId,
            financeInvoicePayments.paymentNumber,
          ],
        });
    }
    bump('purchaseInvoices', true);
  }

  for (const [index, clientKey] of clientKeys.entries()) {
    const orgClientId = orgClientIds.get(clientKey);
    const contractNumber = `STDEMO-LC-${String(index + 1).padStart(3, '0')}`;
    const leaseId = leaseContractIds.get(contractNumber);
    if (!orgClientId) continue;
    const number = `STDEMO-BI-${String(index + 1).padStart(3, '0')}`;
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
    const amountMinor = 1250000;
    const [row] = await db
      .insert(financeInvoices)
      .values({
        organizationId,
        invoiceNumber: number,
        invoiceType: 'billing',
        status: 'unpaid',
        clientId: orgClientId,
        leaseContractId: leaseId ?? null,
        partyName: clientName,
        description: `Lease billing Jul 2025 — ${STAGING_DEMO_SEED_SOURCE}`,
        totalAmountMinor: amountMinor,
        amountPaidMinor: 0,
        invoiceDate: '2025-07-31',
        billingPeriod: '2025-07',
        notes: STAGING_DEMO_SEED_SOURCE,
        purchaseLineKind: 'billing_lease',
      })
      .returning({ id: financeInvoices.id });
    await db.insert(financeInvoiceLines).values({
      invoiceId: row.id,
      lineKind: 'billing_lease',
      assetClassName: assetClassIds.get(
        vehicleSeeds[index]?.classKey ?? 'scooter-2w',
      )?.name,
      quantity: 1,
      lineAmountMinor: amountMinor,
    });
    bump('billingInvoices', true);
  }

  for (const [index, vehicleKey] of ['v1', 'v2', 'v3', 'v4'].entries()) {
    const vehicleId = vehicleIds.get(vehicleKey);
    if (!vehicleId) continue;
    const number = `STDEMO-SI-${String(index + 1).padStart(3, '0')}`;
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
    const amountMinor = 18500000 + index * 500000;
    const [row] = await db
      .insert(financeInvoices)
      .values({
        organizationId,
        invoiceNumber: number,
        invoiceType: 'sale',
        status: 'unpaid',
        partyName: clientSeeds[index]?.name ?? 'Buyer',
        description: `Vehicle sale invoice — ${STAGING_DEMO_SEED_SOURCE}`,
        totalAmountMinor: amountMinor,
        amountPaidMinor: 0,
        invoiceDate: '2025-08-01',
        notes: STAGING_DEMO_SEED_SOURCE,
        purchaseLineKind: 'sale_vehicle',
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
