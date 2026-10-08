import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  financeInvoiceLines,
  financeInvoiceNumberSequences,
  financeInvoicePayments,
  financeInvoices,
  financeVendorPaymentNumberSequences,
  inventoryCatalogParts,
  organisationSuppliers,
} from '../../../database/schema';
import {
  formatInvoiceNumber,
  formatVendorPaymentNumber,
  type FinanceInvoiceStatus,
  type FinanceInvoiceType,
} from '../constants/invoice.constants';

export type InvoiceRow = typeof financeInvoices.$inferSelect;
export type InvoiceLineRow = typeof financeInvoiceLines.$inferSelect;
export type InventoryPartRow = typeof inventoryCatalogParts.$inferSelect;

@Injectable()
export class FinanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async getSupplierInOrg(organizationId: string, supplierId: string) {
    const [row] = await this.db
      .select({
        id: organisationSuppliers.id,
        name: organisationSuppliers.name,
        isActive: organisationSuppliers.isActive,
      })
      .from(organisationSuppliers)
      .where(
        and(
          eq(organisationSuppliers.organizationId, organizationId),
          eq(organisationSuppliers.id, supplierId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getPartInOrg(organizationId: string, partId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryCatalogParts)
      .where(
        and(
          eq(inventoryCatalogParts.organizationId, organizationId),
          eq(inventoryCatalogParts.id, partId),
          eq(inventoryCatalogParts.isActive, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async allocateInvoiceNumber(
    tx: AppDatabase,
    organizationId: string,
    year: number,
    invoiceType: FinanceInvoiceType,
  ): Promise<string> {
    await tx
      .insert(financeInvoiceNumberSequences)
      .values({ organizationId, year, lastSeq: 0 })
      .onConflictDoNothing({
        target: [
          financeInvoiceNumberSequences.organizationId,
          financeInvoiceNumberSequences.year,
        ],
      });

    const [seqRow] = await tx
      .update(financeInvoiceNumberSequences)
      .set({ lastSeq: sql`${financeInvoiceNumberSequences.lastSeq} + 1` })
      .where(
        and(
          eq(financeInvoiceNumberSequences.organizationId, organizationId),
          eq(financeInvoiceNumberSequences.year, year),
        ),
      )
      .returning({ lastSeq: financeInvoiceNumberSequences.lastSeq });

    const seq = seqRow?.lastSeq ?? 1;
    return formatInvoiceNumber(invoiceType, year, seq);
  }

  /** @deprecated Use allocateInvoiceNumber with invoiceType */
  async allocatePurchaseInvoiceNumber(
    tx: AppDatabase,
    organizationId: string,
    year: number,
  ): Promise<string> {
    return this.allocateInvoiceNumber(tx, organizationId, year, 'purchase');
  }

  async insertInvoiceWithLine(
    tx: AppDatabase,
    invoice: typeof financeInvoices.$inferInsert,
    line: typeof financeInvoiceLines.$inferInsert,
  ): Promise<InvoiceRow> {
    const [created] = await tx
      .insert(financeInvoices)
      .values(invoice)
      .returning();
    if (!created) throw new Error('Invoice insert failed');
    await tx.insert(financeInvoiceLines).values({
      ...line,
      invoiceId: created.id,
    });
    return created;
  }

  async listInvoices(
    organizationId: string,
    page: number,
    pageSize: number,
    filters: {
      search?: string;
      status?: FinanceInvoiceStatus;
      invoiceType?: FinanceInvoiceType;
    },
  ) {
    const conditions = [eq(financeInvoices.organizationId, organizationId)];

    if (filters.status) {
      conditions.push(eq(financeInvoices.status, filters.status));
    } else {
      conditions.push(ne(financeInvoices.status, 'cancelled'));
    }

    if (filters.invoiceType) {
      conditions.push(eq(financeInvoices.invoiceType, filters.invoiceType));
    }

    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(financeInvoices.invoiceNumber, pattern),
          ilike(financeInvoices.partyName, pattern),
          ilike(financeInvoices.description, pattern),
        )!,
      );
    }

    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: count() })
      .from(financeInvoices)
      .where(where);

    const rows = await this.db
      .select()
      .from(financeInvoices)
      .where(where)
      .orderBy(desc(financeInvoices.invoiceDate), desc(financeInvoices.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { rows, total: Number(countRow?.total ?? 0) };
  }

  async getInvoiceInOrg(organizationId: string, invoiceId: string) {
    const [invoice] = await this.db
      .select()
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.id, invoiceId),
        ),
      )
      .limit(1);
    if (!invoice) return null;

    const lines = await this.db
      .select()
      .from(financeInvoiceLines)
      .where(eq(financeInvoiceLines.invoiceId, invoiceId));

    return { invoice, lines };
  }

  async deleteInvoiceHard(
    organizationId: string,
    invoiceId: string,
  ): Promise<InvoiceRow | null> {
    const [deleted] = await this.db
      .delete(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.id, invoiceId),
        ),
      )
      .returning();
    return deleted ?? null;
  }

  async cancelInvoice(
    organizationId: string,
    invoiceId: string,
    cancelReason?: string | null,
  ): Promise<InvoiceRow | null> {
    const [updated] = await this.db
      .update(financeInvoices)
      .set({
        status: 'cancelled',
        cancelReason: cancelReason?.trim() || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.id, invoiceId),
          sql`${financeInvoices.status} != 'cancelled'`,
        ),
      )
      .returning();
    return updated ?? null;
  }

  async updateUnpaidInvoice(
    organizationId: string,
    invoiceId: string,
    patch: Partial<
      Pick<
        typeof financeInvoices.$inferInsert,
        | 'partyName'
        | 'partyEmail'
        | 'description'
        | 'totalAmountMinor'
        | 'invoiceDate'
        | 'notes'
        | 'billingPeriod'
      >
    >,
    db: AppDatabase = this.db,
  ): Promise<InvoiceRow | null> {
    const [updated] = await db
      .update(financeInvoices)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.id, invoiceId),
          eq(financeInvoices.status, 'unpaid'),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async listPaymentsForInvoice(invoiceId: string) {
    return this.db
      .select()
      .from(financeInvoicePayments)
      .where(eq(financeInvoicePayments.invoiceId, invoiceId))
      .orderBy(
        desc(financeInvoicePayments.paymentDate),
        desc(financeInvoicePayments.id),
      );
  }

  async insertPaymentRow(
    tx: AppDatabase,
    row: typeof financeInvoicePayments.$inferInsert,
  ) {
    const [created] = await tx
      .insert(financeInvoicePayments)
      .values(row)
      .returning();
    if (!created) throw new Error('Payment insert failed');
    return created;
  }

  async applyPaymentTotals(
    tx: AppDatabase,
    organizationId: string,
    invoiceId: string,
    newAmountPaidMinor: number,
    newStatus: FinanceInvoiceStatus,
  ) {
    const [updated] = await tx
      .update(financeInvoices)
      .set({
        amountPaidMinor: newAmountPaidMinor,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.id, invoiceId),
          ne(financeInvoices.status, 'cancelled'),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async updateInvoiceLineAmount(
    tx: AppDatabase,
    invoiceId: string,
    lineAmountMinor: number,
  ) {
    await tx
      .update(financeInvoiceLines)
      .set({ lineAmountMinor })
      .where(eq(financeInvoiceLines.invoiceId, invoiceId));
  }

  async listInventoryParts(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
  ) {
    const conditions = [
      eq(inventoryCatalogParts.organizationId, organizationId),
      eq(inventoryCatalogParts.isActive, true),
    ];

    const trimmed = search?.trim();
    if (trimmed) {
      const pattern = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(inventoryCatalogParts.name, pattern),
          ilike(inventoryCatalogParts.partCode, pattern),
        )!,
      );
    }

    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: count() })
      .from(inventoryCatalogParts)
      .where(where);

    const rows = await this.db
      .select()
      .from(inventoryCatalogParts)
      .where(where)
      .orderBy(inventoryCatalogParts.name)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { rows, total: Number(countRow?.total ?? 0) };
  }

  async createInventoryPart(
    values: typeof inventoryCatalogParts.$inferInsert,
  ): Promise<InventoryPartRow> {
    const [row] = await this.db
      .insert(inventoryCatalogParts)
      .values(values)
      .returning();
    if (!row) throw new Error('Part insert failed');
    return row;
  }

  async getPartNamesByIds(ids: string[]) {
    if (ids.length === 0) return new Map<string, string>();
    const rows = await this.db
      .select({
        id: inventoryCatalogParts.id,
        name: inventoryCatalogParts.name,
      })
      .from(inventoryCatalogParts)
      .where(inArray(inventoryCatalogParts.id, ids));
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  async hasAnyBillingInvoiceEver(organizationId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ total: count() })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceType, 'billing'),
        ),
      );
    return Number(row?.total ?? 0) > 0;
  }

  async aggregateBillingByClientIdsInPeriod(
    organizationId: string,
    clientIds: string[],
    periodStart: string,
    periodEnd: string,
  ): Promise<
    Map<
      string,
      {
        invoiceCount: number;
        totalBilledMinor: number;
        totalPaidMinor: number;
        balanceDueMinor: number;
      }
    >
  > {
    if (clientIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        clientId: financeInvoices.clientId,
        invoiceCount: count(),
        totalBilledMinor: sql<number>`coalesce(sum(case when ${financeInvoices.status} != 'cancelled' then ${financeInvoices.totalAmountMinor} else 0 end), 0)::bigint`,
        totalPaidMinor: sql<number>`coalesce(sum(case when ${financeInvoices.status} != 'cancelled' then ${financeInvoices.amountPaidMinor} else 0 end), 0)::bigint`,
      })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceType, 'billing'),
          isNotNull(financeInvoices.clientId),
          inArray(financeInvoices.clientId, clientIds),
          gte(financeInvoices.invoiceDate, periodStart),
          lte(financeInvoices.invoiceDate, periodEnd),
        ),
      )
      .groupBy(financeInvoices.clientId);

    const map = new Map<
      string,
      {
        invoiceCount: number;
        totalBilledMinor: number;
        totalPaidMinor: number;
        balanceDueMinor: number;
      }
    >();

    for (const row of rows) {
      if (!row.clientId) continue;
      const totalBilledMinor = Number(row.totalBilledMinor ?? 0);
      const totalPaidMinor = Number(row.totalPaidMinor ?? 0);
      map.set(row.clientId, {
        invoiceCount: Number(row.invoiceCount ?? 0),
        totalBilledMinor,
        totalPaidMinor,
        balanceDueMinor: Math.max(0, totalBilledMinor - totalPaidMinor),
      });
    }
    return map;
  }

  async countNonCancelledBillingInvoicesForClientInPeriod(
    organizationId: string,
    clientId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceType, 'billing'),
          eq(financeInvoices.clientId, clientId),
          ne(financeInvoices.status, 'cancelled'),
          gte(financeInvoices.invoiceDate, periodStart),
          lte(financeInvoices.invoiceDate, periodEnd),
        ),
      );
    return Number(row?.total ?? 0);
  }

  async listBillingInvoicesForClientInPeriod(
    organizationId: string,
    clientId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<InvoiceRow[]> {
    return this.db
      .select()
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.organizationId, organizationId),
          eq(financeInvoices.invoiceType, 'billing'),
          eq(financeInvoices.clientId, clientId),
          gte(financeInvoices.invoiceDate, periodStart),
          lte(financeInvoices.invoiceDate, periodEnd),
        ),
      )
      .orderBy(desc(financeInvoices.invoiceDate), desc(financeInvoices.id));
  }

  async allocateVendorPaymentNumber(
    tx: AppDatabase,
    organizationId: string,
    year: number,
  ): Promise<string> {
    await tx
      .insert(financeVendorPaymentNumberSequences)
      .values({ organizationId, year, lastSeq: 0 })
      .onConflictDoNothing({
        target: [
          financeVendorPaymentNumberSequences.organizationId,
          financeVendorPaymentNumberSequences.year,
        ],
      });

    const [seqRow] = await tx
      .update(financeVendorPaymentNumberSequences)
      .set({
        lastSeq: sql`${financeVendorPaymentNumberSequences.lastSeq} + 1`,
      })
      .where(
        and(
          eq(
            financeVendorPaymentNumberSequences.organizationId,
            organizationId,
          ),
          eq(financeVendorPaymentNumberSequences.year, year),
        ),
      )
      .returning({ lastSeq: financeVendorPaymentNumberSequences.lastSeq });

    const seq = seqRow?.lastSeq ?? 1;
    return formatVendorPaymentNumber(year, seq);
  }

  async listVendorPayments(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
  ) {
    const baseConditions = [
      eq(financeInvoicePayments.organizationId, organizationId),
      eq(financeInvoices.invoiceType, 'purchase'),
    ];

    const trimmed = search?.trim();
    if (trimmed) {
      const pattern = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;
      baseConditions.push(
        or(
          ilike(financeInvoicePayments.paymentNumber, pattern),
          ilike(financeInvoices.invoiceNumber, pattern),
          ilike(financeInvoices.partyName, pattern),
        )!,
      );
    }

    const where = and(...baseConditions);

    const [countRow] = await this.db
      .select({ total: count() })
      .from(financeInvoicePayments)
      .innerJoin(
        financeInvoices,
        eq(financeInvoicePayments.invoiceId, financeInvoices.id),
      )
      .where(where);

    const rows = await this.db
      .select({
        payment: financeInvoicePayments,
        invoiceNumber: financeInvoices.invoiceNumber,
        invoiceId: financeInvoices.id,
        vendorName: financeInvoices.partyName,
      })
      .from(financeInvoicePayments)
      .innerJoin(
        financeInvoices,
        eq(financeInvoicePayments.invoiceId, financeInvoices.id),
      )
      .where(where)
      .orderBy(
        desc(financeInvoicePayments.paymentDate),
        desc(financeInvoicePayments.createdAt),
        desc(financeInvoicePayments.id),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { rows, total: Number(countRow?.total ?? 0) };
  }

  async getVendorPaymentInOrg(organizationId: string, paymentId: string) {
    const [row] = await this.db
      .select({
        payment: financeInvoicePayments,
        invoice: financeInvoices,
      })
      .from(financeInvoicePayments)
      .innerJoin(
        financeInvoices,
        eq(financeInvoicePayments.invoiceId, financeInvoices.id),
      )
      .where(
        and(
          eq(financeInvoicePayments.organizationId, organizationId),
          eq(financeInvoicePayments.id, paymentId),
          eq(financeInvoices.invoiceType, 'purchase'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getLatestPaymentIdForInvoice(
    invoiceId: string,
  ): Promise<string | null> {
    const map = await this.getLatestPaymentIdsForInvoices([invoiceId]);
    return map.get(invoiceId) ?? null;
  }

  async getLatestPaymentIdsForInvoices(
    invoiceIds: string[],
  ): Promise<Map<string, string>> {
    if (invoiceIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        invoiceId: financeInvoicePayments.invoiceId,
        id: financeInvoicePayments.id,
        paymentDate: financeInvoicePayments.paymentDate,
        createdAt: financeInvoicePayments.createdAt,
      })
      .from(financeInvoicePayments)
      .where(inArray(financeInvoicePayments.invoiceId, invoiceIds))
      .orderBy(
        desc(financeInvoicePayments.paymentDate),
        desc(financeInvoicePayments.createdAt),
        desc(financeInvoicePayments.id),
      );

    const latest = new Map<string, string>();
    for (const row of rows) {
      if (!latest.has(row.invoiceId)) {
        latest.set(row.invoiceId, row.id);
      }
    }
    return latest;
  }

  async deletePaymentById(
    tx: AppDatabase,
    organizationId: string,
    paymentId: string,
  ) {
    const [deleted] = await tx
      .delete(financeInvoicePayments)
      .where(
        and(
          eq(financeInvoicePayments.organizationId, organizationId),
          eq(financeInvoicePayments.id, paymentId),
        ),
      )
      .returning();
    return deleted ?? null;
  }

  async listPurchaseInvoicesWithBalanceDue(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
  ) {
    const conditions = [
      eq(financeInvoices.organizationId, organizationId),
      eq(financeInvoices.invoiceType, 'purchase'),
      ne(financeInvoices.status, 'cancelled'),
      ne(financeInvoices.status, 'paid'),
      sql`${financeInvoices.totalAmountMinor} > ${financeInvoices.amountPaidMinor}`,
    ];

    const trimmed = search?.trim();
    if (trimmed) {
      const pattern = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(financeInvoices.invoiceNumber, pattern),
          ilike(financeInvoices.partyName, pattern),
        )!,
      );
    }

    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: count() })
      .from(financeInvoices)
      .where(where);

    const rows = await this.db
      .select({
        id: financeInvoices.id,
        invoiceNumber: financeInvoices.invoiceNumber,
        partyName: financeInvoices.partyName,
        totalAmountMinor: financeInvoices.totalAmountMinor,
        amountPaidMinor: financeInvoices.amountPaidMinor,
        invoiceDate: financeInvoices.invoiceDate,
        status: financeInvoices.status,
      })
      .from(financeInvoices)
      .where(where)
      .orderBy(desc(financeInvoices.invoiceDate), desc(financeInvoices.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { rows, total: Number(countRow?.total ?? 0) };
  }
}
