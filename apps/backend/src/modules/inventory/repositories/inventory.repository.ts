import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, sum } from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  inventoryCatalogParts,
  inventoryPartCodeSequences,
  inventoryPartsRequests,
  inventoryStockReceiptSequences,
  inventoryStockReceipts,
  organisationLocations,
} from '../../../database/schema';

export type SparePartRow = typeof inventoryCatalogParts.$inferSelect;
export type StockReceiptRow = typeof inventoryStockReceipts.$inferSelect;
export type PartsRequestRow = typeof inventoryPartsRequests.$inferSelect;

@Injectable()
export class InventoryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async nextPartCode(organizationId: string): Promise<string> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(inventoryPartCodeSequences)
        .where(eq(inventoryPartCodeSequences.organizationId, organizationId))
        .limit(1);
      let seq = existing[0]?.lastSeq ?? 0;
      seq += 1;
      if (existing.length === 0) {
        await tx.insert(inventoryPartCodeSequences).values({
          organizationId,
          lastSeq: seq,
        });
      } else {
        await tx
          .update(inventoryPartCodeSequences)
          .set({ lastSeq: seq })
          .where(eq(inventoryPartCodeSequences.organizationId, organizationId));
      }
      return `PRT-${String(10000 + seq).padStart(5, '0')}`;
    });
  }

  async nextReceiptNumber(organizationId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(inventoryStockReceiptSequences)
        .where(
          and(
            eq(inventoryStockReceiptSequences.organizationId, organizationId),
            eq(inventoryStockReceiptSequences.year, year),
          ),
        )
        .limit(1);
      let seq = existing[0]?.lastSeq ?? 0;
      seq += 1;
      if (existing.length === 0) {
        await tx.insert(inventoryStockReceiptSequences).values({
          organizationId,
          year,
          lastSeq: seq,
        });
      } else {
        await tx
          .update(inventoryStockReceiptSequences)
          .set({ lastSeq: seq })
          .where(
            and(
              eq(inventoryStockReceiptSequences.organizationId, organizationId),
              eq(inventoryStockReceiptSequences.year, year),
            ),
          );
      }
      return `SR-${year}-${String(seq).padStart(4, '0')}`;
    });
  }

  async listSpareParts(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: { search?: string; isActive?: boolean },
  ) {
    const conditions = [
      eq(inventoryCatalogParts.organizationId, organizationId),
    ];
    if (opts.isActive !== undefined) {
      conditions.push(eq(inventoryCatalogParts.isActive, opts.isActive));
    }
    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      conditions.push(
        or(
          ilike(inventoryCatalogParts.name, term),
          ilike(inventoryCatalogParts.partCode, term),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(inventoryCatalogParts)
        .where(where)
        .orderBy(desc(inventoryCatalogParts.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(inventoryCatalogParts)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getSparePartInOrg(organizationId: string, partId: string) {
    const rows = await this.db
      .select()
      .from(inventoryCatalogParts)
      .where(
        and(
          eq(inventoryCatalogParts.organizationId, organizationId),
          eq(inventoryCatalogParts.id, partId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async insertSparePart(
    values: typeof inventoryCatalogParts.$inferInsert,
  ): Promise<SparePartRow> {
    const rows = await this.db
      .insert(inventoryCatalogParts)
      .values(values)
      .returning();
    return rows[0];
  }

  async updateSparePart(
    organizationId: string,
    partId: string,
    patch: Partial<typeof inventoryCatalogParts.$inferInsert>,
  ): Promise<SparePartRow | null> {
    const rows = await this.db
      .update(inventoryCatalogParts)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(inventoryCatalogParts.organizationId, organizationId),
          eq(inventoryCatalogParts.id, partId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async listStockReceipts(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: { search?: string; isActive?: boolean },
  ) {
    const conditions = [
      eq(inventoryStockReceipts.organizationId, organizationId),
    ];
    if (opts.isActive !== undefined) {
      conditions.push(eq(inventoryStockReceipts.isActive, opts.isActive));
    }
    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      conditions.push(
        or(
          ilike(inventoryStockReceipts.receiptNumber, term),
          ilike(inventoryStockReceipts.batchLotReference, term),
          ilike(inventoryStockReceipts.purchaseInvoiceReference, term),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(inventoryStockReceipts)
        .where(where)
        .orderBy(desc(inventoryStockReceipts.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(inventoryStockReceipts)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getStockReceiptInOrg(organizationId: string, receiptId: string) {
    const rows = await this.db
      .select()
      .from(inventoryStockReceipts)
      .where(
        and(
          eq(inventoryStockReceipts.organizationId, organizationId),
          eq(inventoryStockReceipts.id, receiptId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async insertStockReceipt(
    values: typeof inventoryStockReceipts.$inferInsert,
  ): Promise<StockReceiptRow> {
    const rows = await this.db
      .insert(inventoryStockReceipts)
      .values(values)
      .returning();
    return rows[0];
  }

  async updateStockReceipt(
    organizationId: string,
    receiptId: string,
    patch: Partial<typeof inventoryStockReceipts.$inferInsert>,
  ): Promise<StockReceiptRow | null> {
    const rows = await this.db
      .update(inventoryStockReceipts)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(inventoryStockReceipts.organizationId, organizationId),
          eq(inventoryStockReceipts.id, receiptId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async quantityByPartAndLocation(organizationId: string, partId: string) {
    return this.db
      .select({
        locationId: inventoryStockReceipts.locationId,
        locationName: organisationLocations.name,
        quantity: sum(inventoryStockReceipts.quantityReceived).mapWith(Number),
      })
      .from(inventoryStockReceipts)
      .innerJoin(
        organisationLocations,
        eq(inventoryStockReceipts.locationId, organisationLocations.id),
      )
      .where(
        and(
          eq(inventoryStockReceipts.organizationId, organizationId),
          eq(inventoryStockReceipts.partId, partId),
          eq(inventoryStockReceipts.isActive, true),
        ),
      )
      .groupBy(inventoryStockReceipts.locationId, organisationLocations.name);
  }

  async listStockBalanceParts(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
  ) {
    const partConditions = [
      eq(inventoryCatalogParts.organizationId, organizationId),
      eq(inventoryCatalogParts.isActive, true),
    ];
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      partConditions.push(
        or(
          ilike(inventoryCatalogParts.name, term),
          ilike(inventoryCatalogParts.partCode, term),
        )!,
      );
    }
    const where = and(...partConditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(inventoryCatalogParts)
        .where(where)
        .orderBy(inventoryCatalogParts.name)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(inventoryCatalogParts)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async onHandTotalForPart(organizationId: string, partId: string) {
    const rows = await this.db
      .select({
        total: sum(inventoryStockReceipts.quantityReceived).mapWith(Number),
      })
      .from(inventoryStockReceipts)
      .where(
        and(
          eq(inventoryStockReceipts.organizationId, organizationId),
          eq(inventoryStockReceipts.partId, partId),
          eq(inventoryStockReceipts.isActive, true),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  async listPartsRequests(
    organizationId: string,
    page: number,
    pageSize: number,
    opts: { search?: string; status?: string },
  ) {
    const conditions = [
      eq(inventoryPartsRequests.organizationId, organizationId),
    ];
    if (opts.status) {
      conditions.push(
        eq(
          inventoryPartsRequests.status,
          opts.status as PartsRequestRow['status'],
        ),
      );
    }
    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      conditions.push(
        or(
          ilike(inventoryPartsRequests.requestNumber, term),
          ilike(inventoryPartsRequests.workOrderRef, term),
          ilike(inventoryPartsRequests.vehicleRef, term),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(inventoryPartsRequests)
        .where(where)
        .orderBy(desc(inventoryPartsRequests.requestedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(inventoryPartsRequests)
        .where(where),
    ]);
    return { rows, total: Number(totalRow[0]?.total ?? 0) };
  }

  async getPartsRequestInOrg(organizationId: string, requestId: string) {
    const rows = await this.db
      .select()
      .from(inventoryPartsRequests)
      .where(
        and(
          eq(inventoryPartsRequests.organizationId, organizationId),
          eq(inventoryPartsRequests.id, requestId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getPartsByIds(organizationId: string, partIds: string[]) {
    if (partIds.length === 0) return [];
    return this.db
      .select()
      .from(inventoryCatalogParts)
      .where(
        and(
          eq(inventoryCatalogParts.organizationId, organizationId),
          inArray(inventoryCatalogParts.id, partIds),
        ),
      );
  }

  async getLocationsByIds(organizationId: string, locationIds: string[]) {
    if (locationIds.length === 0) return [];
    return this.db
      .select({
        id: organisationLocations.id,
        name: organisationLocations.name,
      })
      .from(organisationLocations)
      .where(
        and(
          eq(organisationLocations.organizationId, organizationId),
          inArray(organisationLocations.id, locationIds),
        ),
      );
  }

  async insertPartsRequest(
    values: typeof inventoryPartsRequests.$inferInsert,
  ): Promise<PartsRequestRow> {
    const rows = await this.db
      .insert(inventoryPartsRequests)
      .values(values)
      .returning();
    return rows[0];
  }
}
