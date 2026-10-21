import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type AnyColumn,
} from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  assetRegisterAssetClasses,
  assetRegisterVehicles,
  inventoryCatalogParts,
  inventoryStockReceipts,
  organisationEmployees,
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
  type WorkshopLaborJobCardRow,
  type WorkshopWorkOrderRow,
} from '../../../database/schema';
import {
  AMC_SUBSCRIBER_LIST_DEFAULT_SORT,
  type AmcSubscriberListSortField,
  AMC_TIER_LIST_DEFAULT_SORT,
  type AmcTierListSortField,
  LABOR_JOB_CARD_LIST_DEFAULT_SORT,
  type LaborJobCardListSortField,
  MAINTENANCE_SCHEDULE_LIST_DEFAULT_SORT,
  type MaintenanceScheduleListSortField,
  MAINTENANCE_SCHEDULE_VEHICLE_LIST_DEFAULT_SORT,
  type MaintenanceScheduleVehicleListSortField,
  WORK_ORDER_LIST_DEFAULT_SORT,
  type WorkOrderListSortField,
  WORKSHOP_TECHNICIAN_LIST_DEFAULT_SORT,
  type WorkshopTechnicianListSortField,
} from '../constants/workshop-list-sort.constants';
import {
  buildListOrderBy,
  type ResolvedListSort,
} from '../../../common/utils/list-sort.util';

const WORK_ORDER_LIST_SORT_COLUMNS: Record<WorkOrderListSortField, AnyColumn> =
  {
    createdAt: workshopWorkOrders.createdAt,
    workOrderNumber: workshopWorkOrders.workOrderNumber,
    status: workshopWorkOrders.status,
    closedAt: workshopWorkOrders.closedAt,
  };

const LABOR_JOB_CARD_LIST_SORT_COLUMNS: Record<
  LaborJobCardListSortField,
  AnyColumn
> = {
  createdAt: workshopLaborJobCards.createdAt,
  jobCardNumber: workshopLaborJobCards.name,
  status: workshopLaborJobCards.isActive,
};

const AMC_TIER_LIST_SORT_COLUMNS: Record<AmcTierListSortField, AnyColumn> = {
  name: workshopAmcTiers.name,
  createdAt: workshopAmcTiers.createdAt,
};

const MAINTENANCE_SCHEDULE_LIST_SORT_COLUMNS: Record<
  MaintenanceScheduleListSortField,
  AnyColumn
> = {
  name: workshopMaintenanceSchedules.name,
  createdAt: workshopMaintenanceSchedules.createdAt,
};

const AMC_SUBSCRIBER_LIST_SORT_COLUMNS: Record<
  AmcSubscriberListSortField,
  AnyColumn
> = {
  subscriberCode: workshopAmcSubscribers.subscriberCode,
  createdAt: workshopAmcSubscribers.createdAt,
};

const MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_COLUMNS: Record<
  MaintenanceScheduleVehicleListSortField,
  AnyColumn
> = {
  fleetCode: assetRegisterVehicles.fleetCode,
  registrationNumber: assetRegisterVehicles.registrationNumber,
};

export type LaborJobCardPartRow = typeof workshopLaborJobCardParts.$inferSelect;

@Injectable()
export class WorkshopRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listLaborJobCards(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: {
      search?: string;
      isActive?: boolean;
      sort?: ResolvedListSort<LaborJobCardListSortField>;
    },
  ) {
    const conditions = [
      eq(workshopLaborJobCards.organizationId, organizationId),
    ];
    if (opts.isActive !== undefined) {
      conditions.push(eq(workshopLaborJobCards.isActive, opts.isActive));
    }
    if (opts.search?.trim()) {
      conditions.push(
        ilike(workshopLaborJobCards.name, `%${opts.search.trim()}%`),
      );
    }
    const where = and(...conditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(workshopLaborJobCards)
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            LABOR_JOB_CARD_LIST_SORT_COLUMNS,
            opts.sort ?? LABOR_JOB_CARD_LIST_DEFAULT_SORT,
            workshopLaborJobCards.id,
          ),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(workshopLaborJobCards)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getLaborJobCardInOrg(
    organizationId: string,
    id: string,
  ): Promise<WorkshopLaborJobCardRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workshopLaborJobCards)
      .where(
        and(
          eq(workshopLaborJobCards.organizationId, organizationId),
          eq(workshopLaborJobCards.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async listLaborJobCardParts(laborJobCardId: string) {
    return this.db
      .select({
        line: workshopLaborJobCardParts,
        partName: inventoryCatalogParts.name,
        partCode: inventoryCatalogParts.partCode,
      })
      .from(workshopLaborJobCardParts)
      .innerJoin(
        inventoryCatalogParts,
        eq(workshopLaborJobCardParts.inventoryPartId, inventoryCatalogParts.id),
      )
      .where(eq(workshopLaborJobCardParts.laborJobCardId, laborJobCardId))
      .orderBy(asc(inventoryCatalogParts.name));
  }

  async updateLaborJobCard(
    organizationId: string,
    id: string,
    patch: Partial<typeof workshopLaborJobCards.$inferInsert>,
  ): Promise<WorkshopLaborJobCardRow | undefined> {
    const [row] = await this.db
      .update(workshopLaborJobCards)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(workshopLaborJobCards.organizationId, organizationId),
          eq(workshopLaborJobCards.id, id),
        ),
      )
      .returning();
    return row;
  }

  async replaceLaborJobCardParts(
    laborJobCardId: string,
    partLines: Array<{ inventoryPartId: string; quantity: number }>,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(workshopLaborJobCardParts)
        .where(eq(workshopLaborJobCardParts.laborJobCardId, laborJobCardId));
      if (partLines.length > 0) {
        await tx.insert(workshopLaborJobCardParts).values(
          partLines.map((line) => ({
            laborJobCardId,
            inventoryPartId: line.inventoryPartId,
            quantity: line.quantity,
          })),
        );
      }
    });
  }

  async insertLaborJobCard(
    values: typeof workshopLaborJobCards.$inferInsert,
    partLines: Array<{ inventoryPartId: string; quantity: number }>,
  ): Promise<WorkshopLaborJobCardRow> {
    return this.db.transaction(async (tx) => {
      const [card] = await tx
        .insert(workshopLaborJobCards)
        .values(values)
        .returning();
      if (!card) throw new Error('Failed to insert labor job card');
      if (partLines.length > 0) {
        await tx.insert(workshopLaborJobCardParts).values(
          partLines.map((line) => ({
            laborJobCardId: card.id,
            inventoryPartId: line.inventoryPartId,
            quantity: line.quantity,
          })),
        );
      }
      return card;
    });
  }

  async nextWorkOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(workshopWorkOrderNumberSequences)
        .where(
          and(
            eq(workshopWorkOrderNumberSequences.organizationId, organizationId),
            eq(workshopWorkOrderNumberSequences.year, year),
          ),
        )
        .limit(1);
      let seq = existing[0]?.lastSeq ?? 0;
      seq += 1;
      if (existing.length === 0) {
        await tx.insert(workshopWorkOrderNumberSequences).values({
          organizationId,
          year,
          lastSeq: seq,
        });
      } else {
        await tx
          .update(workshopWorkOrderNumberSequences)
          .set({ lastSeq: seq })
          .where(
            and(
              eq(
                workshopWorkOrderNumberSequences.organizationId,
                organizationId,
              ),
              eq(workshopWorkOrderNumberSequences.year, year),
            ),
          );
      }
      return `WO-${year}-${String(seq).padStart(4, '0')}`;
    });
  }

  async averageUnitCostMinorForPart(
    organizationId: string,
    partId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({
        avgCost: sql<number>`coalesce(avg(${inventoryStockReceipts.unitCostMinor}), 0)::bigint`,
      })
      .from(inventoryStockReceipts)
      .where(
        and(
          eq(inventoryStockReceipts.organizationId, organizationId),
          eq(inventoryStockReceipts.partId, partId),
          eq(inventoryStockReceipts.isActive, true),
        ),
      );
    return Number(row?.avgCost ?? 0);
  }

  async insertWorkOrder(
    header: typeof workshopWorkOrders.$inferInsert,
    partLines: Array<{
      inventoryPartId: string;
      quantity: number;
      unitCostMinor: number;
      lineSource: 'template' | 'additional';
      inventoryPartsRequestId?: string | null;
    }>,
    laborLines: Array<{
      description: string;
      amountMinor: number;
      lineSource: 'template' | 'additional';
    }>,
  ): Promise<{
    order: WorkshopWorkOrderRow;
    partLines: Array<typeof workshopWorkOrderPartLines.$inferSelect>;
  }> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(workshopWorkOrders)
        .values(header)
        .returning();
      if (!order) throw new Error('Failed to insert work order');
      let insertedPartLines: Array<
        typeof workshopWorkOrderPartLines.$inferSelect
      > = [];
      if (partLines.length > 0) {
        insertedPartLines = await tx
          .insert(workshopWorkOrderPartLines)
          .values(
            partLines.map((line) => ({
              workOrderId: order.id,
              inventoryPartId: line.inventoryPartId,
              quantity: line.quantity,
              unitCostMinor: line.unitCostMinor,
              lineSource: line.lineSource,
              fulfillmentStatus: 'reserved' as const,
              inventoryPartsRequestId: line.inventoryPartsRequestId ?? null,
            })),
          )
          .returning();
      }
      if (laborLines.length > 0) {
        await tx.insert(workshopWorkOrderLaborLines).values(
          laborLines.map((line) => ({
            workOrderId: order.id,
            description: line.description,
            amountMinor: line.amountMinor,
            lineSource: line.lineSource,
          })),
        );
      }
      return { order, partLines: insertedPartLines };
    });
  }

  async updatePartLinesFulfillmentForWorkOrder(
    workOrderId: string,
    fromStatus: 'reserved' | 'issued' | 'cancelled',
    toStatus: 'reserved' | 'issued' | 'cancelled',
  ): Promise<void> {
    await this.db
      .update(workshopWorkOrderPartLines)
      .set({ fulfillmentStatus: toStatus })
      .where(
        and(
          eq(workshopWorkOrderPartLines.workOrderId, workOrderId),
          eq(workshopWorkOrderPartLines.fulfillmentStatus, fromStatus),
        ),
      );
  }

  async updateWorkOrder(
    organizationId: string,
    id: string,
    patch: Partial<typeof workshopWorkOrders.$inferInsert>,
  ): Promise<WorkshopWorkOrderRow | undefined> {
    const [row] = await this.db
      .update(workshopWorkOrders)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(workshopWorkOrders.organizationId, organizationId),
          eq(workshopWorkOrders.id, id),
        ),
      )
      .returning();
    return row;
  }

  async listTechniciansWithOpenWorkOrderCounts(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: {
      search?: string;
      sort?: ResolvedListSort<WorkshopTechnicianListSortField>;
    },
  ) {
    const conditions = [
      eq(organisationEmployees.organizationId, organizationId),
      eq(organisationEmployees.isActive, true),
      eq(organisationEmployees.isWorkshopTechnician, true),
    ];
    if (opts.search?.trim()) {
      conditions.push(
        ilike(organisationEmployees.fullName, `%${opts.search.trim()}%`),
      );
    }
    const where = and(...conditions);
    const openWoJoin = and(
      eq(workshopWorkOrders.technicianEmployeeId, organisationEmployees.id),
      inArray(workshopWorkOrders.status, ['open', 'in_progress']),
      eq(workshopWorkOrders.organizationId, organizationId),
    );

    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: organisationEmployees.id,
          fullName: organisationEmployees.fullName,
          openWorkOrderCount: sql<number>`count(${workshopWorkOrders.id})::int`,
        })
        .from(organisationEmployees)
        .leftJoin(workshopWorkOrders, openWoJoin)
        .where(where)
        .groupBy(organisationEmployees.id, organisationEmployees.fullName)
        .orderBy(
          ...(() => {
            const sort = opts.sort ?? WORKSHOP_TECHNICIAN_LIST_DEFAULT_SORT;
            if (sort.sortBy === 'openWorkOrderCount') {
              return [
                sort.sortOrder === 'asc'
                  ? asc(sql`count(${workshopWorkOrders.id})`)
                  : desc(sql`count(${workshopWorkOrders.id})`),
                asc(organisationEmployees.id),
              ];
            }
            return buildListOrderBy(
              { fullName: organisationEmployees.fullName },
              { sortBy: 'fullName', sortOrder: sort.sortOrder },
              organisationEmployees.id,
            );
          })(),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(organisationEmployees)
        .where(where),
    ]);
    return {
      rows: rows.map((row) => ({
        ...row,
        openWorkOrderCount: Number(row.openWorkOrderCount ?? 0),
      })),
      total: Number(totalRow[0]?.total ?? 0),
    };
  }

  async hasOverdueLogForUtcDate(
    workOrderId: string,
    utcDate: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ total: count() })
      .from(workshopWorkOrderOverdueLogs)
      .where(
        and(
          eq(workshopWorkOrderOverdueLogs.workOrderId, workOrderId),
          sql`${workshopWorkOrderOverdueLogs.loggedAt}::date = ${utcDate}::date`,
        ),
      );
    return Number(row?.total ?? 0) > 0;
  }

  async insertOverdueLog(values: {
    workOrderId: string;
    expectedCompletionDate: string;
    daysOverdue: number;
    note?: string | null;
  }): Promise<void> {
    await this.db.insert(workshopWorkOrderOverdueLogs).values({
      workOrderId: values.workOrderId,
      expectedCompletionDate: values.expectedCompletionDate,
      daysOverdue: values.daysOverdue,
      note: values.note ?? null,
    });
  }

  async listWorkOrders(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: {
      search?: string;
      status?: string;
      sort?: ResolvedListSort<WorkOrderListSortField>;
    },
  ) {
    const conditions = [eq(workshopWorkOrders.organizationId, organizationId)];
    if (opts.status) {
      conditions.push(
        eq(
          workshopWorkOrders.status,
          opts.status as (typeof workshopWorkOrders.$inferSelect)['status'],
        ),
      );
    }
    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      conditions.push(
        or(
          ilike(workshopWorkOrders.workOrderNumber, term),
          ilike(assetRegisterVehicles.fleetCode, term),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          order: workshopWorkOrders,
          fleetCode: assetRegisterVehicles.fleetCode,
          assetClassName: assetRegisterAssetClasses.name,
          technicianName: organisationEmployees.fullName,
        })
        .from(workshopWorkOrders)
        .leftJoin(
          assetRegisterVehicles,
          eq(workshopWorkOrders.vehicleId, assetRegisterVehicles.id),
        )
        .leftJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .leftJoin(
          organisationEmployees,
          eq(workshopWorkOrders.technicianEmployeeId, organisationEmployees.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            WORK_ORDER_LIST_SORT_COLUMNS,
            opts.sort ?? WORK_ORDER_LIST_DEFAULT_SORT,
            workshopWorkOrders.id,
          ),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(workshopWorkOrders)
        .leftJoin(
          assetRegisterVehicles,
          eq(workshopWorkOrders.vehicleId, assetRegisterVehicles.id),
        )
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getWorkOrderInOrg(
    organizationId: string,
    id: string,
  ): Promise<WorkshopWorkOrderRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workshopWorkOrders)
      .where(
        and(
          eq(workshopWorkOrders.organizationId, organizationId),
          eq(workshopWorkOrders.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async listWorkOrderPartLines(workOrderId: string) {
    return this.db
      .select({
        line: workshopWorkOrderPartLines,
        partName: inventoryCatalogParts.name,
        partCode: inventoryCatalogParts.partCode,
      })
      .from(workshopWorkOrderPartLines)
      .innerJoin(
        inventoryCatalogParts,
        eq(
          workshopWorkOrderPartLines.inventoryPartId,
          inventoryCatalogParts.id,
        ),
      )
      .where(eq(workshopWorkOrderPartLines.workOrderId, workOrderId));
  }

  async listWorkOrderLaborLines(workOrderId: string) {
    return this.db
      .select()
      .from(workshopWorkOrderLaborLines)
      .where(eq(workshopWorkOrderLaborLines.workOrderId, workOrderId));
  }

  async laborJobCardPartLinesByCardIds(cardIds: string[]) {
    if (cardIds.length === 0) return [];
    return this.db
      .select()
      .from(workshopLaborJobCardParts)
      .where(inArray(workshopLaborJobCardParts.laborJobCardId, cardIds));
  }

  async listAmcTiers(
    organizationId: string,
    page: number,
    pageSize: number,
    sort?: ResolvedListSort<AmcTierListSortField>,
  ) {
    const where = and(
      eq(workshopAmcTiers.organizationId, organizationId),
      eq(workshopAmcTiers.isActive, true),
    );
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(workshopAmcTiers)
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            AMC_TIER_LIST_SORT_COLUMNS,
            sort ?? AMC_TIER_LIST_DEFAULT_SORT,
            workshopAmcTiers.id,
          ),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(workshopAmcTiers).where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getAmcTierInOrg(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(workshopAmcTiers)
      .where(
        and(
          eq(workshopAmcTiers.organizationId, organizationId),
          eq(workshopAmcTiers.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async listMaintenanceSchedules(
    organizationId: string,
    page: number,
    pageSize: number,
    sort?: ResolvedListSort<MaintenanceScheduleListSortField>,
  ) {
    const where = and(
      eq(workshopMaintenanceSchedules.organizationId, organizationId),
      eq(workshopMaintenanceSchedules.isActive, true),
    );
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(workshopMaintenanceSchedules)
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            MAINTENANCE_SCHEDULE_LIST_SORT_COLUMNS,
            sort ?? MAINTENANCE_SCHEDULE_LIST_DEFAULT_SORT,
            workshopMaintenanceSchedules.id,
          ),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(workshopMaintenanceSchedules)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getMaintenanceScheduleInOrg(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(workshopMaintenanceSchedules)
      .where(
        and(
          eq(workshopMaintenanceSchedules.organizationId, organizationId),
          eq(workshopMaintenanceSchedules.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async insertAmcTier(values: typeof workshopAmcTiers.$inferInsert) {
    const [row] = await this.db
      .insert(workshopAmcTiers)
      .values(values)
      .returning();
    return row;
  }

  async updateAmcTier(
    organizationId: string,
    id: string,
    patch: Partial<typeof workshopAmcTiers.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(workshopAmcTiers)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(workshopAmcTiers.organizationId, organizationId),
          eq(workshopAmcTiers.id, id),
        ),
      )
      .returning();
    return row;
  }

  async insertMaintenanceSchedule(
    values: typeof workshopMaintenanceSchedules.$inferInsert,
  ) {
    const [row] = await this.db
      .insert(workshopMaintenanceSchedules)
      .values(values)
      .returning();
    return row;
  }

  async updateMaintenanceSchedule(
    organizationId: string,
    id: string,
    patch: Partial<typeof workshopMaintenanceSchedules.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(workshopMaintenanceSchedules)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(workshopMaintenanceSchedules.organizationId, organizationId),
          eq(workshopMaintenanceSchedules.id, id),
        ),
      )
      .returning();
    return row;
  }

  async listAmcSubscribers(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: {
      amcTierId?: string;
      sort?: ResolvedListSort<AmcSubscriberListSortField>;
    },
  ) {
    const conditions = [
      eq(workshopAmcSubscribers.organizationId, organizationId),
      eq(workshopAmcSubscribers.isActive, true),
    ];
    if (opts.amcTierId) {
      conditions.push(eq(workshopAmcSubscribers.amcTierId, opts.amcTierId));
    }
    const where = and(...conditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: workshopAmcSubscribers.id,
          subscriberCode: workshopAmcSubscribers.subscriberCode,
          amcTierId: workshopAmcSubscribers.amcTierId,
          vehicleId: workshopAmcSubscribers.vehicleId,
          fleetCode: assetRegisterVehicles.fleetCode,
          registrationNumber: assetRegisterVehicles.registrationNumber,
          assetClassName: assetRegisterAssetClasses.name,
          tierName: workshopAmcTiers.name,
          startedAt: workshopAmcSubscribers.startedAt,
        })
        .from(workshopAmcSubscribers)
        .innerJoin(
          assetRegisterVehicles,
          eq(workshopAmcSubscribers.vehicleId, assetRegisterVehicles.id),
        )
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .innerJoin(
          workshopAmcTiers,
          eq(workshopAmcSubscribers.amcTierId, workshopAmcTiers.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            AMC_SUBSCRIBER_LIST_SORT_COLUMNS,
            opts.sort ?? AMC_SUBSCRIBER_LIST_DEFAULT_SORT,
            workshopAmcSubscribers.id,
          ),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(workshopAmcSubscribers)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getAmcSubscriberByCodeInOrg(
    organizationId: string,
    subscriberCode: string,
  ) {
    const normalized = subscriberCode.trim();
    if (!normalized) return undefined;
    const [row] = await this.db
      .select({
        id: workshopAmcSubscribers.id,
        subscriberCode: workshopAmcSubscribers.subscriberCode,
        amcTierId: workshopAmcSubscribers.amcTierId,
        vehicleId: workshopAmcSubscribers.vehicleId,
        fleetCode: assetRegisterVehicles.fleetCode,
        registrationNumber: assetRegisterVehicles.registrationNumber,
        assetClassName: assetRegisterAssetClasses.name,
        tierName: workshopAmcTiers.name,
        tierDescription: workshopAmcTiers.description,
        priceDisplayLabel: workshopAmcTiers.priceDisplayLabel,
        startedAt: workshopAmcSubscribers.startedAt,
        endedAt: workshopAmcSubscribers.endedAt,
        isActive: workshopAmcSubscribers.isActive,
        createdAt: workshopAmcSubscribers.createdAt,
        updatedAt: workshopAmcSubscribers.updatedAt,
      })
      .from(workshopAmcSubscribers)
      .innerJoin(
        assetRegisterVehicles,
        eq(workshopAmcSubscribers.vehicleId, assetRegisterVehicles.id),
      )
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .innerJoin(
        workshopAmcTiers,
        eq(workshopAmcSubscribers.amcTierId, workshopAmcTiers.id),
      )
      .where(
        and(
          eq(workshopAmcSubscribers.organizationId, organizationId),
          eq(workshopAmcSubscribers.subscriberCode, normalized),
        ),
      )
      .limit(1);
    return row;
  }

  async insertAmcSubscriber(
    values: typeof workshopAmcSubscribers.$inferInsert,
  ) {
    const [row] = await this.db
      .insert(workshopAmcSubscribers)
      .values(values)
      .returning();
    return row;
  }

  async incrementAmcTierSubscriberCount(
    organizationId: string,
    tierId: string,
    delta: number,
  ): Promise<void> {
    await this.db
      .update(workshopAmcTiers)
      .set({
        subscriberCount: sql`${workshopAmcTiers.subscriberCount} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workshopAmcTiers.organizationId, organizationId),
          eq(workshopAmcTiers.id, tierId),
        ),
      );
  }

  async appendWorkOrderAdditionalLines(
    workOrderId: string,
    partLines: Array<{
      inventoryPartId: string;
      quantity: number;
      unitCostMinor: number;
      inventoryPartsRequestId?: string | null;
    }>,
    laborLines: Array<{ description: string; amountMinor: number }>,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (partLines.length > 0) {
        await tx.insert(workshopWorkOrderPartLines).values(
          partLines.map((line) => ({
            workOrderId,
            inventoryPartId: line.inventoryPartId,
            quantity: line.quantity,
            unitCostMinor: line.unitCostMinor,
            lineSource: 'additional' as const,
            fulfillmentStatus: 'reserved' as const,
            inventoryPartsRequestId: line.inventoryPartsRequestId ?? null,
          })),
        );
      }
      if (laborLines.length > 0) {
        await tx.insert(workshopWorkOrderLaborLines).values(
          laborLines.map((line) => ({
            workOrderId,
            description: line.description,
            amountMinor: line.amountMinor,
            lineSource: 'additional' as const,
          })),
        );
      }
    });
  }

  private scheduleVehicleMatchConditions(
    organizationId: string,
    assetClassLabel: string,
    vehicleApplicability: string | null,
  ) {
    const normalizedClass = assetClassLabel.trim().toLowerCase();
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterVehicles.isActive, true),
      eq(assetRegisterAssetClasses.organizationId, organizationId),
      sql`lower(trim(${assetRegisterAssetClasses.name})) = ${normalizedClass}`,
    ];
    const applicability = vehicleApplicability?.trim().toLowerCase();
    if (applicability === 'leased') {
      conditions.push(eq(assetRegisterVehicles.operationalStatus, 'leased'));
    } else if (applicability === 'owned') {
      conditions.push(eq(assetRegisterVehicles.operationalStatus, 'available'));
    }
    return and(...conditions);
  }

  async listMaintenanceScheduleMatchedVehicles(
    organizationId: string,
    assetClassLabel: string,
    vehicleApplicability: string | null,
    page: number,
    pageSize: number,
    sort?: ResolvedListSort<MaintenanceScheduleVehicleListSortField>,
  ) {
    if (!assetClassLabel.trim()) {
      return { rows: [], total: 0 };
    }
    const where = this.scheduleVehicleMatchConditions(
      organizationId,
      assetClassLabel,
      vehicleApplicability,
    );
    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          vehicleId: assetRegisterVehicles.id,
          fleetCode: assetRegisterVehicles.fleetCode,
          assetClassName: assetRegisterAssetClasses.name,
          odometer: assetRegisterVehicles.odometer,
        })
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_COLUMNS,
            sort ?? MAINTENANCE_SCHEDULE_VEHICLE_LIST_DEFAULT_SORT,
            assetRegisterVehicles.id,
          ),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async listAllMaintenanceScheduleMatchedVehicles(
    organizationId: string,
    assetClassLabel: string,
    vehicleApplicability: string | null,
  ) {
    if (!assetClassLabel.trim()) {
      return [];
    }
    const where = this.scheduleVehicleMatchConditions(
      organizationId,
      assetClassLabel,
      vehicleApplicability,
    );
    return this.db
      .select({
        vehicleId: assetRegisterVehicles.id,
        odometer: assetRegisterVehicles.odometer,
      })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(where)
      .orderBy(asc(assetRegisterVehicles.fleetCode));
  }

  async getLastClosedPmBaselineOdometers(
    organizationId: string,
    maintenanceScheduleId: string,
    vehicleIds: string[],
  ): Promise<Map<string, number>> {
    if (vehicleIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        vehicleId: workshopWorkOrders.vehicleId,
        odometerReading: workshopWorkOrders.odometerReading,
        closedAt: workshopWorkOrders.closedAt,
      })
      .from(workshopWorkOrders)
      .where(
        and(
          eq(workshopWorkOrders.organizationId, organizationId),
          eq(workshopWorkOrders.maintenanceScheduleId, maintenanceScheduleId),
          eq(workshopWorkOrders.workOrderType, 'pm'),
          eq(workshopWorkOrders.status, 'closed'),
          inArray(workshopWorkOrders.vehicleId, vehicleIds),
        ),
      )
      .orderBy(desc(workshopWorkOrders.closedAt));
    const map = new Map<string, number>();
    for (const row of rows) {
      if (map.has(row.vehicleId)) continue;
      map.set(row.vehicleId, row.odometerReading ?? 0);
    }
    return map;
  }

  async findOpenPmWorkOrdersByScheduleVehicles(
    organizationId: string,
    maintenanceScheduleId: string,
    vehicleIds: string[],
  ): Promise<Map<string, string>> {
    if (vehicleIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: workshopWorkOrders.id,
        vehicleId: workshopWorkOrders.vehicleId,
      })
      .from(workshopWorkOrders)
      .where(
        and(
          eq(workshopWorkOrders.organizationId, organizationId),
          eq(workshopWorkOrders.maintenanceScheduleId, maintenanceScheduleId),
          eq(workshopWorkOrders.workOrderType, 'pm'),
          inArray(workshopWorkOrders.status, ['open', 'in_progress']),
          inArray(workshopWorkOrders.vehicleId, vehicleIds),
        ),
      );
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.vehicleId, row.id);
    }
    return map;
  }

  async pickTechnicianForAutoPm(
    organizationId: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({
        id: organisationEmployees.id,
        openWorkOrderCount: sql<number>`count(${workshopWorkOrders.id})::int`,
      })
      .from(organisationEmployees)
      .leftJoin(
        workshopWorkOrders,
        and(
          eq(workshopWorkOrders.technicianEmployeeId, organisationEmployees.id),
          inArray(workshopWorkOrders.status, ['open', 'in_progress']),
          eq(workshopWorkOrders.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          eq(organisationEmployees.isActive, true),
          eq(organisationEmployees.isWorkshopTechnician, true),
        ),
      )
      .groupBy(organisationEmployees.id)
      .orderBy(asc(sql`count(${workshopWorkOrders.id})`))
      .limit(1);
    return row?.id ?? null;
  }

  async refreshWorkOrderTotals(
    organizationId: string,
    workOrderId: string,
  ): Promise<void> {
    const partRows = await this.listWorkOrderPartLines(workOrderId);
    const laborRows = await this.listWorkOrderLaborLines(workOrderId);
    const partsTotalMinor = partRows.reduce(
      (sum, { line }) => sum + line.unitCostMinor * line.quantity,
      0,
    );
    const laborTotalMinor = laborRows.reduce(
      (sum, line) => sum + line.amountMinor,
      0,
    );
    const netTotalMinor = partsTotalMinor + laborTotalMinor;
    await this.updateWorkOrder(organizationId, workOrderId, {
      partsTotalMinor,
      laborTotalMinor,
      netTotalMinor,
    });
  }
}
