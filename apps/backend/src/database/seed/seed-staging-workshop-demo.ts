/**
 * Staging RDS — Workshop module demo (cross-linked to interconnected seed).
 *
 *   $env:APP_ENV='staging'
 *   $env:SEED_STAGING_DEMO='1'
 *   $env:DATABASE_URL='<from samconfig.staging.toml ParameterOverrides DATABASE_URL>'
 *   npm run db:seed:staging-workshop-demo -w backend
 *
 * Or run full interconnected seed (includes workshop at the end):
 *   npx ts-node -r tsconfig-paths/register src/database/seed/seed-staging-interconnected-demo.ts
 */
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { buildAssetClassNameFromSpec } from '../../modules/asset-register/utils/asset-class-name.util';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  assetRegisterAssetClasses,
  assetRegisterVehicles,
} from '../schema/asset-register.schema';
import { inventoryCatalogParts } from '../schema/finance.schema';
import { organisationEmployees } from '../schema/organisation.schema';
import {
  workshopAmcSubscribers,
  workshopAmcTiers,
  workshopLaborJobCardParts,
  workshopLaborJobCards,
  workshopMaintenanceSchedules,
  workshopWorkOrderLaborLines,
  workshopWorkOrderNumberSequences,
  workshopWorkOrderOverdueLogs,
  workshopWorkOrderPartLines,
  workshopWorkOrders,
} from '../schema/workshop.schema';
import { organizations } from '../schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';
import {
  assertStagingDemoSeedAllowed,
  maskDatabaseUrl,
  resolveStagingDatabaseUrl,
  STAGING_DEMO_SEED_SOURCE,
  STAGING_WORKSHOP_DEMO_SEED_SOURCE,
} from './staging-demo-guards';

type AppDb = NodePgDatabase<typeof schema>;

const SEED_DOC_YEAR = 2026;

const DEMO_WO_NUMBERS = [
  'WO-2026-0101',
  'WO-2026-0102',
  'WO-2026-0103',
] as const;

const AMC_TIER_NAMES = [
  'STDEMO-AMC-Silver',
  'STDEMO-AMC-Gold',
  'STDEMO-AMC-Platinum',
] as const;

const LABOR_CARD_NAMES = [
  'STDEMO — LCV Periodic Service',
  'STDEMO — Brake & Clutch Pack',
] as const;

const PM_SCHEDULE_NAME = 'Fleet Odometer PM — Leased LCV';

function formatFleetCode(seq: number): string {
  return `GF-FLT-${1000 + seq}`;
}

function formatPartCode(seq: number): string {
  return `SP-${SEED_DOC_YEAR}-${String(seq).padStart(3, '0')}`;
}

function seedNotes(): string {
  return `${STAGING_WORKSHOP_DEMO_SEED_SOURCE} ${STAGING_DEMO_SEED_SOURCE}`;
}

export type WorkshopDemoSeedContext = {
  organizationId: string;
  inserted: Record<string, number>;
  skipped: Record<string, number>;
};

function bumpPair(
  inserted: Record<string, number>,
  skipped: Record<string, number>,
  key: string,
  didInsert: boolean,
): void {
  if (didInsert) {
    inserted[key] = (inserted[key] ?? 0) + 1;
  } else {
    skipped[key] = (skipped[key] ?? 0) + 1;
  }
}

async function resolveOrganizationId(db: AppDb): Promise<string> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) {
    throw new Error(
      `Organization slug "${DEV_ORG_SLUG}" not found — run base seed + interconnected demo first.`,
    );
  }
  return org.id;
}

/** LCV asset class label (matches interconnected seed `lcv-4w-a`). */
function leasedLcvAssetClassLabel(): string {
  return buildAssetClassNameFromSpec({
    manufacturingYear: 2026,
    modelName: 'Ace Gold',
    engineDisplacementCc: 702,
    fuelType: 'Diesel',
    fuelSystem: 'CRDi',
    colorCode: 'wh',
  });
}

export async function seedStagingWorkshopDemo(
  db: AppDb,
  ctx?: Partial<WorkshopDemoSeedContext>,
): Promise<Record<string, number>> {
  const organizationId =
    ctx?.organizationId ?? (await resolveOrganizationId(db));
  const inserted = ctx?.inserted ?? {};
  const skipped = ctx?.skipped ?? {};
  const summary: Record<string, number> = {};

  const technicianEmployeeCodes = [
    'GF-EMP-2025-001',
    'GF-EMP-2025-002',
    'GF-EMP-2025-003',
  ];
  const techRows = await db
    .select({
      id: organisationEmployees.id,
      employeeCode: organisationEmployees.employeeCode,
    })
    .from(organisationEmployees)
    .where(
      and(
        eq(organisationEmployees.organizationId, organizationId),
        inArray(organisationEmployees.employeeCode, technicianEmployeeCodes),
      ),
    );
  if (techRows.length === 0) {
    throw new Error(
      'Demo employees GF-EMP-2025-001..003 not found — run interconnected seed first.',
    );
  }
  await db
    .update(organisationEmployees)
    .set({ isWorkshopTechnician: true })
    .where(
      and(
        eq(organisationEmployees.organizationId, organizationId),
        inArray(
          organisationEmployees.id,
          techRows.map((r) => r.id),
        ),
      ),
    );
  summary.workshopTechniciansUpdated = techRows.length;

  const techByCode = new Map(
    techRows.map((r) => [r.employeeCode, r.id] as const),
  );
  const technicianEmp2 = techByCode.get('GF-EMP-2025-002');

  const fleetCodes = [1, 2, 3, 7].map(formatFleetCode);
  const vehicleRows = await db
    .select({
      id: assetRegisterVehicles.id,
      fleetCode: assetRegisterVehicles.fleetCode,
      operationalStatus: assetRegisterVehicles.operationalStatus,
      assetClassName: assetRegisterAssetClasses.name,
    })
    .from(assetRegisterVehicles)
    .innerJoin(
      assetRegisterAssetClasses,
      eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
    )
    .where(
      and(
        eq(assetRegisterVehicles.organizationId, organizationId),
        inArray(assetRegisterVehicles.fleetCode, fleetCodes),
      ),
    );
  const vehicleByFleet = new Map(
    vehicleRows.map((r) => [r.fleetCode, r] as const),
  );
  for (const code of fleetCodes) {
    if (!vehicleByFleet.has(code)) {
      throw new Error(
        `Vehicle ${code} not found — run interconnected seed first.`,
      );
    }
  }

  const lcvClassLabel = leasedLcvAssetClassLabel();
  const v7 = vehicleByFleet.get(formatFleetCode(7))!;
  await db
    .update(assetRegisterVehicles)
    .set({ odometer: 18500, operationalStatus: 'leased' })
    .where(eq(assetRegisterVehicles.id, v7.id));

  const v9Fleet = formatFleetCode(9);
  const [v9Row] = await db
    .select({
      id: assetRegisterVehicles.id,
      assetClassName: assetRegisterAssetClasses.name,
    })
    .from(assetRegisterVehicles)
    .innerJoin(
      assetRegisterAssetClasses,
      eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
    )
    .where(
      and(
        eq(assetRegisterVehicles.organizationId, organizationId),
        eq(assetRegisterVehicles.fleetCode, v9Fleet),
      ),
    )
    .limit(1);
  if (
    v9Row &&
    v9Row.assetClassName.trim().toLowerCase() ===
      lcvClassLabel.trim().toLowerCase()
  ) {
    await db
      .update(assetRegisterVehicles)
      .set({ odometer: 16200, operationalStatus: 'leased' })
      .where(eq(assetRegisterVehicles.id, v9Row.id));
  }

  const partCodes = [1, 2, 3, 4].map(formatPartCode);
  const partRows = await db
    .select({
      id: inventoryCatalogParts.id,
      partCode: inventoryCatalogParts.partCode,
    })
    .from(inventoryCatalogParts)
    .where(
      and(
        eq(inventoryCatalogParts.organizationId, organizationId),
        inArray(inventoryCatalogParts.partCode, partCodes),
      ),
    );
  const partByCode = new Map(partRows.map((r) => [r.partCode, r.id] as const));
  for (const code of partCodes) {
    if (!partByCode.has(code)) {
      throw new Error(
        `Part ${code} not found — run interconnected seed first.`,
      );
    }
  }

  const defaultUnitCostMinor = 45000;

  for (const name of AMC_TIER_NAMES) {
    const [existing] = await db
      .select({ id: workshopAmcTiers.id })
      .from(workshopAmcTiers)
      .where(
        and(
          eq(workshopAmcTiers.organizationId, organizationId),
          eq(workshopAmcTiers.name, name),
        ),
      )
      .limit(1);
    if (existing) {
      bumpPair(inserted, skipped, 'workshopAmcTiers', false);
      continue;
    }
    const priceLabels: Record<(typeof AMC_TIER_NAMES)[number], string> = {
      'STDEMO-AMC-Silver': '₹12,000 / year',
      'STDEMO-AMC-Gold': '₹24,000 / year',
      'STDEMO-AMC-Platinum': '₹38,000 / year',
    };
    await db.insert(workshopAmcTiers).values({
      organizationId,
      name,
      description: seedNotes(),
      priceDisplayLabel: priceLabels[name],
      subscriberCount: 0,
      isActive: true,
    });
    bumpPair(inserted, skipped, 'workshopAmcTiers', true);
  }

  const tierRows = await db
    .select({ id: workshopAmcTiers.id, name: workshopAmcTiers.name })
    .from(workshopAmcTiers)
    .where(
      and(
        eq(workshopAmcTiers.organizationId, organizationId),
        inArray(workshopAmcTiers.name, [...AMC_TIER_NAMES]),
      ),
    );
  const tierByName = new Map(tierRows.map((r) => [r.name, r.id] as const));

  const subscriberSeeds = [
    { fleetSeq: 2, tier: 'STDEMO-AMC-Silver' as const },
    { fleetSeq: 7, tier: 'STDEMO-AMC-Gold' as const },
  ];
  let subscriberInserts = 0;
  for (const sub of subscriberSeeds) {
    const fleetCode = formatFleetCode(sub.fleetSeq);
    const vehicle = vehicleByFleet.get(fleetCode);
    const tierId = tierByName.get(sub.tier);
    if (!vehicle || !tierId) continue;
    const [existing] = await db
      .select({ id: workshopAmcSubscribers.id })
      .from(workshopAmcSubscribers)
      .where(
        and(
          eq(workshopAmcSubscribers.organizationId, organizationId),
          eq(workshopAmcSubscribers.subscriberCode, fleetCode),
        ),
      )
      .limit(1);
    if (existing) {
      bumpPair(inserted, skipped, 'workshopAmcSubscribers', false);
      continue;
    }
    await db.insert(workshopAmcSubscribers).values({
      organizationId,
      amcTierId: tierId,
      vehicleId: vehicle.id,
      subscriberCode: fleetCode,
      isActive: true,
      startedAt: `${SEED_DOC_YEAR}-01-15`,
    });
    subscriberInserts += 1;
    bumpPair(inserted, skipped, 'workshopAmcSubscribers', true);
  }
  if (subscriberInserts > 0) {
    for (const tier of tierRows) {
      const countRow = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(workshopAmcSubscribers)
        .where(
          and(
            eq(workshopAmcSubscribers.organizationId, organizationId),
            eq(workshopAmcSubscribers.amcTierId, tier.id),
            eq(workshopAmcSubscribers.isActive, true),
          ),
        );
      await db
        .update(workshopAmcTiers)
        .set({ subscriberCount: countRow[0]?.n ?? 0 })
        .where(eq(workshopAmcTiers.id, tier.id));
    }
  }

  let scheduleId: string;
  const [existingSchedule] = await db
    .select({ id: workshopMaintenanceSchedules.id })
    .from(workshopMaintenanceSchedules)
    .where(
      and(
        eq(workshopMaintenanceSchedules.organizationId, organizationId),
        eq(workshopMaintenanceSchedules.name, PM_SCHEDULE_NAME),
      ),
    )
    .limit(1);
  if (existingSchedule) {
    scheduleId = existingSchedule.id;
    bumpPair(inserted, skipped, 'workshopMaintenanceSchedules', false);
    await db
      .update(workshopMaintenanceSchedules)
      .set({
        assetClassLabel: lcvClassLabel,
        intervalLabel: '5000 km',
        maintenanceType: 'Preventive',
        intervalType: 'Odometer',
        vehicleApplicability: 'Leased',
        description: seedNotes(),
        vehicleCount: 2,
        thresholdReachedCount: 1,
        isActive: true,
      })
      .where(eq(workshopMaintenanceSchedules.id, scheduleId));
  } else {
    const [row] = await db
      .insert(workshopMaintenanceSchedules)
      .values({
        organizationId,
        name: PM_SCHEDULE_NAME,
        assetClassLabel: lcvClassLabel,
        intervalLabel: '5000 km',
        maintenanceType: 'Preventive',
        intervalType: 'Odometer',
        vehicleApplicability: 'Leased',
        description: seedNotes(),
        vehicleCount: 2,
        thresholdReachedCount: 1,
        isActive: true,
      })
      .returning({ id: workshopMaintenanceSchedules.id });
    scheduleId = row.id;
    bumpPair(inserted, skipped, 'workshopMaintenanceSchedules', true);
  }

  const laborCardIds = new Map<string, string>();
  const laborCardSpecs = [
    {
      name: LABOR_CARD_NAMES[0],
      laborChargeMinor: 850000,
      parts: [
        { partSeq: 1, qty: 1 },
        { partSeq: 3, qty: 1 },
      ],
    },
    {
      name: LABOR_CARD_NAMES[1],
      laborChargeMinor: 1200000,
      parts: [
        { partSeq: 2, qty: 1 },
        { partSeq: 4, qty: 2 },
      ],
    },
  ] as const;

  for (const spec of laborCardSpecs) {
    const [existing] = await db
      .select({ id: workshopLaborJobCards.id })
      .from(workshopLaborJobCards)
      .where(
        and(
          eq(workshopLaborJobCards.organizationId, organizationId),
          eq(workshopLaborJobCards.name, spec.name),
        ),
      )
      .limit(1);
    let cardId: string;
    if (existing) {
      cardId = existing.id;
      bumpPair(inserted, skipped, 'workshopLaborJobCards', false);
      await db
        .update(workshopLaborJobCards)
        .set({
          description: seedNotes(),
          laborChargeMinor: spec.laborChargeMinor,
          isActive: true,
        })
        .where(eq(workshopLaborJobCards.id, cardId));
    } else {
      const [row] = await db
        .insert(workshopLaborJobCards)
        .values({
          organizationId,
          name: spec.name,
          description: seedNotes(),
          laborChargeMinor: spec.laborChargeMinor,
          isActive: true,
        })
        .returning({ id: workshopLaborJobCards.id });
      cardId = row.id;
      bumpPair(inserted, skipped, 'workshopLaborJobCards', true);
    }
    laborCardIds.set(spec.name, cardId);

    for (const line of spec.parts) {
      const partId = partByCode.get(formatPartCode(line.partSeq));
      if (!partId) continue;
      const [existingPart] = await db
        .select({ id: workshopLaborJobCardParts.id })
        .from(workshopLaborJobCardParts)
        .where(
          and(
            eq(workshopLaborJobCardParts.laborJobCardId, cardId),
            eq(workshopLaborJobCardParts.inventoryPartId, partId),
          ),
        )
        .limit(1);
      if (existingPart) {
        bumpPair(inserted, skipped, 'workshopLaborJobCardParts', false);
        continue;
      }
      await db.insert(workshopLaborJobCardParts).values({
        laborJobCardId: cardId,
        inventoryPartId: partId,
        quantity: line.qty,
      });
      bumpPair(inserted, skipped, 'workshopLaborJobCardParts', true);
    }
  }

  const periodicCardId = laborCardIds.get(LABOR_CARD_NAMES[0]);
  const v1 = vehicleByFleet.get(formatFleetCode(1))!;
  const v3 = vehicleByFleet.get(formatFleetCode(3))!;

  type WoSeed = {
    number: (typeof DEMO_WO_NUMBERS)[number];
    status: 'open' | 'in_progress' | 'closed';
    workOrderType: 'general' | 'pm';
    workOrderSource: 'manual' | 'maintenance_schedule';
    vehicleId: string;
    technicianEmployeeId: string | null;
    maintenanceScheduleId: string | null;
    laborJobCardId: string | null;
    odometerReading: number;
    issueDescription: string;
    partLines: Array<{
      partSeq: number;
      qty: number;
      fulfillment: 'reserved' | 'issued';
    }>;
    laborLines: Array<{ description: string; amountMinor: number }>;
    closedAt?: Date;
  };

  const woSeeds: WoSeed[] = [
    {
      number: DEMO_WO_NUMBERS[0],
      status: 'open',
      workOrderType: 'general',
      workOrderSource: 'manual',
      vehicleId: v1.id,
      technicianEmployeeId: null,
      maintenanceScheduleId: null,
      laborJobCardId: null,
      odometerReading: 12400,
      issueDescription: 'Intermittent starting issue — staging demo',
      partLines: [{ partSeq: 1, qty: 1, fulfillment: 'reserved' }],
      laborLines: [],
    },
    {
      number: DEMO_WO_NUMBERS[1],
      status: 'in_progress',
      workOrderType: 'general',
      workOrderSource: 'manual',
      vehicleId: v3.id,
      technicianEmployeeId: technicianEmp2 ?? null,
      maintenanceScheduleId: null,
      laborJobCardId: periodicCardId ?? null,
      odometerReading: 12600,
      issueDescription: 'Workshop bay repair — brake noise',
      partLines: [
        { partSeq: 2, qty: 1, fulfillment: 'issued' },
        { partSeq: 4, qty: 1, fulfillment: 'reserved' },
      ],
      laborLines: [
        { description: 'Brake inspection & adjustment', amountMinor: 650000 },
      ],
    },
    {
      number: DEMO_WO_NUMBERS[2],
      status: 'closed',
      workOrderType: 'pm',
      workOrderSource: 'maintenance_schedule',
      vehicleId: v7.id,
      technicianEmployeeId: techByCode.get('GF-EMP-2025-001') ?? null,
      maintenanceScheduleId: scheduleId,
      laborJobCardId: periodicCardId ?? null,
      odometerReading: 13000,
      issueDescription: 'Scheduled odometer PM — leased LCV',
      partLines: [{ partSeq: 3, qty: 1, fulfillment: 'issued' }],
      laborLines: [
        { description: 'Periodic service (template)', amountMinor: 850000 },
      ],
      closedAt: new Date(`${SEED_DOC_YEAR}-03-10T10:30:00.000Z`),
    },
  ];

  for (const wo of woSeeds) {
    let partsTotal = 0;
    for (const pl of wo.partLines) {
      partsTotal += defaultUnitCostMinor * pl.qty;
    }
    let laborTotal = 0;
    for (const ll of wo.laborLines) {
      laborTotal += ll.amountMinor;
    }
    const netTotal = partsTotal + laborTotal;

    const [existingWo] = await db
      .select({ id: workshopWorkOrders.id })
      .from(workshopWorkOrders)
      .where(
        and(
          eq(workshopWorkOrders.organizationId, organizationId),
          eq(workshopWorkOrders.workOrderNumber, wo.number),
        ),
      )
      .limit(1);

    let workOrderId: string;
    if (existingWo) {
      workOrderId = existingWo.id;
      bumpPair(inserted, skipped, 'workshopWorkOrders', false);
      await db
        .update(workshopWorkOrders)
        .set({
          status: wo.status,
          workOrderType: wo.workOrderType,
          workOrderSource: wo.workOrderSource,
          vehicleId: wo.vehicleId,
          technicianEmployeeId: wo.technicianEmployeeId,
          maintenanceScheduleId: wo.maintenanceScheduleId,
          laborJobCardId: wo.laborJobCardId,
          odometerReading: wo.odometerReading,
          issueDescription: wo.issueDescription,
          notes: seedNotes(),
          partsTotalMinor: partsTotal,
          laborTotalMinor: laborTotal,
          netTotalMinor: netTotal,
          closedAt: wo.closedAt ?? null,
          expectedCompletionDate: `${SEED_DOC_YEAR}-04-15`,
        })
        .where(eq(workshopWorkOrders.id, workOrderId));
    } else {
      const [row] = await db
        .insert(workshopWorkOrders)
        .values({
          organizationId,
          workOrderNumber: wo.number,
          status: wo.status,
          workOrderType: wo.workOrderType,
          workOrderSource: wo.workOrderSource,
          vehicleId: wo.vehicleId,
          technicianEmployeeId: wo.technicianEmployeeId,
          maintenanceScheduleId: wo.maintenanceScheduleId,
          laborJobCardId: wo.laborJobCardId,
          odometerReading: wo.odometerReading,
          issueDescription: wo.issueDescription,
          notes: seedNotes(),
          partsTotalMinor: partsTotal,
          laborTotalMinor: laborTotal,
          netTotalMinor: netTotal,
          closedAt: wo.closedAt ?? null,
          expectedCompletionDate: `${SEED_DOC_YEAR}-04-15`,
          reportedBy: 'Fleet Ops',
        })
        .returning({ id: workshopWorkOrders.id });
      workOrderId = row.id;
      bumpPair(inserted, skipped, 'workshopWorkOrders', true);
    }

    const existingPartLines = await db
      .select({ id: workshopWorkOrderPartLines.id })
      .from(workshopWorkOrderPartLines)
      .where(eq(workshopWorkOrderPartLines.workOrderId, workOrderId));
    if (existingPartLines.length === 0) {
      for (const pl of wo.partLines) {
        const partId = partByCode.get(formatPartCode(pl.partSeq));
        if (!partId) continue;
        await db.insert(workshopWorkOrderPartLines).values({
          workOrderId,
          inventoryPartId: partId,
          quantity: pl.qty,
          unitCostMinor: defaultUnitCostMinor,
          lineSource: wo.laborJobCardId ? 'template' : 'additional',
          fulfillmentStatus: pl.fulfillment,
        });
        bumpPair(inserted, skipped, 'workshopWorkOrderPartLines', true);
      }
    } else {
      bumpPair(inserted, skipped, 'workshopWorkOrderPartLines', false);
    }

    const existingLaborLines = await db
      .select({ id: workshopWorkOrderLaborLines.id })
      .from(workshopWorkOrderLaborLines)
      .where(eq(workshopWorkOrderLaborLines.workOrderId, workOrderId));
    if (existingLaborLines.length === 0) {
      for (const ll of wo.laborLines) {
        await db.insert(workshopWorkOrderLaborLines).values({
          workOrderId,
          description: ll.description,
          amountMinor: ll.amountMinor,
          lineSource: wo.laborJobCardId ? 'template' : 'additional',
        });
        bumpPair(inserted, skipped, 'workshopWorkOrderLaborLines', true);
      }
    } else {
      bumpPair(inserted, skipped, 'workshopWorkOrderLaborLines', false);
    }
  }

  const lastSeq = 103;
  const [existingSeq] = await db
    .select({ lastSeq: workshopWorkOrderNumberSequences.lastSeq })
    .from(workshopWorkOrderNumberSequences)
    .where(
      and(
        eq(workshopWorkOrderNumberSequences.organizationId, organizationId),
        eq(workshopWorkOrderNumberSequences.year, SEED_DOC_YEAR),
      ),
    )
    .limit(1);
  if (!existingSeq) {
    await db.insert(workshopWorkOrderNumberSequences).values({
      organizationId,
      year: SEED_DOC_YEAR,
      lastSeq,
    });
    bumpPair(inserted, skipped, 'workshopWorkOrderNumberSequences', true);
  } else if (existingSeq.lastSeq < lastSeq) {
    await db
      .update(workshopWorkOrderNumberSequences)
      .set({ lastSeq })
      .where(
        and(
          eq(workshopWorkOrderNumberSequences.organizationId, organizationId),
          eq(workshopWorkOrderNumberSequences.year, SEED_DOC_YEAR),
        ),
      );
    bumpPair(inserted, skipped, 'workshopWorkOrderNumberSequences', false);
  }

  summary.workshopSeedSource = 1;
  for (const [key, value] of Object.entries(inserted)) {
    if (key.startsWith('workshop')) {
      summary[`inserted_${key}`] = value;
    }
  }
  for (const [key, value] of Object.entries(skipped)) {
    if (key.startsWith('workshop')) {
      summary[`skipped_${key}`] = value;
    }
  }
  return summary;
}

export async function purgeStagingWorkshopDemo(
  db: AppDb,
  organizationId: string,
  bump: (key: string, n: number) => void,
): Promise<void> {
  const markers = [STAGING_WORKSHOP_DEMO_SEED_SOURCE, STAGING_DEMO_SEED_SOURCE];
  const notesMatch = (column: unknown) =>
    or(...markers.map((m) => sql`${column}::text LIKE ${`%${m}%`}`));

  const demoWoRows = await db
    .select({ id: workshopWorkOrders.id })
    .from(workshopWorkOrders)
    .where(
      and(
        eq(workshopWorkOrders.organizationId, organizationId),
        or(
          notesMatch(workshopWorkOrders.notes),
          inArray(workshopWorkOrders.workOrderNumber, [...DEMO_WO_NUMBERS]),
          sql`${workshopWorkOrders.workOrderNumber} LIKE 'STDEMO-WO-%'`,
        ),
      ),
    );
  const demoWoIds = demoWoRows.map((r) => r.id);

  if (demoWoIds.length > 0) {
    const overdueDel = await db
      .delete(workshopWorkOrderOverdueLogs)
      .where(inArray(workshopWorkOrderOverdueLogs.workOrderId, demoWoIds))
      .returning({ id: workshopWorkOrderOverdueLogs.id });
    bump('workshopWorkOrderOverdueLogs', overdueDel.length);

    const partLineDel = await db
      .delete(workshopWorkOrderPartLines)
      .where(inArray(workshopWorkOrderPartLines.workOrderId, demoWoIds))
      .returning({ id: workshopWorkOrderPartLines.id });
    bump('workshopWorkOrderPartLines', partLineDel.length);

    const laborLineDel = await db
      .delete(workshopWorkOrderLaborLines)
      .where(inArray(workshopWorkOrderLaborLines.workOrderId, demoWoIds))
      .returning({ id: workshopWorkOrderLaborLines.id });
    bump('workshopWorkOrderLaborLines', laborLineDel.length);

    const woDel = await db
      .delete(workshopWorkOrders)
      .where(inArray(workshopWorkOrders.id, demoWoIds))
      .returning({ id: workshopWorkOrders.id });
    bump('workshopWorkOrders', woDel.length);
  }

  const demoTierRows = await db
    .select({ id: workshopAmcTiers.id })
    .from(workshopAmcTiers)
    .where(
      and(
        eq(workshopAmcTiers.organizationId, organizationId),
        or(
          sql`${workshopAmcTiers.name} LIKE 'STDEMO-AMC-%'`,
          notesMatch(workshopAmcTiers.description),
        ),
      ),
    );
  const demoTierIds = demoTierRows.map((r) => r.id);

  if (demoTierIds.length > 0) {
    const subDel = await db
      .delete(workshopAmcSubscribers)
      .where(
        and(
          eq(workshopAmcSubscribers.organizationId, organizationId),
          inArray(workshopAmcSubscribers.amcTierId, demoTierIds),
        ),
      )
      .returning({ id: workshopAmcSubscribers.id });
    bump('workshopAmcSubscribers', subDel.length);
  }

  const demoScheduleRows = await db
    .select({ id: workshopMaintenanceSchedules.id })
    .from(workshopMaintenanceSchedules)
    .where(
      and(
        eq(workshopMaintenanceSchedules.organizationId, organizationId),
        or(
          eq(workshopMaintenanceSchedules.name, PM_SCHEDULE_NAME),
          notesMatch(workshopMaintenanceSchedules.description),
        ),
      ),
    );
  const demoScheduleIds = demoScheduleRows.map((r) => r.id);
  if (demoScheduleIds.length > 0) {
    const schedDel = await db
      .delete(workshopMaintenanceSchedules)
      .where(inArray(workshopMaintenanceSchedules.id, demoScheduleIds))
      .returning({ id: workshopMaintenanceSchedules.id });
    bump('workshopMaintenanceSchedules', schedDel.length);
  }

  if (demoTierIds.length > 0) {
    const tierDel = await db
      .delete(workshopAmcTiers)
      .where(inArray(workshopAmcTiers.id, demoTierIds))
      .returning({ id: workshopAmcTiers.id });
    bump('workshopAmcTiers', tierDel.length);
  }

  const demoCardRows = await db
    .select({ id: workshopLaborJobCards.id })
    .from(workshopLaborJobCards)
    .where(
      and(
        eq(workshopLaborJobCards.organizationId, organizationId),
        or(
          sql`${workshopLaborJobCards.name} LIKE 'STDEMO%'`,
          notesMatch(workshopLaborJobCards.description),
        ),
      ),
    );
  const demoCardIds = demoCardRows.map((r) => r.id);
  if (demoCardIds.length > 0) {
    const cardPartDel = await db
      .delete(workshopLaborJobCardParts)
      .where(inArray(workshopLaborJobCardParts.laborJobCardId, demoCardIds))
      .returning({ id: workshopLaborJobCardParts.id });
    bump('workshopLaborJobCardParts', cardPartDel.length);

    const cardDel = await db
      .delete(workshopLaborJobCards)
      .where(inArray(workshopLaborJobCards.id, demoCardIds))
      .returning({ id: workshopLaborJobCards.id });
    bump('workshopLaborJobCards', cardDel.length);
  }

  const remainingDemoWo = await db
    .select({ id: workshopWorkOrders.id })
    .from(workshopWorkOrders)
    .where(
      and(
        eq(workshopWorkOrders.organizationId, organizationId),
        inArray(workshopWorkOrders.workOrderNumber, [...DEMO_WO_NUMBERS]),
      ),
    );
  if (remainingDemoWo.length === 0) {
    const seqDel = await db
      .delete(workshopWorkOrderNumberSequences)
      .where(
        and(
          eq(workshopWorkOrderNumberSequences.organizationId, organizationId),
          eq(workshopWorkOrderNumberSequences.year, SEED_DOC_YEAR),
          sql`${workshopWorkOrderNumberSequences.lastSeq} <= ${103}`,
        ),
      )
      .returning({
        organizationId: workshopWorkOrderNumberSequences.organizationId,
      });
    bump('workshopWorkOrderNumberSequences', seqDel.length);
  }
}

async function runStandalone(): Promise<void> {
  assertStagingDemoSeedAllowed();
  const connectionString = resolveStagingDatabaseUrl();
  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });
  try {
    const inserted: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    const summary = await seedStagingWorkshopDemo(db, { inserted, skipped });
    console.log(
      `Staging workshop demo seed complete (db=${maskDatabaseUrl(connectionString)}).`,
    );
    console.log(JSON.stringify({ summary, inserted, skipped }, null, 2));
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
