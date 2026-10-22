import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  ne,
  notExists,
  notInArray,
  isNull,
  or,
  sql,
  type AnyColumn,
} from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  fleetApprovalRequests,
  fleetClientPocs,
  fleetClients,
  fleetDamageRecords,
  fleetReturnInspections,
  financeInvoiceLines,
  fleetVehicleAllocations,
  fleetVehicles,
  organisationClients,
  leaseContractAssetLines,
  leaseContractEditLogs,
  leaseContractEvents,
  leaseContracts,
  leaseContractVehicles,
  users,
  assetRegisterAssetClasses,
  assetRegisterVehicleAssignments,
  assetRegisterVehicles,
} from '../../../database/schema';
import {
  ALLOCATION_ELIGIBLE_CONTRACT_STATUSES,
  ASSET_POOL_COMMITMENT_CONTRACT_STATUSES,
  type LeaseContractStatus,
} from '../constants/lease-contract-status';
import {
  FLEET_RETURN_LIST_DEFAULT_SORT,
  type FleetReturnListSortField,
  FLEET_VEHICLE_LIST_DEFAULT_SORT,
  type FleetVehicleListSortField,
  LEASE_CONTRACT_LIST_DEFAULT_SORT,
  type LeaseContractListSortField,
  REPLACEMENT_CANDIDATE_LIST_DEFAULT_SORT,
  type ReplacementCandidateListSortField,
  VEHICLE_ALLOCATION_LIST_DEFAULT_SORT,
  type VehicleAllocationListSortField,
} from '../constants/fleet-leasing-list-sort.constants';
import {
  buildListOrderBy,
  type ResolvedListSort,
} from '../../../common/utils/list-sort.util';

const LEASE_CONTRACT_LIST_SORT_COLUMNS: Record<
  LeaseContractListSortField,
  AnyColumn
> = {
  createdAt: leaseContracts.createdAt,
  contractNumber: leaseContracts.contractNumber,
  status: leaseContracts.status,
  startDate: leaseContracts.startDate,
  endDate: leaseContracts.endDate,
};

const FLEET_VEHICLE_LIST_SORT_COLUMNS: Record<
  FleetVehicleListSortField,
  AnyColumn
> = {
  registrationNo: fleetVehicles.registrationNo,
  assetClass: fleetVehicles.assetClass,
  createdAt: fleetVehicles.createdAt,
};

const VEHICLE_ALLOCATION_LIST_SORT_COLUMNS: Record<
  VehicleAllocationListSortField,
  AnyColumn
> = {
  createdAt: fleetVehicleAllocations.createdAt,
  status: fleetVehicles.status,
};

const FLEET_RETURN_LIST_SORT_COLUMNS: Record<
  FleetReturnListSortField,
  AnyColumn
> = {
  createdAt: fleetReturnInspections.createdAt,
  status: fleetReturnInspections.registeredReturn,
};

const REPLACEMENT_CANDIDATE_LIST_SORT_COLUMNS: Record<
  ReplacementCandidateListSortField,
  AnyColumn
> = {
  registrationNo: fleetVehicles.registrationNo,
  assetClass: fleetVehicles.assetClass,
};

@Injectable()
export class FleetLeasingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  private rowsFromExecute<T>(result: unknown): T[] {
    if (result && typeof result === 'object' && 'rows' in result) {
      return (result as { rows: T[] }).rows;
    }
    return Array.isArray(result) ? (result as T[]) : [];
  }

  async nextContractNumber(organizationId: string): Promise<string> {
    const [row] = await this.db
      .select({
        maxSeq: sql<number>`coalesce(max(
          case
            when ${leaseContracts.contractNumber} ~ '^LC-[0-9]+$'
            then substring(${leaseContracts.contractNumber} from 4)::int
            else null
          end
        ), 1999)`,
      })
      .from(leaseContracts)
      .where(eq(leaseContracts.organizationId, organizationId));
    const seq = (row?.maxSeq ?? 1999) + 1;
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
    sort?: ResolvedListSort<LeaseContractListSortField>;
  }) {
    const { organizationId, page, pageSize, statusFilter, search, sort } =
      params;
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
          ilike(organisationClients.name, q),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          contract: leaseContracts,
          clientCompanyName: sql<
            string | null
          >`coalesce(${organisationClients.name}, ${fleetClients.companyName})`,
          fleetOrganisationClientId: fleetClients.organisationClientId,
        })
        .from(leaseContracts)
        .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
        .leftJoin(
          organisationClients,
          eq(fleetClients.organisationClientId, organisationClients.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            LEASE_CONTRACT_LIST_SORT_COLUMNS,
            sort ?? LEASE_CONTRACT_LIST_DEFAULT_SORT,
            leaseContracts.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(leaseContracts)
        .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
        .leftJoin(
          organisationClients,
          eq(fleetClients.organisationClientId, organisationClients.id),
        )
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

  async findFleetClientByOrganisationClientId(
    organizationId: string,
    organisationClientId: string,
  ) {
    const [row] = await this.db
      .select()
      .from(fleetClients)
      .where(
        and(
          eq(fleetClients.organizationId, organizationId),
          eq(fleetClients.organisationClientId, organisationClientId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findFleetClientsByOrganisationClientIds(
    organizationId: string,
    organisationClientIds: string[],
  ) {
    if (organisationClientIds.length === 0) {
      return new Map<string, typeof fleetClients.$inferSelect>();
    }
    const rows = await this.db
      .select()
      .from(fleetClients)
      .where(
        and(
          eq(fleetClients.organizationId, organizationId),
          inArray(fleetClients.organisationClientId, organisationClientIds),
        ),
      );
    const map = new Map<string, typeof fleetClients.$inferSelect>();
    for (const row of rows) {
      if (row.organisationClientId) {
        map.set(row.organisationClientId, row);
      }
    }
    return map;
  }

  async getPrimaryPocsForClients(clientIds: string[]) {
    const result = new Map<
      string,
      typeof fleetClientPocs.$inferSelect | null
    >();
    for (const id of clientIds) {
      result.set(id, null);
    }
    if (clientIds.length === 0) {
      return result;
    }
    const rows = await this.db
      .select()
      .from(fleetClientPocs)
      .where(
        and(
          inArray(fleetClientPocs.clientId, clientIds),
          eq(fleetClientPocs.isPrimary, true),
        ),
      );
    for (const row of rows) {
      result.set(row.clientId, row);
    }
    return result;
  }

  async listAssetLines(contractId: string) {
    return this.db
      .select()
      .from(leaseContractAssetLines)
      .where(eq(leaseContractAssetLines.contractId, contractId))
      .orderBy(leaseContractAssetLines.sortOrder);
  }

  /** Batched asset lines for list pages (rule 26 list query budget). */
  async listAssetLinesForContractIds(contractIds: string[]) {
    if (contractIds.length === 0) {
      return [];
    }
    return this.db
      .select()
      .from(leaseContractAssetLines)
      .where(inArray(leaseContractAssetLines.contractId, contractIds))
      .orderBy(
        asc(leaseContractAssetLines.contractId),
        asc(leaseContractAssetLines.sortOrder),
      );
  }

  async listContractVehicleIds(contractId: string): Promise<string[]> {
    const rows = await this.db
      .select({ vehicleId: leaseContractVehicles.vehicleId })
      .from(leaseContractVehicles)
      .where(eq(leaseContractVehicles.contractId, contractId));
    return rows.map((r) => r.vehicleId);
  }

  /** Distinct asset classes from fleet vehicle master (org-scoped). */
  async listDistinctAssetClasses(organizationId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ assetClass: fleetVehicles.assetClass })
      .from(fleetVehicles)
      .where(eq(fleetVehicles.organizationId, organizationId))
      .orderBy(asc(fleetVehicles.assetClass));

    return rows
      .map((row) => row.assetClass.trim())
      .filter((assetClass) => assetClass.length > 0);
  }

  /** Active register assignments on contract, grouped by asset class id. */
  async countAllocatedRegisterVehiclesByAssetClassIds(
    contractId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        assetClassId: assetRegisterAssetClasses.id,
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicleAssignments)
      .innerJoin(
        assetRegisterVehicles,
        eq(assetRegisterVehicleAssignments.vehicleId, assetRegisterVehicles.id),
      )
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(
        and(
          eq(assetRegisterVehicleAssignments.leaseContractId, contractId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      )
      .groupBy(assetRegisterAssetClasses.id);
    const out = new Map<string, number>();
    for (const row of rows) {
      if (row.assetClassId) {
        out.set(row.assetClassId, row.count ?? 0);
      }
    }
    return out;
  }

  /** Active asset-register assignments on contract, grouped by asset class name. */
  async countAllocatedVehiclesByAssetClass(
    contractId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        assetClass: assetRegisterAssetClasses.name,
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicleAssignments)
      .innerJoin(
        assetRegisterVehicles,
        eq(assetRegisterVehicleAssignments.vehicleId, assetRegisterVehicles.id),
      )
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(
        and(
          eq(assetRegisterVehicleAssignments.leaseContractId, contractId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      )
      .groupBy(assetRegisterAssetClasses.name);
    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.assetClass.trim()] = row.count;
    }
    return out;
  }

  /**
   * Per contract + asset class name — active register assignment counts (for pool math).
   * Map key: `${contractId}::${trimmedClassName}`.
   */
  async countRegisterAssignmentsByContractsGroupedByClassName(
    contractIds: string[],
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (contractIds.length === 0) {
      return out;
    }
    const rows = await this.db
      .select({
        contractId: assetRegisterVehicleAssignments.leaseContractId,
        className: assetRegisterAssetClasses.name,
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicleAssignments)
      .innerJoin(
        assetRegisterVehicles,
        eq(assetRegisterVehicleAssignments.vehicleId, assetRegisterVehicles.id),
      )
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(
        and(
          inArray(assetRegisterVehicleAssignments.leaseContractId, contractIds),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      )
      .groupBy(
        assetRegisterVehicleAssignments.leaseContractId,
        assetRegisterAssetClasses.name,
      );
    for (const row of rows) {
      const key = `${row.contractId}::${row.className.trim()}`;
      out.set(key, row.count ?? 0);
    }
    return out;
  }

  /**
   * Sum of (committed − allocated) per asset class on other in-flight contracts.
   * Reserves pool capacity not yet tied to register vehicles.
   */
  async sumUnallocatedCommitmentsByAssetClassIds(
    organizationId: string,
    assetClassIds: string[],
    excludeContractId?: string | null,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const uniqueIds = [...new Set(assetClassIds.filter(Boolean))];
    for (const id of uniqueIds) {
      result.set(id, 0);
    }
    if (uniqueIds.length === 0) {
      return result;
    }

    const lines = await this.db
      .select({
        contractId: leaseContracts.id,
        assetClassId: leaseContractAssetLines.assetClassId,
        assetClass: leaseContractAssetLines.assetClass,
        committedQuantity: leaseContractAssetLines.committedQuantity,
      })
      .from(leaseContractAssetLines)
      .innerJoin(
        leaseContracts,
        eq(leaseContractAssetLines.contractId, leaseContracts.id),
      )
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          inArray(
            leaseContracts.status,
            ASSET_POOL_COMMITMENT_CONTRACT_STATUSES,
          ),
          inArray(leaseContractAssetLines.assetClassId, uniqueIds),
          excludeContractId
            ? ne(leaseContracts.id, excludeContractId)
            : undefined,
        ),
      );

    if (lines.length === 0) {
      return result;
    }

    const contractIds = [...new Set(lines.map((l) => l.contractId))];
    const allocatedByContractClass =
      await this.countRegisterAssignmentsByContractsGroupedByClassName(
        contractIds,
      );

    for (const line of lines) {
      const classId = line.assetClassId;
      if (!classId) {
        continue;
      }
      const allocKey = `${line.contractId}::${line.assetClass.trim()}`;
      const allocated = allocatedByContractClass.get(allocKey) ?? 0;
      const unallocated = Math.max(0, line.committedQuantity - allocated);
      result.set(classId, (result.get(classId) ?? 0) + unallocated);
    }

    return result;
  }

  /**
   * Distinct in-flight contracts per asset class with unallocated line quantity
   * (committed − register assignments on that contract/class).
   */
  async countContractsWithUnallocatedDemandByAssetClassIds(
    organizationId: string,
    assetClassIds: string[],
  ): Promise<Map<string, number>> {
    const contractSets = await this.collectOpenDemandContractsByAssetClassId(
      organizationId,
      assetClassIds,
    );
    const result = new Map<string, number>();
    for (const id of assetClassIds) {
      result.set(id, contractSets.get(id)?.size ?? 0);
    }
    return result;
  }

  /** Asset class ids with at least one in-flight contract line needing vehicles. */
  async listAssetClassIdsWithOpenContractDemand(
    organizationId: string,
  ): Promise<string[]> {
    const contractSets = await this.collectOpenDemandContractsByAssetClassId(
      organizationId,
    );
    return [...contractSets.keys()];
  }

  /** Org-wide open lease demand (same rules as assignment list demand badges). */
  async summarizeOpenAssignmentDemandForOrg(organizationId: string): Promise<{
    openDemandUnits: number;
    openDemandContractCount: number;
  }> {
    const contractSets = await this.collectOpenDemandContractsByAssetClassId(
      organizationId,
    );
    const contractIds = new Set<string>();
    for (const set of contractSets.values()) {
      for (const id of set) {
        contractIds.add(id);
      }
    }
    const assetClassIds = [...contractSets.keys()];
    const unitsByClass = await this.sumUnallocatedCommitmentsByAssetClassIds(
      organizationId,
      assetClassIds,
    );
    let openDemandUnits = 0;
    for (const units of unitsByClass.values()) {
      openDemandUnits += units;
    }
    return {
      openDemandUnits,
      openDemandContractCount: contractIds.size,
    };
  }

  private async collectOpenDemandContractsByAssetClassId(
    organizationId: string,
    assetClassIds?: string[],
  ): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();
    const uniqueIds =
      assetClassIds !== undefined
        ? [...new Set(assetClassIds.filter(Boolean))]
        : undefined;

    const lineConditions = [
      eq(leaseContracts.organizationId, organizationId),
      inArray(
        leaseContracts.status,
        ASSET_POOL_COMMITMENT_CONTRACT_STATUSES,
      ),
    ];
    if (uniqueIds !== undefined) {
      if (uniqueIds.length === 0) {
        return result;
      }
      lineConditions.push(
        inArray(leaseContractAssetLines.assetClassId, uniqueIds),
      );
    }

    const lines = await this.db
      .select({
        contractId: leaseContracts.id,
        assetClassId: leaseContractAssetLines.assetClassId,
        assetClass: leaseContractAssetLines.assetClass,
        committedQuantity: leaseContractAssetLines.committedQuantity,
      })
      .from(leaseContractAssetLines)
      .innerJoin(
        leaseContracts,
        eq(leaseContractAssetLines.contractId, leaseContracts.id),
      )
      .where(and(...lineConditions));

    if (lines.length === 0) {
      return result;
    }

    const contractIds = [...new Set(lines.map((l) => l.contractId))];
    const allocatedByContractClass =
      await this.countRegisterAssignmentsByContractsGroupedByClassName(
        contractIds,
      );

    for (const line of lines) {
      const classId = line.assetClassId;
      if (!classId) {
        continue;
      }
      const allocKey = `${line.contractId}::${line.assetClass.trim()}`;
      const allocated = allocatedByContractClass.get(allocKey) ?? 0;
      const unallocated = Math.max(0, line.committedQuantity - allocated);
      if (unallocated <= 0) {
        continue;
      }
      let set = result.get(classId);
      if (!set) {
        set = new Set<string>();
        result.set(classId, set);
      }
      set.add(line.contractId);
    }

    return result;
  }

  /** Active lease contracts in org without an asset line for the given register class. */
  async countActiveContractsWithoutAssetClassLine(
    organizationId: string,
    assetClassId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaseContracts)
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          eq(leaseContracts.status, 'active'),
          notExists(
            this.db
              .select({ one: sql<number>`1` })
              .from(leaseContractAssetLines)
              .where(
                and(
                  eq(leaseContractAssetLines.contractId, leaseContracts.id),
                  eq(leaseContractAssetLines.assetClassId, assetClassId),
                ),
              ),
          ),
        ),
      );
    return row?.count ?? 0;
  }

  async listLeaseContractsForVehicleAssignment(params: {
    organizationId: string;
    assetClassId: string;
    page: number;
    pageSize: number;
    search?: string;
    organisationClientId?: string;
  }): Promise<{
    rows: Array<{
      contractId: string;
      contractNumber: string;
      status: LeaseContractStatus;
      startDate: Date | null;
      endDate: Date | null;
      clientName: string | null;
      organisationClientId: string | null;
      fleetClientId: string | null;
      assetClassName: string;
      committedQuantity: number;
    }>;
    total: number;
  }> {
    const {
      organizationId,
      assetClassId,
      page,
      pageSize,
      search,
      organisationClientId,
    } = params;
    const offset = (page - 1) * pageSize;
    const conditions = [
      eq(leaseContracts.organizationId, organizationId),
      inArray(leaseContracts.status, ALLOCATION_ELIGIBLE_CONTRACT_STATUSES),
      eq(leaseContractAssetLines.assetClassId, assetClassId),
    ];
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(ilike(leaseContracts.contractNumber, q));
    }
    if (organisationClientId) {
      conditions.push(
        eq(fleetClients.organisationClientId, organisationClientId),
      );
    }
    const where = and(...conditions);
    const [lineRows, countRows] = await Promise.all([
      this.db
        .select({
          contractId: leaseContracts.id,
          contractNumber: leaseContracts.contractNumber,
          status: leaseContracts.status,
          startDate: leaseContracts.startDate,
          endDate: leaseContracts.endDate,
          clientName: sql<
            string | null
          >`coalesce(${organisationClients.name}, ${fleetClients.companyName})`,
          organisationClientId: fleetClients.organisationClientId,
          fleetClientId: leaseContracts.clientId,
          assetClassName: leaseContractAssetLines.assetClass,
          committedQuantity: leaseContractAssetLines.committedQuantity,
        })
        .from(leaseContractAssetLines)
        .innerJoin(
          leaseContracts,
          eq(leaseContractAssetLines.contractId, leaseContracts.id),
        )
        .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
        .leftJoin(
          organisationClients,
          eq(fleetClients.organisationClientId, organisationClients.id),
        )
        .where(where)
        .orderBy(desc(leaseContracts.contractNumber))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(leaseContractAssetLines)
        .innerJoin(
          leaseContracts,
          eq(leaseContractAssetLines.contractId, leaseContracts.id),
        )
        .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
        .where(where),
    ]);
    return {
      rows: lineRows.map((row) => ({
        contractId: row.contractId,
        contractNumber: row.contractNumber,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        clientName: row.clientName,
        organisationClientId: row.organisationClientId,
        fleetClientId: row.fleetClientId,
        assetClassName: row.assetClassName,
        committedQuantity: row.committedQuantity,
      })),
      total: countRows[0]?.count ?? 0,
    };
  }

  /** Active lease contracts for bulk-assign catalog (org client optional filter). */
  async listActiveLeaseContractsForBulkAssignCatalog(params: {
    organizationId: string;
    organisationClientId?: string;
    limit?: number;
  }): Promise<
    Array<{
      contractId: string;
      contractNumber: string;
      status: LeaseContractStatus;
      startDate: Date | null;
      endDate: Date | null;
      location: string | null;
      clientName: string | null;
      organisationClientId: string | null;
      fleetClientId: string | null;
    }>
  > {
    const { organizationId, organisationClientId } = params;
    const limit = Math.min(params.limit ?? 50, 50);
    const conditions = [
      eq(leaseContracts.organizationId, organizationId),
      eq(leaseContracts.status, 'active'),
    ];
    if (organisationClientId) {
      conditions.push(
        eq(fleetClients.organisationClientId, organisationClientId),
      );
    } else {
      conditions.push(sql`${fleetClients.organisationClientId} IS NOT NULL`);
    }
    const rows = await this.db
      .select({
        contractId: leaseContracts.id,
        contractNumber: leaseContracts.contractNumber,
        status: leaseContracts.status,
        startDate: leaseContracts.startDate,
        endDate: leaseContracts.endDate,
        location: sql<string | null>`null`,
        clientName: sql<
          string | null
        >`coalesce(${organisationClients.name}, ${fleetClients.companyName})`,
        organisationClientId: fleetClients.organisationClientId,
        fleetClientId: leaseContracts.clientId,
      })
      .from(leaseContracts)
      .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
      .leftJoin(
        organisationClients,
        eq(fleetClients.organisationClientId, organisationClients.id),
      )
      .where(and(...conditions))
      .orderBy(desc(leaseContracts.contractNumber))
      .limit(limit);
    return rows.map((row) => ({
      contractId: row.contractId,
      contractNumber: row.contractNumber,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      location: row.location,
      clientName: row.clientName,
      organisationClientId: row.organisationClientId,
      fleetClientId: row.fleetClientId,
    }));
  }

  async listEvents(contractId: string, limit = 50) {
    return this.db
      .select()
      .from(leaseContractEvents)
      .where(eq(leaseContractEvents.contractId, contractId))
      .orderBy(desc(leaseContractEvents.createdAt))
      .limit(limit);
  }

  async findUserDisplayLabels(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds.filter(Boolean))];
    const out = new Map<string, string>();
    if (unique.length === 0) return out;
    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, unique));
    for (const row of rows) {
      const label = row.fullName?.trim() || row.email?.trim() || 'Unknown user';
      out.set(row.id, label);
    }
    return out;
  }

  async findClientDisplayLabels(
    organizationId: string,
    clientIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(clientIds.filter(Boolean))];
    const out = new Map<string, string>();
    if (unique.length === 0) return out;
    const rows = await this.db
      .select({
        id: fleetClients.id,
        companyName: fleetClients.companyName,
        organisationClientName: organisationClients.name,
      })
      .from(fleetClients)
      .leftJoin(
        organisationClients,
        eq(fleetClients.organisationClientId, organisationClients.id),
      )
      .where(
        and(
          eq(fleetClients.organizationId, organizationId),
          inArray(fleetClients.id, unique),
        ),
      );
    for (const row of rows) {
      const label =
        row.organisationClientName?.trim() ||
        row.companyName?.trim() ||
        'Unknown client';
      out.set(row.id, label);
    }
    return out;
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
    const insertValues = this.normalizeContractInsertValues(values);
    const [row] = await this.db
      .insert(leaseContracts)
      .values(insertValues)
      .returning();
    return row;
  }

  /** Draft create — contract row + asset lines + vehicle links in one transaction. */
  async insertDraftContractWithNested(input: {
    contract: typeof leaseContracts.$inferInsert;
    assetLines: Omit<
      typeof leaseContractAssetLines.$inferInsert,
      'id' | 'contractId' | 'createdAt' | 'updatedAt'
    >[];
    vehicleIds: string[];
    awaitingFutureAssets: boolean;
  }): Promise<typeof leaseContracts.$inferSelect> {
    const insertValues = this.normalizeContractInsertValues(input.contract);
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(leaseContracts)
        .values({
          ...insertValues,
          awaitingFutureAssets: input.awaitingFutureAssets,
        })
        .returning();
      if (input.assetLines.length > 0) {
        await tx.insert(leaseContractAssetLines).values(
          input.assetLines.map((line, sortOrder) => ({
            ...line,
            contractId: row.id,
            sortOrder,
          })),
        );
      }
      if (input.vehicleIds.length > 0) {
        await tx.insert(leaseContractVehicles).values(
          input.vehicleIds.map((vehicleId) => ({
            contractId: row.id,
            vehicleId,
          })),
        );
      }
      return row;
    });
  }

  private normalizeContractInsertValues(
    values: typeof leaseContracts.$inferInsert,
  ) {
    const { clientId, ...rest } = values;
    return clientId === null ||
      clientId === undefined ||
      (typeof clientId === 'string' && clientId.trim() === '')
      ? rest
      : { ...rest, clientId };
  }

  async updateContract(
    contractId: string,
    organizationId: string,
    patch: Partial<typeof leaseContracts.$inferInsert>,
  ) {
    const { clientId, ...rest } = patch;
    const normalizedPatch =
      clientId === undefined
        ? rest
        : clientId === null ||
            (typeof clientId === 'string' && clientId.trim() === '')
          ? { ...rest, clientId: null }
          : { ...rest, clientId };
    const [row] = await this.db
      .update(leaseContracts)
      .set({ ...normalizedPatch, updatedAt: new Date() })
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
    await this.db
      .insert(leaseContractVehicles)
      .values(vehicleIds.map((vehicleId) => ({ contractId, vehicleId })));
  }

  async insertEvent(values: typeof leaseContractEvents.$inferInsert) {
    const [row] = await this.db
      .insert(leaseContractEvents)
      .values(values)
      .returning();
    return row;
  }

  async insertApproval(values: typeof fleetApprovalRequests.$inferInsert) {
    const [row] = await this.db
      .insert(fleetApprovalRequests)
      .values(values)
      .returning();
    return row;
  }

  async findPendingApproval(
    contractId: string,
    sourceType: 'contract_rate_exception' | 'contract_termination',
  ) {
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

  async countContractsForClients(
    clientIds: string[],
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (clientIds.length === 0) {
      return out;
    }
    const rows = await this.db
      .select({
        clientId: leaseContracts.clientId,
        count: sql<number>`count(*)::int`,
      })
      .from(leaseContracts)
      .where(inArray(leaseContracts.clientId, clientIds))
      .groupBy(leaseContracts.clientId);
    for (const row of rows) {
      if (row.clientId) {
        out.set(row.clientId, row.count);
      }
    }
    return out;
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
    const [joined] = await this.db
      .select({
        client: fleetClients,
        organisationClientName: organisationClients.name,
      })
      .from(fleetClients)
      .leftJoin(
        organisationClients,
        eq(fleetClients.organisationClientId, organisationClients.id),
      )
      .where(
        and(
          eq(fleetClients.id, clientId),
          eq(fleetClients.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!joined) return null;
    const pocs = await this.db
      .select()
      .from(fleetClientPocs)
      .where(eq(fleetClientPocs.clientId, clientId))
      .orderBy(fleetClientPocs.sortOrder);
    return {
      client: joined.client,
      organisationClientName: joined.organisationClientName,
      pocs,
    };
  }

  async getClientInOrgWithDisplayName(
    organizationId: string,
    clientId: string,
  ): Promise<{
    client: typeof fleetClients.$inferSelect;
    organisationClientName: string | null;
  } | null> {
    const [joined] = await this.db
      .select({
        client: fleetClients,
        organisationClientName: organisationClients.name,
      })
      .from(fleetClients)
      .leftJoin(
        organisationClients,
        eq(fleetClients.organisationClientId, organisationClients.id),
      )
      .where(
        and(
          eq(fleetClients.id, clientId),
          eq(fleetClients.organizationId, organizationId),
        ),
      )
      .limit(1);
    return joined ?? null;
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
    sort?: ResolvedListSort<FleetVehicleListSortField>,
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
        .orderBy(
          ...buildListOrderBy(
            FLEET_VEHICLE_LIST_SORT_COLUMNS,
            sort ?? FLEET_VEHICLE_LIST_DEFAULT_SORT,
            fleetVehicles.id,
          ),
        )
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
    const [row] = await this.db
      .insert(fleetVehicles)
      .values(values)
      .returning();
    return row;
  }

  async updateVehicleStatus(
    vehicleId: string,
    status: 'available' | 'leased' | 'returned',
  ) {
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

  async getVehiclesByIds(organizationId: string, vehicleIds: string[]) {
    if (vehicleIds.length === 0) return [];
    return this.db
      .select()
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.organizationId, organizationId),
          inArray(fleetVehicles.id, vehicleIds),
        ),
      );
  }

  async findDamageRecordInOrg(organizationId: string, damageRecordId: string) {
    const [row] = await this.db
      .select()
      .from(fleetDamageRecords)
      .where(
        and(
          eq(fleetDamageRecords.id, damageRecordId),
          eq(fleetDamageRecords.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findOtherContractForVehicle(
    organizationId: string,
    vehicleId: string,
    excludeContractId: string,
  ) {
    const [row] = await this.db
      .select({
        contractId: leaseContractVehicles.contractId,
        contractNumber: leaseContracts.contractNumber,
        status: leaseContracts.status,
      })
      .from(leaseContractVehicles)
      .innerJoin(
        leaseContracts,
        eq(leaseContractVehicles.contractId, leaseContracts.id),
      )
      .where(
        and(
          eq(leaseContractVehicles.vehicleId, vehicleId),
          eq(leaseContracts.organizationId, organizationId),
          ne(leaseContractVehicles.contractId, excludeContractId),
          notInArray(leaseContracts.status, ['closed', 'concluded']),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async addContractVehicleIfMissing(contractId: string, vehicleId: string) {
    await this.db
      .insert(leaseContractVehicles)
      .values({ contractId, vehicleId })
      .onConflictDoNothing({
        target: [
          leaseContractVehicles.contractId,
          leaseContractVehicles.vehicleId,
        ],
      });
  }

  async removeContractVehicle(contractId: string, vehicleId: string) {
    await this.db
      .delete(leaseContractVehicles)
      .where(
        and(
          eq(leaseContractVehicles.contractId, contractId),
          eq(leaseContractVehicles.vehicleId, vehicleId),
        ),
      );
  }

  async insertVehicleAllocation(
    values: typeof fleetVehicleAllocations.$inferInsert,
  ) {
    const [row] = await this.db
      .insert(fleetVehicleAllocations)
      .values(values)
      .returning();
    return row;
  }

  async listDriverAssignableFromAllocations(params: {
    organizationId: string;
    excludeVehicleCodes?: string[];
  }) {
    const { organizationId, excludeVehicleCodes } = params;
    const conditions = [
      eq(fleetVehicleAllocations.organizationId, organizationId),
      eq(leaseContracts.status, 'active'),
    ];
    if (excludeVehicleCodes && excludeVehicleCodes.length > 0) {
      conditions.push(
        notInArray(fleetVehicles.registrationNo, excludeVehicleCodes),
      );
    }
    return this.db
      .select({
        vehicleId: fleetVehicles.id,
        vehicleCode: fleetVehicles.registrationNo,
        assetClass: fleetVehicles.assetClass,
        activeLeaseId: leaseContracts.id,
      })
      .from(fleetVehicleAllocations)
      .innerJoin(
        leaseContracts,
        eq(fleetVehicleAllocations.contractId, leaseContracts.id),
      )
      .innerJoin(
        fleetVehicles,
        eq(fleetVehicleAllocations.vehicleId, fleetVehicles.id),
      )
      .where(and(...conditions))
      .orderBy(asc(fleetVehicles.registrationNo));
  }

  async listDriverAssignableFromActiveContracts(params: {
    organizationId: string;
    excludeVehicleCodes?: string[];
  }) {
    const { organizationId, excludeVehicleCodes } = params;
    const conditions = [
      eq(leaseContracts.organizationId, organizationId),
      eq(leaseContracts.status, 'active'),
      eq(fleetVehicles.organizationId, organizationId),
    ];
    if (excludeVehicleCodes && excludeVehicleCodes.length > 0) {
      conditions.push(
        notInArray(fleetVehicles.registrationNo, excludeVehicleCodes),
      );
    }
    return this.db
      .select({
        vehicleId: fleetVehicles.id,
        vehicleCode: fleetVehicles.registrationNo,
        assetClass: fleetVehicles.assetClass,
        activeLeaseId: leaseContracts.id,
      })
      .from(leaseContractVehicles)
      .innerJoin(
        leaseContracts,
        eq(leaseContractVehicles.contractId, leaseContracts.id),
      )
      .innerJoin(
        fleetVehicles,
        eq(leaseContractVehicles.vehicleId, fleetVehicles.id),
      )
      .where(and(...conditions))
      .orderBy(asc(fleetVehicles.registrationNo));
  }

  async findActiveLeaseVehicleAssignment(
    organizationId: string,
    vehicleCode: string,
    activeLeaseId: string,
  ) {
    const trimmedCode = vehicleCode.trim();
    const [fromAllocation] = await this.db
      .select({
        vehicleId: fleetVehicles.id,
        vehicleCode: fleetVehicles.registrationNo,
        assetClass: fleetVehicles.assetClass,
        contractId: leaseContracts.id,
        contractStatus: leaseContracts.status,
      })
      .from(fleetVehicleAllocations)
      .innerJoin(
        leaseContracts,
        eq(fleetVehicleAllocations.contractId, leaseContracts.id),
      )
      .innerJoin(
        fleetVehicles,
        eq(fleetVehicleAllocations.vehicleId, fleetVehicles.id),
      )
      .where(
        and(
          eq(fleetVehicleAllocations.organizationId, organizationId),
          eq(fleetVehicles.registrationNo, trimmedCode),
          eq(leaseContracts.id, activeLeaseId),
          eq(leaseContracts.status, 'active'),
        ),
      )
      .limit(1);
    if (fromAllocation) return fromAllocation;

    const [fromContractLink] = await this.db
      .select({
        vehicleId: fleetVehicles.id,
        vehicleCode: fleetVehicles.registrationNo,
        assetClass: fleetVehicles.assetClass,
        contractId: leaseContracts.id,
        contractStatus: leaseContracts.status,
      })
      .from(leaseContractVehicles)
      .innerJoin(
        leaseContracts,
        eq(leaseContractVehicles.contractId, leaseContracts.id),
      )
      .innerJoin(
        fleetVehicles,
        eq(leaseContractVehicles.vehicleId, fleetVehicles.id),
      )
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          eq(fleetVehicles.registrationNo, trimmedCode),
          eq(leaseContracts.id, activeLeaseId),
          eq(leaseContracts.status, 'active'),
        ),
      )
      .limit(1);
    return fromContractLink ?? null;
  }

  async listVehicleAllocations(params: {
    organizationId: string;
    page: number;
    pageSize: number;
    contractId?: string;
    sort?: ResolvedListSort<VehicleAllocationListSortField>;
  }) {
    const { organizationId, page, pageSize, contractId, sort } = params;
    const offset = (page - 1) * pageSize;
    const conditions = [
      eq(fleetVehicleAllocations.organizationId, organizationId),
    ];
    if (contractId) {
      conditions.push(eq(fleetVehicleAllocations.contractId, contractId));
    }
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          allocation: fleetVehicleAllocations,
          contractNumber: leaseContracts.contractNumber,
          registrationNo: fleetVehicles.registrationNo,
          vehicleStatus: fleetVehicles.status,
          assetClass: fleetVehicles.assetClass,
        })
        .from(fleetVehicleAllocations)
        .innerJoin(
          leaseContracts,
          eq(fleetVehicleAllocations.contractId, leaseContracts.id),
        )
        .innerJoin(
          fleetVehicles,
          eq(fleetVehicleAllocations.vehicleId, fleetVehicles.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            VEHICLE_ALLOCATION_LIST_SORT_COLUMNS,
            sort ?? VEHICLE_ALLOCATION_LIST_DEFAULT_SORT,
            fleetVehicleAllocations.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fleetVehicleAllocations)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findVehicleAllocationInOrg(
    organizationId: string,
    allocationId: string,
  ) {
    const [row] = await this.db
      .select({
        allocation: fleetVehicleAllocations,
        contractNumber: leaseContracts.contractNumber,
        registrationNo: fleetVehicles.registrationNo,
        vehicleStatus: fleetVehicles.status,
        assetClass: fleetVehicles.assetClass,
      })
      .from(fleetVehicleAllocations)
      .innerJoin(
        leaseContracts,
        eq(fleetVehicleAllocations.contractId, leaseContracts.id),
      )
      .innerJoin(
        fleetVehicles,
        eq(fleetVehicleAllocations.vehicleId, fleetVehicles.id),
      )
      .where(
        and(
          eq(fleetVehicleAllocations.id, allocationId),
          eq(fleetVehicleAllocations.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async insertEditLog(values: typeof leaseContractEditLogs.$inferInsert) {
    const [row] = await this.db
      .insert(leaseContractEditLogs)
      .values(values)
      .returning();
    return row;
  }

  async countEditLogs(contractId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaseContractEditLogs)
      .where(eq(leaseContractEditLogs.contractId, contractId));
    return row?.count ?? 0;
  }

  async listEditLogs(
    contractId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return this.db
      .select()
      .from(leaseContractEditLogs)
      .where(eq(leaseContractEditLogs.contractId, contractId))
      .orderBy(desc(leaseContractEditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async listReturnInspections(params: {
    organizationId: string;
    page: number;
    pageSize: number;
    contractId?: string;
    sort?: ResolvedListSort<FleetReturnListSortField>;
  }) {
    const { organizationId, page, pageSize, contractId, sort } = params;
    const offset = (page - 1) * pageSize;
    const conditions = [
      eq(fleetReturnInspections.organizationId, organizationId),
    ];
    if (contractId) {
      conditions.push(eq(fleetReturnInspections.contractId, contractId));
    }
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          inspection: fleetReturnInspections,
          contractNumber: leaseContracts.contractNumber,
          registrationNo: fleetVehicles.registrationNo,
        })
        .from(fleetReturnInspections)
        .innerJoin(
          leaseContracts,
          eq(fleetReturnInspections.contractId, leaseContracts.id),
        )
        .innerJoin(
          fleetVehicles,
          eq(fleetReturnInspections.vehicleId, fleetVehicles.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            FLEET_RETURN_LIST_SORT_COLUMNS,
            sort ?? FLEET_RETURN_LIST_DEFAULT_SORT,
            fleetReturnInspections.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fleetReturnInspections)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findReturnInspectionInOrg(
    organizationId: string,
    inspectionId: string,
  ) {
    const [row] = await this.db
      .select({
        inspection: fleetReturnInspections,
        contractNumber: leaseContracts.contractNumber,
        registrationNo: fleetVehicles.registrationNo,
        assetClass: fleetVehicles.assetClass,
      })
      .from(fleetReturnInspections)
      .innerJoin(
        leaseContracts,
        eq(fleetReturnInspections.contractId, leaseContracts.id),
      )
      .innerJoin(
        fleetVehicles,
        eq(fleetReturnInspections.vehicleId, fleetVehicles.id),
      )
      .where(
        and(
          eq(fleetReturnInspections.id, inspectionId),
          eq(fleetReturnInspections.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async markVehiclesLeased(vehicleIds: string[]) {
    if (vehicleIds.length === 0) return;
    await this.db
      .update(fleetVehicles)
      .set({ status: 'leased', updatedAt: new Date() })
      .where(inArray(fleetVehicles.id, vehicleIds));
  }

  async countContractsGroupedByOrganisationClientIds(
    organizationId: string,
    organisationClientIds: string[],
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (organisationClientIds.length === 0) {
      return out;
    }
    const rows = await this.db
      .select({
        organisationClientId: fleetClients.organisationClientId,
        count: sql<number>`count(*)::int`,
      })
      .from(leaseContracts)
      .innerJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          inArray(fleetClients.organisationClientId, organisationClientIds),
        ),
      )
      .groupBy(fleetClients.organisationClientId);
    for (const row of rows) {
      if (row.organisationClientId) {
        out.set(row.organisationClientId, row.count);
      }
    }
    return out;
  }

  async listContractsForOrganisationClient(
    organizationId: string,
    organisationClientId: string,
  ) {
    return this.db
      .select({
        id: leaseContracts.id,
        contractNumber: leaseContracts.contractNumber,
        status: leaseContracts.status,
        startDate: leaseContracts.startDate,
      })
      .from(leaseContracts)
      .innerJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          eq(fleetClients.organisationClientId, organisationClientId),
        ),
      )
      .orderBy(desc(leaseContracts.createdAt));
  }

  async getContractSummariesByIds(
    organizationId: string,
    contractIds: string[],
  ) {
    if (contractIds.length === 0) {
      return [];
    }
    return this.db
      .select({
        id: leaseContracts.id,
        contractNumber: leaseContracts.contractNumber,
        status: leaseContracts.status,
        startDate: leaseContracts.startDate,
        endDate: leaseContracts.endDate,
        lesseeName: fleetClients.companyName,
      })
      .from(leaseContracts)
      .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
      .where(
        and(
          eq(leaseContracts.organizationId, organizationId),
          inArray(leaseContracts.id, contractIds),
        ),
      );
  }

  async listAssetClassesByContractIds(
    contractIds: string[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (contractIds.length === 0) {
      return out;
    }
    const rows = await this.db
      .select({
        contractId: leaseContractAssetLines.contractId,
        assetClass: leaseContractAssetLines.assetClass,
      })
      .from(leaseContractAssetLines)
      .where(inArray(leaseContractAssetLines.contractId, contractIds))
      .orderBy(asc(leaseContractAssetLines.sortOrder));
    for (const row of rows) {
      const existing = out.get(row.contractId);
      const label = row.assetClass.trim();
      if (!existing) {
        out.set(row.contractId, label);
      } else if (!existing.split(', ').includes(label)) {
        out.set(row.contractId, `${existing}, ${label}`);
      }
    }
    return out;
  }

  async findVehicleByRegistrationOrVin(organizationId: string, query: string) {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const [row] = await this.db
      .select()
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.organizationId, organizationId),
          or(
            ilike(fleetVehicles.registrationNo, trimmed),
            ilike(fleetVehicles.vin, trimmed),
          ),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findOnLeaseAssignmentForVehicle(
    organizationId: string,
    vehicleId: string,
    eligibleStatuses: LeaseContractStatus[],
  ) {
    if (eligibleStatuses.length === 0) return null;
    const [row] = await this.db
      .select({
        contract: leaseContracts,
        clientCompanyName: sql<
          string | null
        >`coalesce(${organisationClients.name}, ${fleetClients.companyName})`,
      })
      .from(leaseContractVehicles)
      .innerJoin(
        leaseContracts,
        eq(leaseContractVehicles.contractId, leaseContracts.id),
      )
      .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
      .leftJoin(
        organisationClients,
        eq(fleetClients.organisationClientId, organisationClients.id),
      )
      .where(
        and(
          eq(leaseContractVehicles.vehicleId, vehicleId),
          eq(leaseContracts.organizationId, organizationId),
          inArray(leaseContracts.status, eligibleStatuses),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listAllocatedVehiclesOnContract(
    organizationId: string,
    contractId: string,
  ) {
    return this.listAllocatedVehiclesOnContractSlice(
      organizationId,
      contractId,
      0,
      Number.MAX_SAFE_INTEGER,
    );
  }

  async countAllocatedVehiclesOnContract(
    organizationId: string,
    contractId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaseContractVehicles)
      .innerJoin(
        leaseContracts,
        eq(leaseContractVehicles.contractId, leaseContracts.id),
      )
      .where(
        and(
          eq(leaseContractVehicles.contractId, contractId),
          eq(leaseContracts.organizationId, organizationId),
        ),
      );
    return row?.count ?? 0;
  }

  async listAllocatedVehiclesOnContractSlice(
    organizationId: string,
    contractId: string,
    offset: number,
    limit: number,
  ) {
    return this.db
      .select({
        id: fleetVehicles.id,
        registrationNo: fleetVehicles.registrationNo,
        vin: fleetVehicles.vin,
        assetClass: fleetVehicles.assetClass,
        status: fleetVehicles.status,
      })
      .from(leaseContractVehicles)
      .innerJoin(
        fleetVehicles,
        eq(leaseContractVehicles.vehicleId, fleetVehicles.id),
      )
      .innerJoin(
        leaseContracts,
        eq(leaseContractVehicles.contractId, leaseContracts.id),
      )
      .where(
        and(
          eq(leaseContractVehicles.contractId, contractId),
          eq(leaseContracts.organizationId, organizationId),
        ),
      )
      .orderBy(asc(fleetVehicles.registrationNo))
      .limit(limit)
      .offset(offset);
  }

  async listContractsForFleetClient(
    organizationId: string,
    fleetClientId: string,
    eligibleStatuses: LeaseContractStatus[],
    pagination: { page: number; pageSize: number },
  ) {
    const conditions = [
      eq(leaseContracts.organizationId, organizationId),
      eq(leaseContracts.clientId, fleetClientId),
    ];
    if (eligibleStatuses.length > 0) {
      conditions.push(inArray(leaseContracts.status, eligibleStatuses));
    }
    const where = and(...conditions);
    const offset = (pagination.page - 1) * pagination.pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: leaseContracts.id,
          contractNumber: leaseContracts.contractNumber,
          status: leaseContracts.status,
          startDate: leaseContracts.startDate,
          endDate: leaseContracts.endDate,
        })
        .from(leaseContracts)
        .where(where)
        .orderBy(desc(leaseContracts.createdAt))
        .limit(pagination.pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(leaseContracts)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async countDriverAssignableForDriverRegister(params: {
    organizationId: string;
    excludeVehicleCodes?: string[];
  }): Promise<number> {
    const { organizationId, excludeVehicleCodes } = params;
    const excludeClause =
      excludeVehicleCodes && excludeVehicleCodes.length > 0
        ? sql`AND v.registration_no NOT IN (${sql.join(
            excludeVehicleCodes.map((c) => sql`${c}`),
            sql`, `,
          )})`
        : sql``;
    const countResult = await this.db.execute<{ count: number }>(sql`
      WITH combined AS (
        SELECT v.id AS vehicle_id, 1 AS precedence
        FROM fleet_vehicle_allocations a
        INNER JOIN lease_contracts c ON a.contract_id = c.id
        INNER JOIN fleet_vehicles v ON a.vehicle_id = v.id
        WHERE a.organization_id = ${organizationId}
          AND c.status = 'active'
          ${excludeClause}
        UNION ALL
        SELECT v.id AS vehicle_id, 2 AS precedence
        FROM lease_contract_vehicles lcv
        INNER JOIN lease_contracts c ON lcv.contract_id = c.id
        INNER JOIN fleet_vehicles v ON lcv.vehicle_id = v.id
        WHERE c.organization_id = ${organizationId}
          AND c.status = 'active'
          AND v.organization_id = ${organizationId}
          ${excludeClause}
      ),
      deduped AS (
        SELECT DISTINCT ON (vehicle_id) vehicle_id
        FROM combined
        ORDER BY vehicle_id, precedence DESC
      )
      SELECT count(*)::int AS count FROM deduped
    `);
    const countRows = this.rowsFromExecute<{ count: number }>(countResult);
    return Number(countRows[0]?.count ?? 0);
  }

  async listDriverAssignableForDriverRegisterSlice(params: {
    organizationId: string;
    excludeVehicleCodes?: string[];
    offset: number;
    limit: number;
    sort?: import('../../../common/utils/list-sort.util').ResolvedListSort<
      import('../../organisation/constants/organisation-list-sort.constants').AssignableVehicleListSortField
    >;
  }) {
    const { organizationId, excludeVehicleCodes, offset, limit, sort } = params;
    const orderColumn =
      sort?.sortBy === 'assetClass' ? sql`asset_class` : sql`vehicle_code`;
    const orderDir = sort?.sortOrder === 'desc' ? sql`DESC` : sql`ASC`;
    const excludeClause =
      excludeVehicleCodes && excludeVehicleCodes.length > 0
        ? sql`AND v.registration_no NOT IN (${sql.join(
            excludeVehicleCodes.map((c) => sql`${c}`),
            sql`, `,
          )})`
        : sql``;
    const sliceResult = await this.db.execute<{
      vehicle_id: string;
      vehicle_code: string;
      asset_class: string;
      active_lease_id: string;
    }>(sql`
      WITH combined AS (
        SELECT
          v.id AS vehicle_id,
          v.registration_no AS vehicle_code,
          v.asset_class AS asset_class,
          c.id AS active_lease_id,
          1 AS precedence
        FROM fleet_vehicle_allocations a
        INNER JOIN lease_contracts c ON a.contract_id = c.id
        INNER JOIN fleet_vehicles v ON a.vehicle_id = v.id
        WHERE a.organization_id = ${organizationId}
          AND c.status = 'active'
          ${excludeClause}
        UNION ALL
        SELECT
          v.id AS vehicle_id,
          v.registration_no AS vehicle_code,
          v.asset_class AS asset_class,
          c.id AS active_lease_id,
          2 AS precedence
        FROM lease_contract_vehicles lcv
        INNER JOIN lease_contracts c ON lcv.contract_id = c.id
        INNER JOIN fleet_vehicles v ON lcv.vehicle_id = v.id
        WHERE c.organization_id = ${organizationId}
          AND c.status = 'active'
          AND v.organization_id = ${organizationId}
          ${excludeClause}
      ),
      deduped AS (
        SELECT DISTINCT ON (vehicle_id)
          vehicle_id, vehicle_code, asset_class, active_lease_id
        FROM combined
        ORDER BY vehicle_id, precedence DESC
      )
      SELECT vehicle_id, vehicle_code, asset_class, active_lease_id
      FROM deduped
      ORDER BY ${orderColumn} ${orderDir}, vehicle_id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);
    const list = this.rowsFromExecute<{
      vehicle_id: string;
      vehicle_code: string;
      asset_class: string;
      active_lease_id: string;
    }>(sliceResult);
    return list.map((row) => ({
      vehicleId: row.vehicle_id,
      vehicleCode: row.vehicle_code,
      assetClass: row.asset_class,
      activeLeaseId: row.active_lease_id,
    }));
  }

  async listAvailableReplacementVehicles(params: {
    organizationId: string;
    page: number;
    pageSize: number;
    sliceOffset?: number;
    sliceLimit?: number;
    assetClass?: string;
    vehicleType?: string;
    brand?: string;
    modelName?: string;
    excludeVehicleIds?: string[];
    sort?: ResolvedListSort<ReplacementCandidateListSortField>;
  }) {
    const {
      organizationId,
      page,
      pageSize,
      sliceOffset,
      sliceLimit,
      assetClass,
      vehicleType,
      brand,
      modelName,
      excludeVehicleIds,
      sort,
    } = params;
    if (vehicleType?.trim() || brand?.trim() || modelName?.trim()) {
      return { rows: [], total: 0 };
    }
    const offset = sliceOffset ?? (page - 1) * pageSize;
    const limit = sliceLimit ?? pageSize;
    const includeTotal = sliceOffset === undefined;
    const now = new Date();
    const conditions = [
      eq(fleetVehicles.organizationId, organizationId),
      eq(fleetVehicles.status, 'available'),
      sql`${fleetVehicles.registrationExpiry} >= ${now}`,
      sql`${fleetVehicles.insuranceExpiry} >= ${now}`,
    ];
    if (assetClass?.trim()) {
      conditions.push(eq(fleetVehicles.assetClass, assetClass.trim()));
    }
    if (excludeVehicleIds && excludeVehicleIds.length > 0) {
      conditions.push(notInArray(fleetVehicles.id, excludeVehicleIds));
    }
    const where = and(...conditions);
    const rowsQuery = this.db
      .select({
        id: fleetVehicles.id,
        registrationNo: fleetVehicles.registrationNo,
        vin: fleetVehicles.vin,
        assetClass: fleetVehicles.assetClass,
        status: fleetVehicles.status,
        registrationExpiry: fleetVehicles.registrationExpiry,
        insuranceExpiry: fleetVehicles.insuranceExpiry,
      })
      .from(fleetVehicles)
      .where(where)
      .orderBy(
        ...buildListOrderBy(
          REPLACEMENT_CANDIDATE_LIST_SORT_COLUMNS,
          sort ?? REPLACEMENT_CANDIDATE_LIST_DEFAULT_SORT,
          fleetVehicles.id,
        ),
      )
      .limit(limit)
      .offset(offset);
    if (!includeTotal) {
      const rows = await rowsQuery;
      return { rows, total: 0 };
    }
    const [rows, countRows] = await Promise.all([
      rowsQuery,
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fleetVehicles)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async executeVehicleReplacementSwapsInTransaction(
    pairs: {
      contractId: string;
      fromVehicleId: string;
      toVehicleId: string;
    }[],
  ) {
    if (pairs.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const { contractId, fromVehicleId, toVehicleId } of pairs) {
        await tx
          .delete(leaseContractVehicles)
          .where(
            and(
              eq(leaseContractVehicles.contractId, contractId),
              eq(leaseContractVehicles.vehicleId, fromVehicleId),
            ),
          );
        await tx
          .insert(leaseContractVehicles)
          .values({ contractId, vehicleId: toVehicleId })
          .onConflictDoNothing({
            target: [
              leaseContractVehicles.contractId,
              leaseContractVehicles.vehicleId,
            ],
          });
        await tx
          .update(fleetVehicles)
          .set({ status: 'available', updatedAt: new Date() })
          .where(eq(fleetVehicles.id, fromVehicleId));
        await tx
          .update(fleetVehicles)
          .set({ status: 'leased', updatedAt: new Date() })
          .where(eq(fleetVehicles.id, toVehicleId));
      }
    });
  }

  /**
   * When asset register recomputes class `name`, update denormalized varchar copies.
   * Lease lines match by stable assetClassId; fleet_vehicles still keyed by legacy name string.
   */
  async cascadeAssetClassDisplayName(
    tx: Pick<AppDatabase, 'update'>,
    organizationId: string,
    assetClassId: string,
    oldName: string,
    newName: string,
  ): Promise<void> {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedOld === trimmedNew) {
      return;
    }

    await tx
      .update(leaseContractAssetLines)
      .set({ assetClass: trimmedNew, updatedAt: new Date() })
      .where(eq(leaseContractAssetLines.assetClassId, assetClassId));

    await tx
      .update(fleetVehicles)
      .set({ assetClass: trimmedNew, updatedAt: new Date() })
      .where(
        and(
          eq(fleetVehicles.organizationId, organizationId),
          eq(fleetVehicles.assetClass, trimmedOld),
        ),
      );

    await tx
      .update(financeInvoiceLines)
      .set({ assetClassName: trimmedNew })
      .where(eq(financeInvoiceLines.assetClassId, assetClassId));
  }
}
