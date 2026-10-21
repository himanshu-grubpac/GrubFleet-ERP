import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import {
  assetRegisterAssetClasses,
  assetRegisterAssetClassIdCounters,
  assetRegisterAssetMasters,
  assetRegisterFleetCodeCounters,
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
  fleetApprovalRequests,
  fleetClientPocs,
  fleetClients,
  fleetDamageRecords,
  fleetReturnInspections,
  fleetVehicleAllocations,
  fleetVehicles,
  leaseContractEditLogs,
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
  organisationSuppliers,
} from '../schema/organisation.schema';
import {
  workshopAmcSubscribers,
  workshopAmcTiers,
  workshopLaborJobCardParts,
  workshopLaborJobCards,
  workshopMaintenanceSchedules,
  workshopWorkOrderLaborLines,
  workshopWorkOrderOverdueLogs,
  workshopWorkOrderPartLines,
  workshopWorkOrders,
} from '../schema/workshop.schema';
import { organizations } from '../schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';

type AppDb = NodePgDatabase<typeof schema>;

function isMissingRelationError(err: unknown): boolean {
  const cause = (err as { cause?: { code?: string } })?.cause;
  return cause?.code === '42P01';
}

async function resolveOrganizationId(db: AppDb): Promise<string> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) {
    throw new Error(
      `Organization slug "${DEV_ORG_SLUG}" not found — cannot purge org business data.`,
    );
  }
  return org.id;
}

/**
 * Removes all module business rows for the dev org on staging nonprod RDS.
 * Preserves users, memberships, roles, permission catalog, and the organization row.
 * Does not delete organisation location type catalog rows.
 */
export async function purgeStagingAllOrgBusinessData(
  db: AppDb,
): Promise<Record<string, number>> {
  const organizationId = await resolveOrganizationId(db);
  const counts: Record<string, number> = {};
  const bump = (key: string, n: number) => {
    if (n > 0) counts[key] = (counts[key] ?? 0) + n;
  };

  const woRows = await db
    .select({ id: workshopWorkOrders.id })
    .from(workshopWorkOrders)
    .where(eq(workshopWorkOrders.organizationId, organizationId));
  const woIds = woRows.map((r) => r.id);
  if (woIds.length > 0) {
    bump(
      'workshopWorkOrderOverdueLogs',
      (
        await db
          .delete(workshopWorkOrderOverdueLogs)
          .where(inArray(workshopWorkOrderOverdueLogs.workOrderId, woIds))
          .returning({ id: workshopWorkOrderOverdueLogs.id })
      ).length,
    );
    bump(
      'workshopWorkOrderPartLines',
      (
        await db
          .delete(workshopWorkOrderPartLines)
          .where(inArray(workshopWorkOrderPartLines.workOrderId, woIds))
          .returning({ id: workshopWorkOrderPartLines.id })
      ).length,
    );
    bump(
      'workshopWorkOrderLaborLines',
      (
        await db
          .delete(workshopWorkOrderLaborLines)
          .where(inArray(workshopWorkOrderLaborLines.workOrderId, woIds))
          .returning({ id: workshopWorkOrderLaborLines.id })
      ).length,
    );
    bump(
      'workshopWorkOrders',
      (
        await db
          .delete(workshopWorkOrders)
          .where(inArray(workshopWorkOrders.id, woIds))
          .returning({ id: workshopWorkOrders.id })
      ).length,
    );
  }

  const cardRows = await db
    .select({ id: workshopLaborJobCards.id })
    .from(workshopLaborJobCards)
    .where(eq(workshopLaborJobCards.organizationId, organizationId));
  const cardIds = cardRows.map((r) => r.id);
  if (cardIds.length > 0) {
    bump(
      'workshopLaborJobCardParts',
      (
        await db
          .delete(workshopLaborJobCardParts)
          .where(inArray(workshopLaborJobCardParts.laborJobCardId, cardIds))
          .returning({ id: workshopLaborJobCardParts.id })
      ).length,
    );
    bump(
      'workshopLaborJobCards',
      (
        await db
          .delete(workshopLaborJobCards)
          .where(inArray(workshopLaborJobCards.id, cardIds))
          .returning({ id: workshopLaborJobCards.id })
      ).length,
    );
  }

  bump(
    'workshopAmcSubscribers',
    (
      await db
        .delete(workshopAmcSubscribers)
        .where(eq(workshopAmcSubscribers.organizationId, organizationId))
        .returning({ id: workshopAmcSubscribers.id })
    ).length,
  );
  bump(
    'workshopMaintenanceSchedules',
    (
      await db
        .delete(workshopMaintenanceSchedules)
        .where(eq(workshopMaintenanceSchedules.organizationId, organizationId))
        .returning({ id: workshopMaintenanceSchedules.id })
    ).length,
  );
  bump(
    'workshopAmcTiers',
    (
      await db
        .delete(workshopAmcTiers)
        .where(eq(workshopAmcTiers.organizationId, organizationId))
        .returning({ id: workshopAmcTiers.id })
    ).length,
  );

  const invRows = await db
    .select({ id: financeInvoices.id })
    .from(financeInvoices)
    .where(eq(financeInvoices.organizationId, organizationId));
  const invIds = invRows.map((r) => r.id);
  if (invIds.length > 0) {
    bump(
      'financeInvoicePayments',
      (
        await db
          .delete(financeInvoicePayments)
          .where(inArray(financeInvoicePayments.invoiceId, invIds))
          .returning({ id: financeInvoicePayments.id })
      ).length,
    );
    bump(
      'financeInvoiceLines',
      (
        await db
          .delete(financeInvoiceLines)
          .where(inArray(financeInvoiceLines.invoiceId, invIds))
          .returning({ id: financeInvoiceLines.id })
      ).length,
    );
    bump(
      'financeInvoices',
      (
        await db
          .delete(financeInvoices)
          .where(inArray(financeInvoices.id, invIds))
          .returning({ id: financeInvoices.id })
      ).length,
    );
  }

  bump(
    'inventoryPartsRequests',
    (
      await db
        .delete(inventoryPartsRequests)
        .where(eq(inventoryPartsRequests.organizationId, organizationId))
        .returning({ id: inventoryPartsRequests.id })
    ).length,
  );
  bump(
    'inventoryStockReceipts',
    (
      await db
        .delete(inventoryStockReceipts)
        .where(eq(inventoryStockReceipts.organizationId, organizationId))
        .returning({ id: inventoryStockReceipts.id })
    ).length,
  );

  const partRows = await db
    .select({ id: inventoryCatalogParts.id })
    .from(inventoryCatalogParts)
    .where(eq(inventoryCatalogParts.organizationId, organizationId));
  const partIds = partRows.map((r) => r.id);
  if (partIds.length > 0) {
    await db
      .delete(workshopWorkOrderPartLines)
      .where(inArray(workshopWorkOrderPartLines.inventoryPartId, partIds));
    await db
      .delete(workshopLaborJobCardParts)
      .where(inArray(workshopLaborJobCardParts.inventoryPartId, partIds));
    bump(
      'inventoryCatalogParts',
      (
        await db
          .delete(inventoryCatalogParts)
          .where(inArray(inventoryCatalogParts.id, partIds))
          .returning({ id: inventoryCatalogParts.id })
      ).length,
    );
  }

  bump(
    'fleetVehicleAllocations',
    (
      await db
        .delete(fleetVehicleAllocations)
        .where(eq(fleetVehicleAllocations.organizationId, organizationId))
        .returning({ id: fleetVehicleAllocations.id })
    ).length,
  );
  bump(
    'fleetApprovalRequests',
    (
      await db
        .delete(fleetApprovalRequests)
        .where(eq(fleetApprovalRequests.organizationId, organizationId))
        .returning({ id: fleetApprovalRequests.id })
    ).length,
  );
  bump(
    'fleetReturnInspections',
    (
      await db
        .delete(fleetReturnInspections)
        .where(eq(fleetReturnInspections.organizationId, organizationId))
        .returning({ id: fleetReturnInspections.id })
    ).length,
  );
  bump(
    'fleetDamageRecords',
    (
      await db
        .delete(fleetDamageRecords)
        .where(eq(fleetDamageRecords.organizationId, organizationId))
        .returning({ id: fleetDamageRecords.id })
    ).length,
  );
  bump(
    'leaseContractEditLogs',
    (
      await db
        .delete(leaseContractEditLogs)
        .where(eq(leaseContractEditLogs.organizationId, organizationId))
        .returning({ id: leaseContractEditLogs.id })
    ).length,
  );

  const contractRows = await db
    .select({ id: leaseContracts.id })
    .from(leaseContracts)
    .where(eq(leaseContracts.organizationId, organizationId));
  const contractIds = contractRows.map((r) => r.id);
  if (contractIds.length > 0) {
    bump(
      'leaseContracts',
      (
        await db
          .delete(leaseContracts)
          .where(inArray(leaseContracts.id, contractIds))
          .returning({ id: leaseContracts.id })
      ).length,
    );
  }

  bump(
    'assetRegisterVehicleAssignments',
    (
      await db
        .delete(assetRegisterVehicleAssignments)
        .where(
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
        )
        .returning({ id: assetRegisterVehicleAssignments.id })
    ).length,
  );

  const arVehicleRows = await db
    .select({ id: assetRegisterVehicles.id })
    .from(assetRegisterVehicles)
    .where(eq(assetRegisterVehicles.organizationId, organizationId));
  const arVehicleIds = arVehicleRows.map((r) => r.id);
  if (arVehicleIds.length > 0) {
    await db
      .update(financeInvoiceLines)
      .set({ vehicleId: null })
      .where(inArray(financeInvoiceLines.vehicleId, arVehicleIds));
    bump(
      'assetRegisterVehicles',
      (
        await db
          .delete(assetRegisterVehicles)
          .where(inArray(assetRegisterVehicles.id, arVehicleIds))
          .returning({ id: assetRegisterVehicles.id })
      ).length,
    );
  }

  bump(
    'assetRegisterAssetMasters',
    (
      await db
        .delete(assetRegisterAssetMasters)
        .where(eq(assetRegisterAssetMasters.organizationId, organizationId))
        .returning({ id: assetRegisterAssetMasters.id })
    ).length,
  );
  bump(
    'assetRegisterAssetClasses',
    (
      await db
        .delete(assetRegisterAssetClasses)
        .where(eq(assetRegisterAssetClasses.organizationId, organizationId))
        .returning({ id: assetRegisterAssetClasses.id })
    ).length,
  );
  try {
    bump(
      'assetRegisterFleetCodeCounters',
      (
        await db
          .delete(assetRegisterFleetCodeCounters)
          .where(
            eq(assetRegisterFleetCodeCounters.organizationId, organizationId),
          )
          .returning({
            organizationId: assetRegisterFleetCodeCounters.organizationId,
          })
      ).length,
    );
  } catch (err: unknown) {
    if (!isMissingRelationError(err)) throw err;
  }
  try {
    bump(
      'assetRegisterAssetClassIdCounters',
      (
        await db
          .delete(assetRegisterAssetClassIdCounters)
          .where(
            eq(
              assetRegisterAssetClassIdCounters.organizationId,
              organizationId,
            ),
          )
          .returning({
            organizationId: assetRegisterAssetClassIdCounters.organizationId,
          })
      ).length,
    );
  } catch (err: unknown) {
    if (!isMissingRelationError(err)) throw err;
  }

  bump(
    'fleetVehicles',
    (
      await db
        .delete(fleetVehicles)
        .where(eq(fleetVehicles.organizationId, organizationId))
        .returning({ id: fleetVehicles.id })
    ).length,
  );

  const fleetClientRows = await db
    .select({ id: fleetClients.id })
    .from(fleetClients)
    .where(eq(fleetClients.organizationId, organizationId));
  const fleetClientIds = fleetClientRows.map((r) => r.id);
  if (fleetClientIds.length > 0) {
    bump(
      'fleetClientPocs',
      (
        await db
          .delete(fleetClientPocs)
          .where(inArray(fleetClientPocs.clientId, fleetClientIds))
          .returning({ id: fleetClientPocs.id })
      ).length,
    );
    bump(
      'fleetClients',
      (
        await db
          .delete(fleetClients)
          .where(inArray(fleetClients.id, fleetClientIds))
          .returning({ id: fleetClients.id })
      ).length,
    );
  }

  await db
    .update(organisationLocations)
    .set({ responsibleEmployeeId: null, deputyEmployeeId: null })
    .where(eq(organisationLocations.organizationId, organizationId));

  bump(
    'organisationDrivers',
    (
      await db
        .delete(organisationDrivers)
        .where(eq(organisationDrivers.organizationId, organizationId))
        .returning({ id: organisationDrivers.id })
    ).length,
  );

  const orgClientRows = await db
    .select({ id: organisationClients.id })
    .from(organisationClients)
    .where(eq(organisationClients.organizationId, organizationId));
  const orgClientIds = orgClientRows.map((r) => r.id);
  if (orgClientIds.length > 0) {
    bump(
      'organisationClientPocs',
      (
        await db
          .delete(organisationClientPocs)
          .where(inArray(organisationClientPocs.clientId, orgClientIds))
          .returning({ id: organisationClientPocs.id })
      ).length,
    );
    bump(
      'organisationClients',
      (
        await db
          .delete(organisationClients)
          .where(inArray(organisationClients.id, orgClientIds))
          .returning({ id: organisationClients.id })
      ).length,
    );
  }

  bump(
    'organisationEmployees',
    (
      await db
        .delete(organisationEmployees)
        .where(eq(organisationEmployees.organizationId, organizationId))
        .returning({ id: organisationEmployees.id })
    ).length,
  );
  bump(
    'organisationSuppliers',
    (
      await db
        .delete(organisationSuppliers)
        .where(eq(organisationSuppliers.organizationId, organizationId))
        .returning({ id: organisationSuppliers.id })
    ).length,
  );
  bump(
    'organisationLocations',
    (
      await db
        .delete(organisationLocations)
        .where(eq(organisationLocations.organizationId, organizationId))
        .returning({ id: organisationLocations.id })
    ).length,
  );

  return counts;
}
