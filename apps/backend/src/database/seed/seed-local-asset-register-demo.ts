/**
 * Local dev only — Asset Register module demo (classes, fleet vehicles, assignments, compliance dates).
 *
 * Prerequisite: base `npm run db:seed -w backend` (permissions + dev org + admin).
 *
 * Run (PowerShell, from repo root — does not modify package.json):
 *   $env:APP_ENV='development'; $env:SEED_LOCAL_ASSET_REGISTER_DEMO='1'; npm run db:seed -w backend
 *
 * Uses existing `npm run db:seed -w backend` entrypoint (no package.json change).
 */
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { buildAssetClassNameFromSpec } from '../../modules/asset-register/utils/asset-class-name.util';
import {
  ASSET_CLASS_ID_SEQUENCE_START,
  formatAssetClassId,
} from '../../modules/asset-register/utils/asset-class-id.util';
import * as schema from '../schema';
import { organizations } from '../schema';
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
import { organisationClients } from '../schema/organisation.schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';
import { LOCAL_ASSET_REGISTER_DEMO_SEED_SOURCE } from './staging-demo-guards';

type AppDb = NodePgDatabase<typeof schema>;

export type LocalAssetRegisterDemoSeedSummary = {
  seedSource: string;
  organizationId: string;
  organizationSlug: string;
  inserted: Record<string, number>;
  skipped: Record<string, number>;
};

const SEED_YEAR = 2026;

function serializeIntakeChecklist(items: string[]): string {
  return JSON.stringify(items);
}

function formatPuneRegistration(seq: number): string {
  const letter1 = String.fromCharCode(65 + (seq % 26));
  const letter2 = String.fromCharCode(66 + ((seq * 5) % 26));
  return `MH12${letter1}${letter2}${String(1000 + seq)}`;
}

function formatLocalFleetCode(seq: number): string {
  return `GF-LOC-${2000 + seq}`;
}

function formatLocalLeaseContractNumber(seq: number): string {
  return `LC-DEV-${SEED_YEAR}-${String(seq).padStart(4, '0')}`;
}

function formatLocalFleetClientCode(): string {
  return `FL-DEV-${SEED_YEAR}-001`;
}

type ComplianceProfile = {
  registrationEndDate: string;
  insuranceEndDate: string;
  warrantyEndDate: string;
};

function complianceProfiles(): ComplianceProfile[] {
  return [
    {
      registrationEndDate: '2031-03-31',
      insuranceEndDate: '2027-08-15',
      warrantyEndDate: '2028-06-30',
    },
    {
      registrationEndDate: '2030-12-31',
      insuranceEndDate: '2026-10-28',
      warrantyEndDate: '2027-12-31',
    },
    {
      registrationEndDate: '2029-06-30',
      insuranceEndDate: '2026-07-01',
      warrantyEndDate: '2026-09-30',
    },
  ];
}

async function resolveDevOrganizationId(db: AppDb): Promise<string> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) {
    throw new Error(
      `Organization slug "${DEV_ORG_SLUG}" not found. Run base db:seed first.`,
    );
  }
  return org.id;
}

export async function seedLocalAssetRegisterDemo(
  db: AppDb,
): Promise<LocalAssetRegisterDemoSeedSummary> {
  const organizationId = await resolveDevOrganizationId(db);
  const inserted: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const bump = (key: string, didInsert: boolean) => {
    if (didInsert) inserted[key] = (inserted[key] ?? 0) + 1;
    else skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const intakeScooter = serializeIntakeChecklist([
    'Helmet and rider kit',
    'Insurance policy copy',
    'PUC certificate',
    'Odometer photograph',
  ]);
  const intakeThreeWheel = serializeIntakeChecklist([
    'Fire extinguisher',
    'First-aid kit',
    'CNG kit inspection sticker',
    'Commercial permit copy',
  ]);
  const intakeLcv = serializeIntakeChecklist([
    'Load body inspection',
    'RC and fitness certificate',
    'Fastag active',
    'Tool kit and jack',
  ]);

  const assetClassSeeds = [
    {
      key: 'activa-2w',
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
      isActive: true,
    },
    {
      key: 'jupiter-2w',
      brand: 'TVS',
      modelName: 'Jupiter 125',
      manufacturingYear: 2026,
      engineDisplacementCc: 125,
      fuelSystem: 'EFI',
      color: 'Matte Silver',
      colorCode: 'ms',
      vehicleType: '2W' as const,
      fuelType: 'Petrol',
      fuelTankCapacity: '6.0',
      mileageFrom: '50',
      mileageTo: '60',
      mileageUnit: 'km/L',
      ratedLoadFrom: '80',
      ratedLoadTo: '140',
      defaultIntakeChecklist: intakeScooter,
      isActive: true,
    },
    {
      key: 'bajaj-re-3w',
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
      defaultIntakeChecklist: intakeThreeWheel,
      isActive: true,
    },
    {
      key: 'euler-cargo-3w',
      brand: 'Euler',
      modelName: 'HiLoad EV',
      manufacturingYear: 2026,
      engineDisplacementCc: 0,
      fuelSystem: 'Motor',
      color: 'White',
      colorCode: 'wh',
      vehicleType: '3W' as const,
      fuelType: 'Electric',
      fuelTankCapacity: '0',
      mileageFrom: '90',
      mileageTo: '110',
      mileageUnit: 'km/charge',
      ratedLoadFrom: '300',
      ratedLoadTo: '550',
      defaultIntakeChecklist: intakeThreeWheel,
      isActive: true,
    },
    {
      key: 'maxima-3w',
      brand: 'Bajaj',
      modelName: 'Maxima Cargo',
      manufacturingYear: 2026,
      engineDisplacementCc: 435,
      fuelSystem: 'CRDi',
      color: 'White Blue',
      colorCode: 'wb',
      vehicleType: '3W' as const,
      fuelType: 'Diesel',
      fuelTankCapacity: '12.0',
      mileageFrom: '32',
      mileageTo: '38',
      mileageUnit: 'km/L',
      ratedLoadFrom: '250',
      ratedLoadTo: '450',
      defaultIntakeChecklist: intakeThreeWheel,
      isActive: true,
    },
    {
      key: 'ace-4w',
      brand: 'Tata',
      modelName: 'Ace Gold',
      manufacturingYear: 2026,
      engineDisplacementCc: 702,
      fuelSystem: 'CRDi',
      color: 'White',
      colorCode: 'wh',
      vehicleType: '4W' as const,
      fuelType: 'Diesel',
      fuelTankCapacity: '45.0',
      mileageFrom: '18',
      mileageTo: '22',
      mileageUnit: 'km/L',
      ratedLoadFrom: '750',
      ratedLoadTo: '1200',
      defaultIntakeChecklist: intakeLcv,
      isActive: true,
    },
  ] as const;

  const assetClassIds = new Map<string, { id: string; name: string }>();
  let nextAssetClassIdSequence = ASSET_CLASS_ID_SEQUENCE_START;
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
        defaultIntakeChecklist:
          assetRegisterAssetClasses.defaultIntakeChecklist,
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
      assetClassIds.set(seed.key, { id: existing.id, name: existing.name });
      bump('assetClasses', false);
      if (!existing.defaultIntakeChecklist?.trim()) {
        await db
          .update(assetRegisterAssetClasses)
          .set({
            defaultIntakeChecklist: seed.defaultIntakeChecklist,
            updatedAt: new Date(),
          })
          .where(eq(assetRegisterAssetClasses.id, existing.id));
      }
      continue;
    }

    const [row] = await db
      .insert(assetRegisterAssetClasses)
      .values({
        organizationId,
        classId: formatAssetClassId(nextAssetClassIdSequence++),
        name: className,
        description: LOCAL_ASSET_REGISTER_DEMO_SEED_SOURCE,
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
        isActive: seed.isActive,
      })
      .returning({
        id: assetRegisterAssetClasses.id,
        name: assetRegisterAssetClasses.name,
      });
    assetClassIds.set(seed.key, { id: row.id, name: row.name });
    bump('assetClasses', true);
  }

  const profiles = complianceProfiles();
  const vehiclePlan: Array<{
    key: string;
    classKey: (typeof assetClassSeeds)[number]['key'];
    fleetSeq: number;
    modelYear: number;
    odometer: number;
    operationalStatus: 'available' | 'leased' | 'workshop' | 'sold' | 'retired';
    isActive: boolean;
    profileIndex: number;
    chassisPrefix: string;
  }> = [
    {
      key: 'v-activa-1',
      classKey: 'activa-2w',
      fleetSeq: 1,
      modelYear: 2024,
      odometer: 8420,
      operationalStatus: 'available',
      isActive: true,
      profileIndex: 0,
      chassisPrefix: 'ME4JF',
    },
    {
      key: 'v-activa-2',
      classKey: 'activa-2w',
      fleetSeq: 2,
      modelYear: 2025,
      odometer: 3120,
      operationalStatus: 'leased',
      isActive: true,
      profileIndex: 1,
      chassisPrefix: 'ME4JF',
    },
    {
      key: 'v-jupiter-1',
      classKey: 'jupiter-2w',
      fleetSeq: 3,
      modelYear: 2025,
      odometer: 5600,
      operationalStatus: 'available',
      isActive: true,
      profileIndex: 0,
      chassisPrefix: 'MD626',
    },
    {
      key: 'v-jupiter-2',
      classKey: 'jupiter-2w',
      fleetSeq: 4,
      modelYear: 2024,
      odometer: 11800,
      operationalStatus: 'workshop',
      isActive: true,
      profileIndex: 2,
      chassisPrefix: 'MD626',
    },
    {
      key: 'v-re-1',
      classKey: 'bajaj-re-3w',
      fleetSeq: 5,
      modelYear: 2023,
      odometer: 42100,
      operationalStatus: 'leased',
      isActive: true,
      profileIndex: 1,
      chassisPrefix: 'MD2AW',
    },
    {
      key: 'v-re-2',
      classKey: 'bajaj-re-3w',
      fleetSeq: 6,
      modelYear: 2024,
      odometer: 28750,
      operationalStatus: 'available',
      isActive: true,
      profileIndex: 0,
      chassisPrefix: 'MD2AW',
    },
    {
      key: 'v-euler-1',
      classKey: 'euler-cargo-3w',
      fleetSeq: 7,
      modelYear: 2025,
      odometer: 9200,
      operationalStatus: 'available',
      isActive: true,
      profileIndex: 0,
      chassisPrefix: 'MAT5E',
    },
    {
      key: 'v-euler-2',
      classKey: 'euler-cargo-3w',
      fleetSeq: 8,
      modelYear: 2025,
      odometer: 6400,
      operationalStatus: 'leased',
      isActive: true,
      profileIndex: 2,
      chassisPrefix: 'MAT5E',
    },
    {
      key: 'v-maxima-1',
      classKey: 'maxima-3w',
      fleetSeq: 9,
      modelYear: 2024,
      odometer: 35200,
      operationalStatus: 'available',
      isActive: true,
      profileIndex: 1,
      chassisPrefix: 'MD9BR',
    },
    {
      key: 'v-ace-1',
      classKey: 'ace-4w',
      fleetSeq: 10,
      modelYear: 2023,
      odometer: 67800,
      operationalStatus: 'available',
      isActive: true,
      profileIndex: 0,
      chassisPrefix: 'MAT448',
    },
    {
      key: 'v-ace-2',
      classKey: 'ace-4w',
      fleetSeq: 11,
      modelYear: 2024,
      odometer: 44100,
      operationalStatus: 'retired',
      isActive: false,
      profileIndex: 2,
      chassisPrefix: 'MAT448',
    },
  ];

  const vehicleIds = new Map<string, string>();
  for (const plan of vehiclePlan) {
    const classRef = assetClassIds.get(plan.classKey);
    if (!classRef) continue;

    const fleetCode = formatLocalFleetCode(plan.fleetSeq);
    const profile = profiles[plan.profileIndex] ?? profiles[0];

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
      bump('vehicles', false);
      continue;
    }

    const chassisNumber = `${plan.chassisPrefix}${String(100000000000000 + plan.fleetSeq).slice(-12)}`;

    const [row] = await db
      .insert(assetRegisterVehicles)
      .values({
        organizationId,
        assetClassId: classRef.id,
        assetMasterId: null,
        fleetCode,
        registrationNumber: formatPuneRegistration(plan.fleetSeq),
        chassisNumber,
        modelYear: plan.modelYear,
        odometer: plan.odometer,
        registrationStartDate: '2023-04-01',
        registrationEndDate: profile.registrationEndDate,
        insuranceStartDate: '2025-04-01',
        insuranceEndDate: profile.insuranceEndDate,
        insurancePremium: '12450.00',
        warrantyStartDate: '2023-04-01',
        warrantyEndDate: profile.warrantyEndDate,
        specialNotes: LOCAL_ASSET_REGISTER_DEMO_SEED_SOURCE,
        operationalStatus: plan.operationalStatus,
        isActive: plan.isActive,
      })
      .returning({ id: assetRegisterVehicles.id });

    vehicleIds.set(plan.key, row.id);
    bump('vehicles', true);
  }

  const orgClientName = 'Freshkart Retail Pune';
  let organisationClientId: string | null = null;
  const [existingOrgClient] = await db
    .select({ id: organisationClients.id })
    .from(organisationClients)
    .where(
      and(
        eq(organisationClients.organizationId, organizationId),
        eq(organisationClients.name, orgClientName),
      ),
    )
    .limit(1);

  if (existingOrgClient) {
    organisationClientId = existingOrgClient.id;
    bump('organisationClients', false);
  } else {
    const [orgClientRow] = await db
      .insert(organisationClients)
      .values({
        organizationId,
        name: orgClientName,
        addressLine1: 'Plot 18, Hinjawadi Phase 2',
        addressCity: 'Pune',
        addressState: 'Maharashtra',
        addressDistrict: 'Pune',
        addressPincode: '411057',
        addressCountry: 'IN',
        isActive: true,
      })
      .returning({ id: organisationClients.id });
    organisationClientId = orgClientRow.id;
    bump('organisationClients', true);
  }

  const fleetClientCode = formatLocalFleetClientCode();
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
    bump('fleetClients', false);
  } else {
    const [fleetClientRow] = await db
      .insert(fleetClients)
      .values({
        organizationId,
        clientCode: fleetClientCode,
        companyName: orgClientName,
        taxId: '27AABCF1234E1Z5',
        address: 'Plot 18, Hinjawadi Phase 2, Pune 411057',
        organisationClientId,
        isActive: true,
      })
      .returning({ id: fleetClients.id });
    fleetClientId = fleetClientRow.id;
    bump('fleetClients', true);
  }

  const leaseSeeds = [
    {
      contractNumber: formatLocalLeaseContractNumber(1),
      classKey: 'activa-2w' as const,
      vehicleKeys: ['v-activa-2'] as const,
    },
    {
      contractNumber: formatLocalLeaseContractNumber(2),
      classKey: 'bajaj-re-3w' as const,
      vehicleKeys: ['v-re-1', 'v-euler-2'] as const,
    },
  ];

  for (const leaseSeed of leaseSeeds) {
    const classRef = assetClassIds.get(leaseSeed.classKey);
    if (!classRef || !fleetClientId) continue;

    const [existingContract] = await db
      .select({ id: leaseContracts.id })
      .from(leaseContracts)
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          eq(leaseContracts.contractNumber, leaseSeed.contractNumber),
        ),
      )
      .limit(1);

    let contractId: string;
    if (existingContract) {
      contractId = existingContract.id;
      bump('leaseContracts', false);
    } else {
      const [contractRow] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: leaseSeed.contractNumber,
          clientId: fleetClientId,
          status: 'active',
          startDate: new Date('2025-04-01T00:00:00.000Z'),
          endDate: new Date('2028-03-31T00:00:00.000Z'),
          termMonths: 36,
          securityDeposit: '75000.00',
          billingFrequency: 'monthly',
          description: LOCAL_ASSET_REGISTER_DEMO_SEED_SOURCE,
        })
        .returning({ id: leaseContracts.id });
      contractId = contractRow.id;
      bump('leaseContracts', true);

      const assetClassLabel = classRef.name.slice(0, 64);
      await db
        .insert(leaseContractAssetLines)
        .values({
          contractId,
          assetClass: assetClassLabel,
          committedQuantity: leaseSeed.vehicleKeys.length,
          ratePerVehicleMonth: '14500.00',
          availabilityCovered: true,
          availabilityStatus: 'covered',
          availableNowCount: leaseSeed.vehicleKeys.length,
          sortOrder: 0,
        })
        .onConflictDoNothing({
          target: [
            leaseContractAssetLines.contractId,
            leaseContractAssetLines.assetClass,
          ],
        });
    }

    for (const vehicleKey of leaseSeed.vehicleKeys) {
      const vehicleId = vehicleIds.get(vehicleKey);
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

      if (existingAssignment) {
        bump('assignments', false);
        continue;
      }

      await db.insert(assetRegisterVehicleAssignments).values({
        organizationId,
        vehicleId,
        leaseContractId: contractId,
        fleetClientId,
        organisationClientId,
      });
      await db
        .update(assetRegisterVehicles)
        .set({ operationalStatus: 'leased' })
        .where(eq(assetRegisterVehicles.id, vehicleId));
      bump('assignments', true);
    }
  }

  return {
    seedSource: LOCAL_ASSET_REGISTER_DEMO_SEED_SOURCE,
    organizationId,
    organizationSlug: DEV_ORG_SLUG,
    inserted,
    skipped,
  };
}
