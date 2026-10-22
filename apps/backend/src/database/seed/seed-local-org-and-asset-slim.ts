/**
 * Local dev only — professional slim sample data (≈2–3 rows per org/asset submodule).
 *
 * Idempotent via stable emails, employee codes, fleet codes, and contract numbers.
 * Does not delete users or existing rows — append/skip only.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { SYSTEM_LOCATION_TYPE_PRESETS } from '../../modules/organisation/constants/system-location-type-presets';
import type { OrganisationSupplierType } from '../../modules/organisation/constants/supplier-type.constants';
import { buildAssetClassNameFromSpec } from '../../modules/asset-register/utils/asset-class-name.util';
import {
  ASSET_CLASS_ID_SEQUENCE_START,
  formatAssetClassId,
} from '../../modules/asset-register/utils/asset-class-id.util';
import * as schema from '../schema';
import {
  assetRegisterAssetClasses,
  assetRegisterVehicleAssignments,
  assetRegisterVehicles,
} from '../schema/asset-register.schema';
import {
  fleetClients,
  leaseContractAssetLines,
  leaseContracts,
} from '../schema/fleet-leasing.schema';
import {
  organisationClientPocs,
  organisationClients,
  organisationDrivers,
  organisationEmployees,
  organisationLocations,
  organisationLocationTypes,
  organisationSuppliers,
} from '../schema/organisation.schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';
import { LOCAL_SLIM_ORG_ASSET_SEED_SOURCE } from './staging-demo-guards';

type AppDb = NodePgDatabase<typeof schema>;

export type LocalSlimSeedSummary = {
  seedSource: string;
  organizationId: string;
  organizationSlug: string;
  modules: Record<string, { inserted: number; skipped: number }>;
};

const SLIM_FLEET_CODE_PREFIX = 'GF-SLM-';
const SLIM_LEASE_PREFIX = 'LC-SLM-2026-';

function bump(
  modules: Record<string, { inserted: number; skipped: number }>,
  key: string,
  didInsert: boolean,
): void {
  if (!modules[key]) {
    modules[key] = { inserted: 0, skipped: 0 };
  }
  if (didInsert) modules[key].inserted += 1;
  else modules[key].skipped += 1;
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

async function seedSlimLocations(
  db: AppDb,
  organizationId: string,
  typeIds: Map<string, string>,
  modules: LocalSlimSeedSummary['modules'],
): Promise<Map<string, string>> {
  const locationIds = new Map<string, string>();
  const seeds = [
    {
      key: 'bengaluru',
      name: 'Meridian Logistics — Bengaluru Regional Office',
      presetKey: 'office' as const,
      siteContactEmail: 'bengaluru.regional@meridian-logistics.in',
      addressLine1: 'Embassy Tech Village, Outer Ring Road',
      addressCity: 'Bengaluru',
      addressState: 'Karnataka',
      addressDistrict: 'Bengaluru Urban',
      addressPincode: '560103',
      siteContactPhone: '+918012345601',
    },
    {
      key: 'mumbai',
      name: 'Freshkart Retail — Mumbai Fulfilment Hub',
      presetKey: 'warehouse' as const,
      siteContactEmail: 'mumbai.hub@freshkart-retail.in',
      addressLine1: 'B-Wing, Andheri Kurla Road',
      addressCity: 'Mumbai',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai Suburban',
      addressPincode: '400093',
      siteContactPhone: '+912267890123',
    },
    {
      key: 'pune',
      name: 'GrubFleet Pune Distribution Centre',
      presetKey: 'warehouse' as const,
      siteContactEmail: 'pune.dc@grubfleet.in',
      addressLine1: 'Chakan Industrial Area, Phase 1',
      addressCity: 'Pune',
      addressState: 'Maharashtra',
      addressDistrict: 'Pune',
      addressPincode: '410501',
      siteContactPhone: '+912066778899',
    },
  ] as const;

  for (const seed of seeds) {
    const locationTypeId = typeIds.get(seed.presetKey);
    if (!locationTypeId) {
      throw new Error(`Missing location type preset "${seed.presetKey}".`);
    }

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
      bump(modules, 'locations', false);
      continue;
    }

    const [row] = await db
      .insert(organisationLocations)
      .values({
        organizationId,
        name: seed.name,
        locationTypeId,
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
    bump(modules, 'locations', true);
  }
  return locationIds;
}

async function seedSlimEmployees(
  db: AppDb,
  organizationId: string,
  locationIds: Map<string, string>,
  modules: LocalSlimSeedSummary['modules'],
): Promise<Map<string, string>> {
  const employeeIds = new Map<string, string>();
  const seeds = [
    {
      key: 'ops-lead',
      fullName: 'Priya Sharma',
      employeeCode: 'GF-SLM-EMP-001',
      companyEmail: 'priya.sharma@grubfleet.in',
      locationKey: 'bengaluru',
      branchLabel: 'Meridian Logistics — Bengaluru Regional Office',
      designation: 'Vice President, Operations',
      department: 'Operations',
      mobile: '+919876543210',
      reportsToKey: undefined as string | undefined,
    },
    {
      key: 'regional-west',
      fullName: 'Rahul Mehta',
      employeeCode: 'GF-SLM-EMP-002',
      companyEmail: 'rahul.mehta@grubfleet.in',
      locationKey: 'mumbai',
      branchLabel: 'Freshkart Retail — Mumbai Fulfilment Hub',
      designation: 'Regional Manager — West',
      department: 'Operations',
      mobile: '+919811223344',
      reportsToKey: 'ops-lead',
    },
    {
      key: 'warehouse-lead',
      fullName: 'Ananya Iyer',
      employeeCode: 'GF-SLM-EMP-003',
      companyEmail: 'ananya.iyer@grubfleet.in',
      locationKey: 'pune',
      branchLabel: 'GrubFleet Pune Distribution Centre',
      designation: 'Warehouse Supervisor',
      department: 'Logistics',
      mobile: '+919845667788',
      reportsToKey: 'ops-lead',
    },
  ] as const;

  for (const seed of seeds) {
    const [existing] = await db
      .select({ id: organisationEmployees.id })
      .from(organisationEmployees)
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          eq(organisationEmployees.employeeCode, seed.employeeCode),
        ),
      )
      .limit(1);

    if (existing) {
      employeeIds.set(seed.key, existing.id);
      bump(modules, 'employees', false);
      continue;
    }

    const locationId = locationIds.get(seed.locationKey);
    if (!locationId) {
      throw new Error(
        `Missing slim location for employee key ${seed.locationKey}.`,
      );
    }

    const [row] = await db
      .insert(organisationEmployees)
      .values({
        organizationId,
        employeeCode: seed.employeeCode,
        fullName: seed.fullName,
        designation: seed.designation,
        department: seed.department,
        locationId,
        branchLocationLabel: seed.branchLabel,
        employmentType: 'full_time',
        dateOfJoining: '2020-04-01',
        companyEmail: seed.companyEmail,
        mobile: seed.mobile,
        isActive: true,
      })
      .returning({ id: organisationEmployees.id });
    employeeIds.set(seed.key, row.id);
    bump(modules, 'employees', true);
  }

  for (const seed of seeds) {
    if (!seed.reportsToKey) continue;
    const employeeId = employeeIds.get(seed.key);
    const managerId = employeeIds.get(seed.reportsToKey);
    if (employeeId && managerId) {
      await db
        .update(organisationEmployees)
        .set({ reportsToEmployeeId: managerId })
        .where(eq(organisationEmployees.id, employeeId));
    }
  }

  const opsId = employeeIds.get('ops-lead');
  const regionalId = employeeIds.get('regional-west');
  const warehouseId = employeeIds.get('warehouse-lead');
  const bengaluruId = locationIds.get('bengaluru');
  const mumbaiId = locationIds.get('mumbai');
  const puneId = locationIds.get('pune');

  if (opsId && bengaluruId) {
    await db
      .update(organisationLocations)
      .set({ responsibleEmployeeId: opsId })
      .where(eq(organisationLocations.id, bengaluruId));
  }
  if (regionalId && mumbaiId) {
    await db
      .update(organisationLocations)
      .set({ responsibleEmployeeId: regionalId })
      .where(eq(organisationLocations.id, mumbaiId));
  }
  if (warehouseId && puneId) {
    await db
      .update(organisationLocations)
      .set({ responsibleEmployeeId: warehouseId })
      .where(eq(organisationLocations.id, puneId));
  }

  return employeeIds;
}

async function seedSlimSuppliers(
  db: AppDb,
  organizationId: string,
  modules: LocalSlimSeedSummary['modules'],
): Promise<Map<string, string>> {
  const supplierIds = new Map<string, string>();
  const seeds: Array<{
    key: string;
    name: string;
    supplierType: OrganisationSupplierType;
    contactEmail: string;
    contactPerson: string;
    agreementReference: string;
  }> = [
    {
      key: 'compliance',
      name: 'ShieldCover Insurance & RTO Services',
      supplierType: 'compliance',
      contactEmail: 'accounts@shieldcover-insurance.in',
      contactPerson: 'Meera Iyer',
      agreementReference: 'SLIM-AGR-CMP-2026-001',
    },
    {
      key: 'driver',
      name: 'WorkforceLink Driver Services',
      supplierType: 'driver',
      contactEmail: 'fleet.ops@workforcelink.in',
      contactPerson: 'Rajesh Kumar',
      agreementReference: 'SLIM-AGR-DRV-2026-001',
    },
    {
      key: 'spare_parts',
      name: 'Apex Fleet Components',
      supplierType: 'spare_parts',
      contactEmail: 'supply@apexfleetcomponents.in',
      contactPerson: 'Anil Mehta',
      agreementReference: 'SLIM-AGR-SPR-2026-001',
    },
  ];

  for (const seed of seeds) {
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
      bump(modules, 'suppliers', false);
      continue;
    }

    const [row] = await db
      .insert(organisationSuppliers)
      .values({
        organizationId,
        name: seed.name,
        supplierType: seed.supplierType,
        contactPerson: seed.contactPerson,
        contactPhone: '+919876543200',
        contactEmail: seed.contactEmail,
        agreementReference: seed.agreementReference,
        addressLine1: '12 Industrial Estate',
        addressCity: 'Pune',
        addressState: 'Maharashtra',
        addressDistrict: 'Pune',
        addressPincode: '411001',
        addressCountry: 'IN',
        isActive: true,
      })
      .returning({ id: organisationSuppliers.id });
    supplierIds.set(seed.key, row.id);
    bump(modules, 'suppliers', true);
  }
  return supplierIds;
}

async function seedSlimClients(
  db: AppDb,
  organizationId: string,
  modules: LocalSlimSeedSummary['modules'],
): Promise<string | null> {
  let primaryClientId: string | null = null;
  const seeds = [
    {
      key: 'meridian',
      name: 'Meridian Logistics Pvt Ltd',
      pocEmail: 'aditi.rao@meridian-logistics.in',
      pocName: 'Aditi Rao',
      isActive: true,
    },
    {
      key: 'freshkart',
      name: 'Freshkart Retail India',
      pocEmail: 'sandeep.verma@freshkart-retail.in',
      pocName: 'Sandeep Verma',
      isActive: true,
    },
    {
      key: 'horizon',
      name: 'Horizon Foods Distribution',
      pocEmail: 'poc.inactive@horizon-foods.in',
      pocName: 'Kiran Patel',
      isActive: false,
    },
  ] as const;

  for (const seed of seeds) {
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
      if (seed.key === 'freshkart') primaryClientId = existingPoc.clientId;
      bump(modules, 'clients', false);
      continue;
    }

    const [client] = await db
      .insert(organisationClients)
      .values({
        organizationId,
        name: seed.name,
        addressLine1: 'Plot 18, Hinjawadi Phase 2',
        addressCity: 'Pune',
        addressState: 'Maharashtra',
        addressDistrict: 'Pune',
        addressPincode: '411057',
        addressCountry: 'IN',
        isActive: seed.isActive,
      })
      .returning({ id: organisationClients.id });

    await db.insert(organisationClientPocs).values({
      clientId: client.id,
      name: seed.pocName,
      contactNumber: '+919876543201',
      email: seed.pocEmail,
      isPrimary: true,
      sortOrder: 0,
    });

    if (seed.key === 'freshkart') primaryClientId = client.id;
    bump(modules, 'clients', true);
  }
  return primaryClientId;
}

async function seedSlimDrivers(
  db: AppDb,
  organizationId: string,
  driverSupplierId: string,
  modules: LocalSlimSeedSummary['modules'],
): Promise<void> {
  const seeds = [
    {
      email: 'arjun.nair@grubfleet.in',
      name: 'Arjun Nair',
      cprNo: 'IN-DL-880012',
      licenseNumber: 'MH-12-2024-884521',
      isActive: true,
    },
    {
      email: 'meera.joshi@grubfleet.in',
      name: 'Meera Joshi',
      cprNo: 'IN-DL-880013',
      licenseNumber: 'MH-12-2023-771234',
      isActive: true,
    },
    {
      email: 'vikram.patil@grubfleet.in',
      name: 'Vikram Patil',
      cprNo: 'IN-DL-880014',
      licenseNumber: 'MH-12-2022-665432',
      isActive: false,
    },
  ] as const;

  for (const seed of seeds) {
    const [existing] = await db
      .select({ id: organisationDrivers.id })
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.email, seed.email),
        ),
      )
      .limit(1);

    if (existing) {
      bump(modules, 'drivers', false);
      continue;
    }

    await db.insert(organisationDrivers).values({
      organizationId,
      name: seed.name,
      cprNo: seed.cprNo,
      phone: '+919877665544',
      email: seed.email,
      licenseNumber: seed.licenseNumber,
      licenseExpiry: '2027-06-30',
      supplierId: driverSupplierId,
      addressLine1: 'Sector 18',
      addressCity: 'Gurugram',
      addressState: 'Haryana',
      addressDistrict: 'Gurugram',
      addressPincode: '122015',
      addressCountry: 'IN',
      isActive: seed.isActive,
    });
    bump(modules, 'drivers', true);
  }
}

function serializeIntakeChecklist(items: string[]): string {
  return JSON.stringify(items);
}

async function seedSlimAssetRegister(
  db: AppDb,
  organizationId: string,
  organisationClientId: string | null,
  complianceSupplierId: string | null,
  modules: LocalSlimSeedSummary['modules'],
): Promise<void> {
  const intakeScooter = serializeIntakeChecklist([
    'Helmet and rider kit',
    'Insurance policy copy',
    'PUC certificate',
  ]);

  const assetClassSeeds = [
    {
      key: 'activa',
      brand: 'Honda',
      modelName: 'Activa 6G',
      manufacturingYear: 2026,
      engineDisplacementCc: 110,
      fuelSystem: 'EFI',
      color: 'Pearl Spartan Blue',
      colorCode: 'psb',
      vehicleType: '2W' as const,
      fuelType: 'Petrol',
      fuelTankCapacity: '5.3',
      mileageFrom: '45',
      mileageTo: '55',
      mileageUnit: 'km/L',
      ratedLoadFrom: '80',
      ratedLoadTo: '130',
      defaultIntakeChecklist: intakeScooter,
    },
    {
      key: 're-cng',
      brand: 'Bajaj',
      modelName: 'RE CNG',
      manufacturingYear: 2026,
      engineDisplacementCc: 200,
      fuelSystem: 'CNG',
      color: 'Yellow Black',
      colorCode: 'yb',
      vehicleType: '3W' as const,
      fuelType: 'CNG',
      fuelTankCapacity: '4.0',
      mileageFrom: '28',
      mileageTo: '35',
      mileageUnit: 'km/kg',
      ratedLoadFrom: '200',
      ratedLoadTo: '380',
      defaultIntakeChecklist: intakeScooter,
    },
  ] as const;

  const classIds = new Map<string, { id: string; name: string }>();
  let nextClassSeq = ASSET_CLASS_ID_SEQUENCE_START;

  for (const seed of assetClassSeeds) {
    const className = buildAssetClassNameFromSpec({
      manufacturingYear: seed.manufacturingYear,
      modelName: seed.modelName,
      engineDisplacementCc: seed.engineDisplacementCc,
      fuelType: seed.fuelType,
      fuelSystem: seed.fuelSystem,
      colorCode: seed.colorCode,
    });

    const [existing] = await db
      .select({
        id: assetRegisterAssetClasses.id,
        name: assetRegisterAssetClasses.name,
      })
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.name, className),
        ),
      )
      .limit(1);

    if (existing) {
      classIds.set(seed.key, { id: existing.id, name: existing.name });
      bump(modules, 'assetClasses', false);
      continue;
    }

    const [row] = await db
      .insert(assetRegisterAssetClasses)
      .values({
        organizationId,
        classId: formatAssetClassId(nextClassSeq++),
        name: className,
        description: LOCAL_SLIM_ORG_ASSET_SEED_SOURCE,
        brand: seed.brand,
        modelName: seed.modelName,
        manufacturingYear: seed.manufacturingYear,
        engineDisplacementCc: seed.engineDisplacementCc,
        fuelSystem: seed.fuelSystem,
        color: seed.color,
        colorCode: seed.colorCode,
        vehicleType: seed.vehicleType,
        fuelType: seed.fuelType,
        fuelTankCapacity: seed.fuelTankCapacity,
        mileageFrom: seed.mileageFrom,
        mileageTo: seed.mileageTo,
        mileageUnit: seed.mileageUnit,
        ratedLoadFrom: seed.ratedLoadFrom,
        ratedLoadTo: seed.ratedLoadTo,
        defaultIntakeChecklist: seed.defaultIntakeChecklist,
        isActive: true,
      })
      .returning({
        id: assetRegisterAssetClasses.id,
        name: assetRegisterAssetClasses.name,
      });
    classIds.set(seed.key, { id: row.id, name: row.name });
    bump(modules, 'assetClasses', true);
  }

  const vehiclePlan = [
    {
      key: 'v1',
      classKey: 'activa' as const,
      seq: 1,
      status: 'available' as const,
      regEnd: '2031-03-31',
      insEnd: '2027-08-15',
      warrantyEnd: '2028-06-30',
    },
    {
      key: 'v2',
      classKey: 'activa' as const,
      seq: 2,
      status: 'leased' as const,
      regEnd: '2030-12-31',
      insEnd: '2026-10-28',
      warrantyEnd: '2027-12-31',
    },
    {
      key: 'v3',
      classKey: 're-cng' as const,
      seq: 3,
      status: 'available' as const,
      regEnd: '2029-06-30',
      insEnd: '2026-07-01',
      warrantyEnd: '2026-09-30',
    },
  ] as const;

  const vehicleIds = new Map<string, string>();

  for (const plan of vehiclePlan) {
    const classRef = classIds.get(plan.classKey);
    if (!classRef) continue;

    const fleetCode = `${SLIM_FLEET_CODE_PREFIX}${2000 + plan.seq}`;

    const [existing] = await db
      .select({ id: assetRegisterVehicles.id })
      .from(assetRegisterVehicles)
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.fleetCode, fleetCode),
        ),
      )
      .limit(1);

    if (existing) {
      vehicleIds.set(plan.key, existing.id);
      bump(modules, 'vehicles', false);
      continue;
    }

    const [row] = await db
      .insert(assetRegisterVehicles)
      .values({
        organizationId,
        assetClassId: classRef.id,
        fleetCode,
        registrationNumber: `MH12SL${1000 + plan.seq}`,
        chassisNumber: `SLIMCH${String(100000000000 + plan.seq).slice(-12)}`,
        modelYear: 2024,
        odometer: 5000 + plan.seq * 1200,
        registrationStartDate: '2023-04-01',
        registrationEndDate: plan.regEnd,
        insuranceStartDate: '2025-04-01',
        insuranceEndDate: plan.insEnd,
        insurancePremium: '12450.00',
        insuranceSupplierId: complianceSupplierId,
        warrantyStartDate: '2023-04-01',
        warrantyEndDate: plan.warrantyEnd,
        specialNotes: LOCAL_SLIM_ORG_ASSET_SEED_SOURCE,
        operationalStatus: plan.status,
        isActive: true,
      })
      .returning({ id: assetRegisterVehicles.id });

    vehicleIds.set(plan.key, row.id);
    bump(modules, 'vehicles', true);
  }

  if (!organisationClientId) {
    return;
  }

  const fleetClientCode = 'FL-SLM-2026-001';
  let fleetClientId: string | null = null;

  const [existingFleetClient] = await db
    .select({ id: fleetClients.id })
    .from(fleetClients)
    .where(
      and(
        eq(fleetClients.organizationId, organizationId),
        eq(fleetClients.clientCode, fleetClientCode),
      ),
    )
    .limit(1);

  if (existingFleetClient) {
    fleetClientId = existingFleetClient.id;
    bump(modules, 'fleetClients', false);
  } else {
    const [fleetRow] = await db
      .insert(fleetClients)
      .values({
        organizationId,
        clientCode: fleetClientCode,
        companyName: 'Freshkart Retail India',
        taxId: '27AABCF1234E1Z5',
        address: 'Plot 18, Hinjawadi Phase 2, Pune 411057',
        organisationClientId,
        isActive: true,
      })
      .returning({ id: fleetClients.id });
    fleetClientId = fleetRow.id;
    bump(modules, 'fleetClients', true);
  }

  const contractNumber = `${SLIM_LEASE_PREFIX}0001`;
  const classRef = classIds.get('activa');
  if (!classRef || !fleetClientId) return;

  const [existingContract] = await db
    .select({ id: leaseContracts.id })
    .from(leaseContracts)
    .where(
      and(
        eq(leaseContracts.organizationId, organizationId),
        eq(leaseContracts.contractNumber, contractNumber),
      ),
    )
    .limit(1);

  let contractId: string;
  if (existingContract) {
    contractId = existingContract.id;
    bump(modules, 'leaseContracts', false);
    // Keep one open bulk-assign slot: demo assigns 1 vehicle on a 2-unit line.
    await db
      .update(leaseContractAssetLines)
      .set({
        committedQuantity: 2,
        assetClassId: classRef.id,
      })
      .where(
        and(
          eq(leaseContractAssetLines.contractId, contractId),
          eq(leaseContractAssetLines.assetClass, classRef.name.slice(0, 64)),
        ),
      );
  } else {
    const [contractRow] = await db
      .insert(leaseContracts)
      .values({
        organizationId,
        contractNumber,
        clientId: fleetClientId,
        status: 'active',
        startDate: new Date('2025-04-01T00:00:00.000Z'),
        endDate: new Date('2028-03-31T00:00:00.000Z'),
        termMonths: 36,
        securityDeposit: '75000.00',
        billingFrequency: 'monthly',
        description: LOCAL_SLIM_ORG_ASSET_SEED_SOURCE,
      })
      .returning({ id: leaseContracts.id });
    contractId = contractRow.id;
    bump(modules, 'leaseContracts', true);

    await db
      .insert(leaseContractAssetLines)
      .values({
        contractId,
        assetClass: classRef.name.slice(0, 64),
        assetClassId: classRef.id,
        committedQuantity: 2,
        ratePerVehicleMonth: '14500.00',
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

  const leasedVehicleId = vehicleIds.get('v2');
  if (!leasedVehicleId) return;

  const [existingAssignment] = await db
    .select({ id: assetRegisterVehicleAssignments.id })
    .from(assetRegisterVehicleAssignments)
    .where(
      and(
        eq(assetRegisterVehicleAssignments.organizationId, organizationId),
        eq(assetRegisterVehicleAssignments.vehicleId, leasedVehicleId),
        eq(assetRegisterVehicleAssignments.leaseContractId, contractId),
      ),
    )
    .limit(1);

  if (existingAssignment) {
    bump(modules, 'assignments', false);
  } else {
    await db.insert(assetRegisterVehicleAssignments).values({
      organizationId,
      vehicleId: leasedVehicleId,
      leaseContractId: contractId,
      fleetClientId,
      organisationClientId,
    });
    await db
      .update(assetRegisterVehicles)
      .set({ operationalStatus: 'leased' })
      .where(eq(assetRegisterVehicles.id, leasedVehicleId));
    bump(modules, 'assignments', true);
  }
}

export async function seedLocalOrgAndAssetSlim(
  db: AppDb,
  organizationId: string,
): Promise<LocalSlimSeedSummary> {
  const modules: LocalSlimSeedSummary['modules'] = {};

  const typeIds = await ensureSystemLocationTypes(db, organizationId);
  const locationIds = await seedSlimLocations(
    db,
    organizationId,
    typeIds,
    modules,
  );
  await seedSlimEmployees(db, organizationId, locationIds, modules);
  const supplierIds = await seedSlimSuppliers(db, organizationId, modules);
  const primaryClientId = await seedSlimClients(db, organizationId, modules);

  const driverSupplierId = supplierIds.get('driver');
  if (driverSupplierId) {
    await seedSlimDrivers(db, organizationId, driverSupplierId, modules);
  }

  await seedSlimAssetRegister(
    db,
    organizationId,
    primaryClientId,
    supplierIds.get('compliance') ?? null,
    modules,
  );

  return {
    seedSource: LOCAL_SLIM_ORG_ASSET_SEED_SOURCE,
    organizationId,
    organizationSlug: DEV_ORG_SLUG,
    modules,
  };
}

export async function countSlimSeedScopeRows(
  db: AppDb,
  organizationId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const tables: Array<[string, ReturnType<typeof sql>]> = [
    [
      'organisation_locations',
      sql`SELECT count(*)::int FROM organisation_locations WHERE organization_id = ${organizationId}`,
    ],
    [
      'organisation_employees',
      sql`SELECT count(*)::int FROM organisation_employees WHERE organization_id = ${organizationId}`,
    ],
    [
      'organisation_suppliers',
      sql`SELECT count(*)::int FROM organisation_suppliers WHERE organization_id = ${organizationId}`,
    ],
    [
      'organisation_clients',
      sql`SELECT count(*)::int FROM organisation_clients WHERE organization_id = ${organizationId}`,
    ],
    [
      'organisation_drivers',
      sql`SELECT count(*)::int FROM organisation_drivers WHERE organization_id = ${organizationId}`,
    ],
    [
      'asset_register_asset_classes',
      sql`SELECT count(*)::int FROM asset_register_asset_classes WHERE organization_id = ${organizationId}`,
    ],
    [
      'asset_register_vehicles',
      sql`SELECT count(*)::int FROM asset_register_vehicles WHERE organization_id = ${organizationId}`,
    ],
    [
      'asset_register_vehicle_assignments',
      sql`SELECT count(*)::int FROM asset_register_vehicle_assignments WHERE organization_id = ${organizationId}`,
    ],
    [
      'lease_contracts',
      sql`SELECT count(*)::int FROM lease_contracts WHERE organization_id = ${organizationId}`,
    ],
  ];

  for (const [name, query] of tables) {
    const result = await db.execute(query);
    const row = result.rows[0] as { count?: number } | undefined;
    counts[name] = row?.count ?? 0;
  }

  return counts;
}
