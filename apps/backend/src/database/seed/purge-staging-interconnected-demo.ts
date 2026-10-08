import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
import { organizations } from '../schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';
import {
  STAGING_DEMO_EMAIL_DOMAIN,
  STAGING_DEMO_LEGACY_SEED_MARKERS,
  STAGING_DEMO_SEED_SOURCE,
  stagingSeedContactEmail,
} from './staging-demo-guards';

type AppDb = NodePgDatabase<typeof schema>;

export type StagingDemoPurgeCounts = Record<string, number>;

function notesMatchSeedMarker(column: unknown) {
  const markers = [
    STAGING_DEMO_SEED_SOURCE,
    ...STAGING_DEMO_LEGACY_SEED_MARKERS,
  ];
  return or(
    ...markers.map((marker) => sql`${column}::text LIKE ${`%${marker}%`}`),
  );
}

function demoEmailSql(column: unknown) {
  return or(
    sql`${column}::text LIKE ${`%${STAGING_DEMO_EMAIL_DOMAIN}`}`,
    sql`${column}::text LIKE ${'%staging.demo.%'}`,
  );
}

async function resolveOrganizationId(db: AppDb): Promise<string> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) {
    throw new Error(
      `Organization slug "${DEV_ORG_SLUG}" not found — cannot purge staging demo data.`,
    );
  }
  return org.id;
}

/**
 * Removes prior staging interconnected demo rows for the dev org only.
 * Preserves dev admin bootstrap (users, roles, system location types).
 */
export async function purgeStagingInterconnectedDemo(
  db: AppDb,
): Promise<StagingDemoPurgeCounts> {
  const organizationId = await resolveOrganizationId(db);
  const counts: StagingDemoPurgeCounts = {};
  const bump = (key: string, n: number) => {
    if (n > 0) counts[key] = (counts[key] ?? 0) + n;
  };

  const seededSiteEmails = [
    stagingSeedContactEmail('location', 'blr-hq'),
    stagingSeedContactEmail('location', 'mum-hub'),
    stagingSeedContactEmail('location', 'del-sales'),
    stagingSeedContactEmail('location', 'hyd-workshop'),
    stagingSeedContactEmail('location', 'chn-retail'),
    stagingSeedContactEmail('location', 'pun-depot'),
    stagingSeedContactEmail('location', 'ahm-yard'),
    stagingSeedContactEmail('location', 'kochi-office'),
    stagingSeedContactEmail('location', 'jaipur-retail'),
    stagingSeedContactEmail('location', 'lko-warehouse'),
    stagingSeedContactEmail('location', 'bbsr-workshop'),
    stagingSeedContactEmail('location', 'indore-other'),
  ];

  const demoInvoiceFilter = and(
    eq(financeInvoices.organizationId, organizationId),
    or(
      notesMatchSeedMarker(financeInvoices.notes),
      notesMatchSeedMarker(financeInvoices.description),
      sql`${financeInvoices.invoiceNumber} LIKE 'STDEMO-%'`,
      sql`${financeInvoices.invoiceNumber} LIKE 'PI-202%-%'`,
      sql`${financeInvoices.invoiceNumber} LIKE 'BI-202%-%'`,
      sql`${financeInvoices.invoiceNumber} LIKE 'SI-202%-%'`,
      sql`${financeInvoices.invoiceNumber} LIKE 'PI-2026-%'`,
      sql`${financeInvoices.invoiceNumber} LIKE 'BI-2026-%'`,
      sql`${financeInvoices.invoiceNumber} LIKE 'SI-2026-%'`,
    ),
  );

  const demoInvoiceRows = await db
    .select({ id: financeInvoices.id })
    .from(financeInvoices)
    .where(demoInvoiceFilter);
  const demoInvoiceIds = demoInvoiceRows.map((r) => r.id);

  if (demoInvoiceIds.length > 0) {
    const payDel = await db
      .delete(financeInvoicePayments)
      .where(
        and(
          eq(financeInvoicePayments.organizationId, organizationId),
          inArray(financeInvoicePayments.invoiceId, demoInvoiceIds),
        ),
      )
      .returning({ id: financeInvoicePayments.id });
    bump('financeInvoicePayments', payDel.length);

    const lineDel = await db
      .delete(financeInvoiceLines)
      .where(inArray(financeInvoiceLines.invoiceId, demoInvoiceIds))
      .returning({ id: financeInvoiceLines.id });
    bump('financeInvoiceLines', lineDel.length);

    const invDel = await db
      .delete(financeInvoices)
      .where(inArray(financeInvoices.id, demoInvoiceIds))
      .returning({ id: financeInvoices.id });
    bump('financeInvoices', invDel.length);
  }

  const demoPaymentDel = await db
    .delete(financeInvoicePayments)
    .where(
      and(
        eq(financeInvoicePayments.organizationId, organizationId),
        or(
          sql`${financeInvoicePayments.paymentNumber} LIKE 'STDEMO-%'`,
          sql`${financeInvoicePayments.paymentNumber} LIKE 'VP-202%-%'`,
          sql`${financeInvoicePayments.paymentNumber} LIKE 'VP-2026-%'`,
        ),
      ),
    )
    .returning({ id: financeInvoicePayments.id });
  bump('financeInvoicePaymentsOrphan', demoPaymentDel.length);

  const partsRequestDel = await db
    .delete(inventoryPartsRequests)
    .where(
      and(
        eq(inventoryPartsRequests.organizationId, organizationId),
        or(
          sql`${inventoryPartsRequests.requestNumber} LIKE 'STDEMO-%'`,
          sql`${inventoryPartsRequests.requestNumber} LIKE 'PR-202%-%'`,
          sql`${inventoryPartsRequests.requestNumber} LIKE 'PR-2026-%'`,
        ),
      ),
    )
    .returning({ id: inventoryPartsRequests.id });
  bump('inventoryPartsRequests', partsRequestDel.length);

  const stockReceiptDel = await db
    .delete(inventoryStockReceipts)
    .where(
      and(
        eq(inventoryStockReceipts.organizationId, organizationId),
        or(
          notesMatchSeedMarker(inventoryStockReceipts.notes),
          sql`${inventoryStockReceipts.receiptNumber} LIKE 'STDEMO-%'`,
          sql`${inventoryStockReceipts.receiptNumber} LIKE 'GR-202%-%'`,
        ),
      ),
    )
    .returning({ id: inventoryStockReceipts.id });
  bump('inventoryStockReceipts', stockReceiptDel.length);

  const demoFleetClientRowsEarly = await db
    .select({ id: fleetClients.id })
    .from(fleetClients)
    .where(
      and(
        eq(fleetClients.organizationId, organizationId),
        or(
          sql`${fleetClients.clientCode} LIKE 'STDEMO-%'`,
          sql`${fleetClients.clientCode} LIKE 'FL-C-202%-%'`,
          sql`${fleetClients.clientCode} LIKE 'FL-C-2026-%'`,
        ),
      ),
    );
  const demoFleetClientIds = demoFleetClientRowsEarly.map((r) => r.id);

  const demoContractRows = await db
    .select({ id: leaseContracts.id })
    .from(leaseContracts)
    .where(
      and(
        eq(leaseContracts.organizationId, organizationId),
        or(
          notesMatchSeedMarker(leaseContracts.description),
          sql`${leaseContracts.contractNumber} LIKE 'STDEMO-%'`,
          sql`${leaseContracts.contractNumber} LIKE 'LC-202%-%'`,
          sql`${leaseContracts.contractNumber} LIKE 'LC-2026-%'`,
          demoFleetClientIds.length > 0
            ? inArray(leaseContracts.clientId, demoFleetClientIds)
            : sql`false`,
        ),
      ),
    );
  const demoContractIds = demoContractRows.map((r) => r.id);

  if (demoContractIds.length > 0) {
    const billingInvRows = await db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          inArray(financeInvoices.leaseContractId, demoContractIds),
        ),
      );
    const billingInvIds = billingInvRows.map((r) => r.id);
    if (billingInvIds.length > 0) {
      await db
        .delete(financeInvoicePayments)
        .where(inArray(financeInvoicePayments.invoiceId, billingInvIds));
      await db
        .delete(financeInvoiceLines)
        .where(inArray(financeInvoiceLines.invoiceId, billingInvIds));
      const extraInvDel = await db
        .delete(financeInvoices)
        .where(inArray(financeInvoices.id, billingInvIds))
        .returning({ id: financeInvoices.id });
      bump('financeInvoicesByLease', extraInvDel.length);
    }
  }

  const demoVehicleRows = await db
    .select({ id: assetRegisterVehicles.id })
    .from(assetRegisterVehicles)
    .where(
      and(
        eq(assetRegisterVehicles.organizationId, organizationId),
        or(
          notesMatchSeedMarker(assetRegisterVehicles.specialNotes),
          sql`${assetRegisterVehicles.fleetCode} LIKE 'STDEMO-%'`,
          sql`${assetRegisterVehicles.fleetCode} LIKE 'GF-FLT-%'`,
          sql`${assetRegisterVehicles.chassisNumber} LIKE 'STGDM%'`,
        ),
      ),
    );
  const demoVehicleIds = demoVehicleRows.map((r) => r.id);

  if (demoContractIds.length > 0 || demoVehicleIds.length > 0) {
    const assignmentDel = await db
      .delete(assetRegisterVehicleAssignments)
      .where(
        and(
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          or(
            demoContractIds.length > 0
              ? inArray(
                  assetRegisterVehicleAssignments.leaseContractId,
                  demoContractIds,
                )
              : sql`false`,
            demoVehicleIds.length > 0
              ? inArray(
                  assetRegisterVehicleAssignments.vehicleId,
                  demoVehicleIds,
                )
              : sql`false`,
          ),
        ),
      )
      .returning({ id: assetRegisterVehicleAssignments.id });
    bump('assetRegisterVehicleAssignments', assignmentDel.length);
  }

  if (demoContractIds.length > 0) {
    const leaseDel = await db
      .delete(leaseContracts)
      .where(inArray(leaseContracts.id, demoContractIds))
      .returning({ id: leaseContracts.id });
    bump('leaseContracts', leaseDel.length);
  }

  if (demoFleetClientIds.length > 0) {
    const pocDel = await db
      .delete(fleetClientPocs)
      .where(inArray(fleetClientPocs.clientId, demoFleetClientIds))
      .returning({ id: fleetClientPocs.id });
    bump('fleetClientPocs', pocDel.length);

    const fleetClientDel = await db
      .delete(fleetClients)
      .where(inArray(fleetClients.id, demoFleetClientIds))
      .returning({ id: fleetClients.id });
    bump('fleetClients', fleetClientDel.length);
  }

  const driverDel = await db
    .delete(organisationDrivers)
    .where(
      and(
        eq(organisationDrivers.organizationId, organizationId),
        or(
          demoEmailSql(organisationDrivers.email),
          sql`${organisationDrivers.email}::text LIKE '%@drivers.in'`,
          sql`${organisationDrivers.cprNo} LIKE 'STDEMO-%'`,
          sql`${organisationDrivers.cprNo} LIKE 'CPR-IN-2024-%'`,
          sql`${organisationDrivers.licenseNumber} LIKE 'DL-STDEMO-%'`,
          sql`${organisationDrivers.name} LIKE 'Staging Demo%'`,
        ),
      ),
    )
    .returning({ id: organisationDrivers.id });
  bump('organisationDrivers', driverDel.length);

  const fleetLinkedOrgClientRows = await db
    .select({ organisationClientId: fleetClients.organisationClientId })
    .from(fleetClients)
    .where(
      and(
        eq(fleetClients.organizationId, organizationId),
        or(
          sql`${fleetClients.clientCode} LIKE 'STDEMO-%'`,
          sql`${fleetClients.clientCode} LIKE 'FL-C-202%-%'`,
          sql`${fleetClients.clientCode} LIKE 'FL-C-2026-%'`,
        ),
      ),
    );
  const fleetLinkedOrgClientIds = fleetLinkedOrgClientRows
    .map((r) => r.organisationClientId)
    .filter((id): id is string => id != null);

  const demoClientRows = await db
    .select({ id: organisationClients.id })
    .from(organisationClients)
    .where(
      and(
        eq(organisationClients.organizationId, organizationId),
        or(
          sql`${organisationClients.name} LIKE 'Staging Demo%'`,
          sql`${organisationClients.name} LIKE '%Instamart%'`,
          sql`${organisationClients.name} LIKE '%Hyperpure%'`,
          sql`${organisationClients.name} LIKE '%BigBasket%'`,
          sql`${organisationClients.name} LIKE '%Ekart%'`,
          sql`${organisationClients.name} LIKE '%Amazon Transportation%'`,
          sql`${organisationClients.name} LIKE '%Dunzo%'`,
          sql`${organisationClients.name} LIKE '%Blinkit%'`,
          sql`${organisationClients.name} LIKE '%Zepto%'`,
          sql`${organisationClients.name} LIKE '%Meesho Logistics%'`,
          sql`${organisationClients.name} LIKE '%PharmEasy Fleet%'`,
          sql`${organisationClients.name} LIKE '%Licious%'`,
          sql`${organisationClients.name} LIKE '%Urban Company Mobility%'`,
          sql`${organisationClients.name} LIKE '%Reliance Retail Quick%'`,
          sql`${organisationClients.name} LIKE '%Tata 1mg%'`,
          fleetLinkedOrgClientIds.length > 0
            ? inArray(organisationClients.id, fleetLinkedOrgClientIds)
            : sql`false`,
        ),
      ),
    );
  const demoClientIds = demoClientRows.map((r) => r.id);

  const demoPocClientRows = await db
    .select({ clientId: organisationClientPocs.clientId })
    .from(organisationClientPocs)
    .innerJoin(
      organisationClients,
      eq(organisationClientPocs.clientId, organisationClients.id),
    )
    .where(
      and(
        eq(organisationClients.organizationId, organizationId),
        demoEmailSql(organisationClientPocs.email),
      ),
    );
  for (const row of demoPocClientRows) {
    if (!demoClientIds.includes(row.clientId)) {
      demoClientIds.push(row.clientId);
    }
  }

  if (demoClientIds.length > 0) {
    const orgPocDel = await db
      .delete(organisationClientPocs)
      .where(inArray(organisationClientPocs.clientId, demoClientIds))
      .returning({ id: organisationClientPocs.id });
    bump('organisationClientPocs', orgPocDel.length);

    const clientDel = await db
      .delete(organisationClients)
      .where(inArray(organisationClients.id, demoClientIds))
      .returning({ id: organisationClients.id });
    bump('organisationClients', clientDel.length);
  }

  await db
    .update(organisationLocations)
    .set({ responsibleEmployeeId: null, deputyEmployeeId: null })
    .where(eq(organisationLocations.organizationId, organizationId));

  const employeeDel = await db
    .delete(organisationEmployees)
    .where(
      and(
        eq(organisationEmployees.organizationId, organizationId),
        or(
          demoEmailSql(organisationEmployees.companyEmail),
          sql`${organisationEmployees.companyEmail}::text LIKE '%@grubfleet-logistics.in'`,
          sql`${organisationEmployees.employeeCode} LIKE 'GF-EMP-2025-%'`,
          sql`${organisationEmployees.fullName} LIKE 'Staging Demo%'`,
        ),
      ),
    )
    .returning({ id: organisationEmployees.id });
  bump('organisationEmployees', employeeDel.length);

  const demoSupplierFilter = and(
    eq(organisationSuppliers.organizationId, organizationId),
    or(
      demoEmailSql(organisationSuppliers.contactEmail),
      sql`${organisationSuppliers.contactEmail}::text LIKE '%@suppliers.in'`,
      sql`${organisationSuppliers.agreementReference} LIKE '27AABCU%'`,
      sql`${organisationSuppliers.name} LIKE 'Staging Demo%'`,
    ),
  );

  const demoSupplierIdRows = await db
    .select({ id: organisationSuppliers.id })
    .from(organisationSuppliers)
    .where(demoSupplierFilter);
  const demoSupplierIds = demoSupplierIdRows.map((r) => r.id);

  if (demoSupplierIds.length > 0) {
    const supplierLinkedInvoiceRows = await db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          inArray(financeInvoices.supplierId, demoSupplierIds),
        ),
      );
    const supplierLinkedInvoiceIds = supplierLinkedInvoiceRows.map((r) => r.id);
    if (supplierLinkedInvoiceIds.length > 0) {
      await db
        .delete(financeInvoicePayments)
        .where(
          inArray(financeInvoicePayments.invoiceId, supplierLinkedInvoiceIds),
        );
      await db
        .delete(financeInvoiceLines)
        .where(
          inArray(financeInvoiceLines.invoiceId, supplierLinkedInvoiceIds),
        );
      const extraInvDel = await db
        .delete(financeInvoices)
        .where(inArray(financeInvoices.id, supplierLinkedInvoiceIds))
        .returning({ id: financeInvoices.id });
      bump('financeInvoicesBySupplier', extraInvDel.length);
    }
  }

  const supplierDel = await db
    .delete(organisationSuppliers)
    .where(demoSupplierFilter)
    .returning({ id: organisationSuppliers.id });
  bump('organisationSuppliers', supplierDel.length);

  const locationDel = await db
    .delete(organisationLocations)
    .where(
      and(
        eq(organisationLocations.organizationId, organizationId),
        or(
          demoEmailSql(organisationLocations.siteContactEmail),
          seededSiteEmails.length > 0
            ? inArray(organisationLocations.siteContactEmail, seededSiteEmails)
            : sql`false`,
          sql`${organisationLocations.name} LIKE 'Staging Demo%'`,
          sql`${organisationLocations.name} LIKE 'GrubFleet%'`,
        ),
      ),
    )
    .returning({ id: organisationLocations.id });
  bump('organisationLocations', locationDel.length);

  if (demoVehicleIds.length > 0) {
    const vehicleDel = await db
      .delete(assetRegisterVehicles)
      .where(inArray(assetRegisterVehicles.id, demoVehicleIds))
      .returning({ id: assetRegisterVehicles.id });
    bump('assetRegisterVehicles', vehicleDel.length);
  }

  const demoClassRows = await db
    .select({ id: assetRegisterAssetClasses.id })
    .from(assetRegisterAssetClasses)
    .where(
      and(
        eq(assetRegisterAssetClasses.organizationId, organizationId),
        or(
          notesMatchSeedMarker(assetRegisterAssetClasses.description),
          sql`${assetRegisterAssetClasses.code} LIKE 'SD%'`,
          sql`${assetRegisterAssetClasses.code} LIKE 'GF2W%'`,
          sql`${assetRegisterAssetClasses.code} LIKE 'GF3W%'`,
          sql`${assetRegisterAssetClasses.code} LIKE 'GF4W%'`,
        ),
      ),
    );
  const demoClassIds = demoClassRows.map((r) => r.id);

  if (demoClassIds.length > 0) {
    const masterDel = await db
      .delete(assetRegisterAssetMasters)
      .where(
        and(
          eq(assetRegisterAssetMasters.organizationId, organizationId),
          inArray(assetRegisterAssetMasters.assetClassId, demoClassIds),
        ),
      )
      .returning({ id: assetRegisterAssetMasters.id });
    bump('assetRegisterAssetMasters', masterDel.length);

    const classDel = await db
      .delete(assetRegisterAssetClasses)
      .where(inArray(assetRegisterAssetClasses.id, demoClassIds))
      .returning({ id: assetRegisterAssetClasses.id });
    bump('assetRegisterAssetClasses', classDel.length);
  }

  const partDel = await db
    .delete(inventoryCatalogParts)
    .where(
      and(
        eq(inventoryCatalogParts.organizationId, organizationId),
        or(
          sql`${inventoryCatalogParts.partCode} LIKE 'STDEMO-%'`,
          sql`${inventoryCatalogParts.partCode} LIKE 'SP-202%-%'`,
          sql`${inventoryCatalogParts.partCode} LIKE 'SP-2026-%'`,
          sql`${inventoryCatalogParts.name} LIKE 'Staging Demo%'`,
        ),
      ),
    )
    .returning({ id: inventoryCatalogParts.id });
  bump('inventoryCatalogParts', partDel.length);

  return counts;
}
