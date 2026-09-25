import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  fleetApprovalRequests,
  fleetClientPocs,
  fleetClients,
  fleetReturnInspections,
  fleetVehicles,
  leaseContractAssetLines,
  leaseContractEvents,
  leaseContracts,
  leaseContractVehicles,
} from '../../../database/schema';
import type { LeaseContractStatus } from '../constants/lease-contract-status';

@Injectable()
export class FleetLeasingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async nextContractNumber(organizationId: string): Promise<string> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaseContracts)
      .where(eq(leaseContracts.organizationId, organizationId));
    const seq = (row?.count ?? 0) + 2000;
    return `LC-${seq}`;
  }

  async countContractsByStatuses(
    organizationId: string,
    statuses: LeaseContractStatus[],
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaseContracts)
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          inArray(leaseContracts.status, statuses),
        ),
      );
    return row?.count ?? 0;
  }

  async listContracts(params: {
    organizationId: string;
    page: number;
    pageSize: number;
    statusFilter: LeaseContractStatus[] | null;
    search?: string;
  }) {
    const { organizationId, page, pageSize, statusFilter, search } = params;
    const offset = (page - 1) * pageSize;
    const conditions = [eq(leaseContracts.organizationId, organizationId)];
    if (statusFilter?.length) {
      conditions.push(inArray(leaseContracts.status, statusFilter));
    }
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(leaseContracts.contractNumber, q),
          ilike(fleetClients.companyName, q),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          contract: leaseContracts,
          clientCompanyName: fleetClients.companyName,
        })
        .from(leaseContracts)
        .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
        .where(where)
        .orderBy(desc(leaseContracts.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(leaseContracts)
        .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findContractInOrg(organizationId: string, contractId: string) {
    const [row] = await this.db
      .select()
      .from(leaseContracts)
      .where(
        and(
          eq(leaseContracts.id, contractId),
          eq(leaseContracts.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getClientInOrg(organizationId: string, clientId: string) {
    const [row] = await this.db
      .select()
      .from(fleetClients)
      .where(
        and(
          eq(fleetClients.id, clientId),
          eq(fleetClients.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listAssetLines(contractId: string) {
    return this.db
      .select()
      .from(leaseContractAssetLines)
      .where(eq(leaseContractAssetLines.contractId, contractId))
      .orderBy(leaseContractAssetLines.sortOrder);
  }

  async listContractVehicleIds(contractId: string): Promise<string[]> {
    const rows = await this.db
      .select({ vehicleId: leaseContractVehicles.vehicleId })
      .from(leaseContractVehicles)
      .where(eq(leaseContractVehicles.contractId, contractId));
    return rows.map((r) => r.vehicleId);
  }

  /** Allocated vehicles on contract, grouped by fleet vehicle asset class. */
  async countAllocatedVehiclesByAssetClass(
    contractId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        assetClass: fleetVehicles.assetClass,
        count: sql<number>`count(*)::int`,
      })
      .from(leaseContractVehicles)
      .innerJoin(
        fleetVehicles,
        eq(leaseContractVehicles.vehicleId, fleetVehicles.id),
      )
      .where(eq(leaseContractVehicles.contractId, contractId))
      .groupBy(fleetVehicles.assetClass);
    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.assetClass] = row.count;
    }
    return out;
  }

  async listEvents(contractId: string, limit = 50) {
    return this.db
      .select()
      .from(leaseContractEvents)
      .where(eq(leaseContractEvents.contractId, contractId))
      .orderBy(desc(leaseContractEvents.createdAt))
      .limit(limit);
  }

  async countRegisteredReturns(contractId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(fleetReturnInspections)
      .where(
        and(
          eq(fleetReturnInspections.contractId, contractId),
          eq(fleetReturnInspections.registeredReturn, true),
        ),
      );
    return row?.count ?? 0;
  }

  async countCommittedVehicles(contractId: string): Promise<number> {
    const lines = await this.listAssetLines(contractId);
    return lines.reduce((sum, l) => sum + l.committedQuantity, 0);
  }

  async getVehicleInOrg(organizationId: string, vehicleId: string) {
    const [row] = await this.db
      .select()
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.id, vehicleId),
          eq(fleetVehicles.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async countAvailableVehiclesForClass(
    organizationId: string,
    assetClass: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.organizationId, organizationId),
          eq(fleetVehicles.assetClass, assetClass),
          eq(fleetVehicles.status, 'available'),
        ),
      );
    return row?.count ?? 0;
  }

  async countInboundVehiclesForClass(
    organizationId: string,
    assetClass: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.organizationId, organizationId),
          eq(fleetVehicles.assetClass, assetClass),
          inArray(fleetVehicles.status, ['inbound', 'reserved']),
        ),
      );
    return row?.count ?? 0;
  }

  async getAssetClassInventory(
    organizationId: string,
    assetClass: string,
  ): Promise<{ availableNow: number; inbound: number }> {
    const [availableNow, inbound] = await Promise.all([
      this.countAvailableVehiclesForClass(organizationId, assetClass),
      this.countInboundVehiclesForClass(organizationId, assetClass),
    ]);
    return { availableNow, inbound };
  }

  async insertContract(
    values: typeof leaseContracts.$inferInsert,
  ): Promise<typeof leaseContracts.$inferSelect> {
    const [row] = await this.db.insert(leaseContracts).values(values).returning();
    return row;
  }

  async updateContract(
    contractId: string,
    organizationId: string,
    patch: Partial<typeof leaseContracts.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(leaseContracts)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(leaseContracts.id, contractId),
          eq(leaseContracts.organizationId, organizationId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async replaceAssetLines(
    contractId: string,
    lines: Omit<
      typeof leaseContractAssetLines.$inferInsert,
      'id' | 'contractId' | 'createdAt' | 'updatedAt'
    >[],
  ) {
    await this.db
      .delete(leaseContractAssetLines)
      .where(eq(leaseContractAssetLines.contractId, contractId));
    if (lines.length === 0) return [];
    return this.db
      .insert(leaseContractAssetLines)
      .values(lines.map((l, i) => ({ ...l, contractId, sortOrder: i })))
      .returning();
  }

  async replaceContractVehicles(contractId: string, vehicleIds: string[]) {
    await this.db
      .delete(leaseContractVehicles)
      .where(eq(leaseContractVehicles.contractId, contractId));
    if (vehicleIds.length === 0) return;
    await this.db.insert(leaseContractVehicles).values(
      vehicleIds.map((vehicleId) => ({ contractId, vehicleId })),
    );
  }

  async insertEvent(values: typeof leaseContractEvents.$inferInsert) {
    const [row] = await this.db
      .insert(leaseContractEvents)
      .values(values)
      .returning();
    return row;
  }

  async insertApproval(
    values: typeof fleetApprovalRequests.$inferInsert,
  ) {
    const [row] = await this.db
      .insert(fleetApprovalRequests)
      .values(values)
      .returning();
    return row;
  }

  async findPendingApproval(contractId: string, sourceType: 'contract_rate_exception' | 'contract_termination') {
    const [row] = await this.db
      .select()
      .from(fleetApprovalRequests)
      .where(
        and(
          eq(fleetApprovalRequests.contractId, contractId),
          eq(fleetApprovalRequests.sourceType, sourceType),
          eq(fleetApprovalRequests.status, 'pending'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async resolveApproval(
    approvalId: string,
    status: 'approved' | 'rejected',
    resolvedByUserId: string,
  ) {
    const [row] = await this.db
      .update(fleetApprovalRequests)
      .set({
        status,
        resolvedByUserId,
        resolvedAt: new Date(),
      })
      .where(eq(fleetApprovalRequests.id, approvalId))
      .returning();
    return row ?? null;
  }

  async countClientsInOrg(organizationId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(fleetClients)
      .where(eq(fleetClients.organizationId, organizationId));
    return row?.count ?? 0;
  }

  async countContractsForClient(clientId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaseContracts)
      .where(eq(leaseContracts.clientId, clientId));
    return row?.count ?? 0;
  }

  async searchClients(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
  ) {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(fleetClients.organizationId, organizationId)];
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(fleetClients.companyName, q),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(fleetClientPocs)
              .where(
                and(
                  eq(fleetClientPocs.clientId, fleetClients.id),
                  or(
                    ilike(fleetClientPocs.name, q),
                    ilike(fleetClientPocs.email, q),
                  ),
                ),
              ),
          ),
        )!,
      );
    }
    const where = and(...conditions);
    const [clientRows, countRows] = await Promise.all([
      this.db
        .select()
        .from(fleetClients)
        .where(where)
        .orderBy(fleetClients.companyName)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fleetClients)
        .where(where),
    ]);
    const rows = await Promise.all(
      clientRows.map(async (client) => ({
        ...client,
        primaryPoc: await this.getPrimaryPocForClient(client.id),
      })),
    );
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async getPrimaryPocForClient(clientId: string) {
    const [row] = await this.db
      .select()
      .from(fleetClientPocs)
      .where(
        and(
          eq(fleetClientPocs.clientId, clientId),
          eq(fleetClientPocs.isPrimary, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getClientWithPocs(organizationId: string, clientId: string) {
    const client = await this.getClientInOrg(organizationId, clientId);
    if (!client) return null;
    const pocs = await this.db
      .select()
      .from(fleetClientPocs)
      .where(eq(fleetClientPocs.clientId, clientId))
      .orderBy(fleetClientPocs.sortOrder);
    return { client, pocs };
  }

  async insertClient(values: typeof fleetClients.$inferInsert) {
    const [row] = await this.db.insert(fleetClients).values(values).returning();
    return row;
  }

  async updateClient(
    clientId: string,
    organizationId: string,
    patch: Partial<typeof fleetClients.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(fleetClients)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(fleetClients.id, clientId),
          eq(fleetClients.organizationId, organizationId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async replaceClientPocs(
    clientId: string,
    pocs: Omit<
      typeof fleetClientPocs.$inferInsert,
      'id' | 'clientId' | 'createdAt' | 'updatedAt'
    >[],
  ) {
    await this.db
      .delete(fleetClientPocs)
      .where(eq(fleetClientPocs.clientId, clientId));
    if (pocs.length === 0) return [];
    return this.db
      .insert(fleetClientPocs)
      .values(pocs.map((p) => ({ ...p, clientId })))
      .returning();
  }

  async listVehicles(
    organizationId: string,
    page: number,
    pageSize: number,
    status?: string,
    assetClass?: string,
  ) {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(fleetVehicles.organizationId, organizationId)];
    if (status) {
      conditions.push(eq(fleetVehicles.status, status as 'available'));
    }
    if (assetClass) {
      conditions.push(eq(fleetVehicles.assetClass, assetClass));
    }
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(fleetVehicles)
        .where(where)
        .orderBy(fleetVehicles.registrationNo)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fleetVehicles)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async insertVehicle(values: typeof fleetVehicles.$inferInsert) {
    const [row] = await this.db.insert(fleetVehicles).values(values).returning();
    return row;
  }

  async updateVehicleStatus(vehicleId: string, status: 'available' | 'leased' | 'returned') {
    await this.db
      .update(fleetVehicles)
      .set({ status, updatedAt: new Date() })
      .where(eq(fleetVehicles.id, vehicleId));
  }

  async insertReturnInspection(
    values: typeof fleetReturnInspections.$inferInsert,
  ) {
    const [row] = await this.db
      .insert(fleetReturnInspections)
      .values(values)
      .onConflictDoUpdate({
        target: [
          fleetReturnInspections.contractId,
          fleetReturnInspections.vehicleId,
        ],
        set: {
          odometerReading: values.odometerReading,
          conditionChecklist: values.conditionChecklist,
          damageRecordId: values.damageRecordId ?? null,
          registeredReturn: true,
        },
      })
      .returning();
    return row;
  }
}
