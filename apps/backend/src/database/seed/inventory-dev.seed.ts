import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import {
  inventoryCatalogParts,
  inventoryPartsRequests,
  inventoryStockReceipts,
  organisationLocations,
  organizations,
} from '../schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';

type AppDb = NodePgDatabase<typeof schema>;

const SEED_MARKER = 'inventory-dev-seed-v1';

/** Idempotent dev data for Inventory Phase 2 local QA. */
export async function seedInventoryDevData(db: AppDb): Promise<void> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) return;

  const [location] = await db
    .select({ id: organisationLocations.id })
    .from(organisationLocations)
    .where(eq(organisationLocations.organizationId, org.id))
    .limit(1);
  if (!location) return;

  const [existingPart] = await db
    .select({ id: inventoryCatalogParts.id })
    .from(inventoryCatalogParts)
    .where(eq(inventoryCatalogParts.organizationId, org.id))
    .limit(1);

  let partId = existingPart?.id;
  if (!partId) {
    const inserted = await db
      .insert(inventoryCatalogParts)
      .values({
        organizationId: org.id,
        name: `${SEED_MARKER} Brake Pad Set`,
        partCode: 'PRT-10018',
        unitOfMeasure: 'Set',
        reorderThreshold: 15,
        retailMarkupPercent: 25,
        wholesaleMarkupPercent: 15,
        compatibleAssetClasses: ['Petrol Scooter — Standard'],
        isActive: true,
      })
      .onConflictDoNothing({
        target: [
          inventoryCatalogParts.organizationId,
          inventoryCatalogParts.name,
        ],
      })
      .returning({ id: inventoryCatalogParts.id });
    partId = inserted[0]?.id;
    if (!partId) {
      const resolved = await db
        .select({ id: inventoryCatalogParts.id })
        .from(inventoryCatalogParts)
        .where(eq(inventoryCatalogParts.organizationId, org.id))
        .limit(1);
      partId = resolved[0]?.id;
    }
  }
  if (!partId) return;

  await db
    .insert(inventoryStockReceipts)
    .values({
      organizationId: org.id,
      receiptNumber: `${SEED_MARKER}-SR-001`,
      partId,
      locationId: location.id,
      purchaseDate: '2026-01-15',
      quantityReceived: 40,
      unitCostMinor: 150000,
      batchLotReference: 'LOT-DEV-001',
      notes: SEED_MARKER,
      isActive: true,
    })
    .onConflictDoNothing({
      target: [
        inventoryStockReceipts.organizationId,
        inventoryStockReceipts.receiptNumber,
      ],
    });

  await db
    .insert(inventoryPartsRequests)
    .values({
      organizationId: org.id,
      requestNumber: `${SEED_MARKER}-PR-001`,
      workOrderRef: 'WO-2026-1163',
      partId,
      locationId: location.id,
      quantityRequested: 2,
      requestType: 'internal',
      vehicleRef: 'VH-1013',
      status: 'blocked',
      compatibilityOk: true,
    })
    .onConflictDoNothing({
      target: [
        inventoryPartsRequests.organizationId,
        inventoryPartsRequests.requestNumber,
      ],
    });
}
