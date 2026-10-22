import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  notInArray,
  or,
  sql,
  type AnyColumn,
} from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { normalizeAssetRegisterRegistrationNumber } from '../utils/registration-number.util';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  assetRegisterAssetClasses,
  assetRegisterAssetMasters,
  assetRegisterAssetClassIdCounters,
  assetRegisterFleetCodeCounters,
  assetRegisterVehicleAssignments,
  assetRegisterVehicles,
  fleetClients,
  leaseContracts,
  organisationClients,
  type AssetRegisterAssetClassRow,
  type AssetRegisterAssetMasterRow,
  type AssetRegisterVehicleAssignmentRow,
  type AssetRegisterVehicleRow,
} from '../../../database/schema';
import type { LeaseContractStatus } from '../../fleet-leasing/constants/lease-contract-status';
import { COMPLIANCE_EXPIRING_SOON_DAYS } from '../utils/compliance-status.util';
import { AssetRegisterComplianceFilterStatus } from '../dto/list-asset-register-compliance-query.dto';
import {
  ASSET_CLASS_ID_SEQUENCE_START,
  formatAssetClassId,
} from '../utils/asset-class-id.util';
import {
  FLEET_CODE_SEQUENCE_START,
  formatFleetCode,
} from '../utils/fleet-code.util';
import {
  ASSET_CLASS_LIST_DEFAULT_SORT,
  type AssetClassListSortField,
  ASSET_COMPLIANCE_LIST_DEFAULT_SORT,
  type AssetComplianceListSortField,
  ASSET_REGISTER_VEHICLE_LIST_DEFAULT_SORT,
  type AssetRegisterVehicleListSortField,
} from '../constants/asset-register-list-sort.constants';
import {
  buildListOrderBy,
  type ResolvedListSort,
} from '../../../common/utils/list-sort.util';

const ASSET_CLASS_LIST_SORT_COLUMNS: Record<
  AssetClassListSortField,
  AnyColumn
> = {
  classId: assetRegisterAssetClasses.classId,
  createdAt: assetRegisterAssetClasses.createdAt,
  name: assetRegisterAssetClasses.name,
  brand: assetRegisterAssetClasses.brand,
  modelName: assetRegisterAssetClasses.modelName,
  updatedAt: assetRegisterAssetClasses.updatedAt,
};

const ASSET_REGISTER_VEHICLE_LIST_SORT_COLUMNS: Record<
  AssetRegisterVehicleListSortField,
  AnyColumn
> = {
  createdAt: assetRegisterVehicles.createdAt,
  fleetCode: assetRegisterVehicles.fleetCode,
  registrationNumber: assetRegisterVehicles.registrationNumber,
  operationalStatus: assetRegisterVehicles.operationalStatus,
  updatedAt: assetRegisterVehicles.updatedAt,
};

const ASSET_COMPLIANCE_LIST_SORT_COLUMNS: Record<
  AssetComplianceListSortField,
  AnyColumn
> = {
  registrationNumber: assetRegisterVehicles.registrationNumber,
  fleetCode: assetRegisterVehicles.fleetCode,
  complianceDueDate: assetRegisterVehicles.insuranceEndDate,
};

export type AssetRegisterVehicleWithRelations = AssetRegisterVehicleRow & {
  assetClass: AssetRegisterAssetClassRow;
  assetMaster: AssetRegisterAssetMasterRow | null;
};

export type AssetClassInsert = {
  organizationId: string;
  classId: string;
  name: string;
  description: string | null;
  brand: string;
  modelName: string;
  manufacturingYear: number;
  engineDisplacementCc: number;
  fuelCapacity: string | null;
  fuelSystem: string;
  color: string;
  colorCode: string;
  vehicleType: AssetRegisterAssetClassRow['vehicleType'];
  fuelType: string;
  mileageFrom: string | null;
  mileageTo: string | null;
  mileageUnit: string | null;
  fuelTankCapacity: string | null;
  ratedLoadFrom: string | null;
  ratedLoadTo: string | null;
  defaultIntakeChecklist: string | null;
  isActive: boolean;
};

@Injectable()
export class AssetRegisterRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async classNameExistsInOrg(
    organizationId: string,
    className: string,
    excludeClassId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(assetRegisterAssetClasses.organizationId, organizationId),
      eq(assetRegisterAssetClasses.name, className),
    ];
    if (excludeClassId) {
      conditions.push(ne(assetRegisterAssetClasses.id, excludeClassId));
    }
    const [row] = await this.db
      .select({ id: assetRegisterAssetClasses.id })
      .from(assetRegisterAssetClasses)
      .where(and(...conditions))
      .limit(1);
    return Boolean(row);
  }

  async insertAssetClass(
    values: AssetClassInsert,
  ): Promise<AssetRegisterAssetClassRow> {
    const [row] = await this.db
      .insert(assetRegisterAssetClasses)
      .values({
        ...values,
        updatedAt: new Date(),
      })
      .returning();
    if (!row) throw new Error('Failed to insert asset class');
    return row;
  }

  async getAssetClassInOrg(
    organizationId: string,
    id: string,
  ): Promise<AssetRegisterAssetClassRow | undefined> {
    const [row] = await this.db
      .select()
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async listAssetClasses(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      isActive?: boolean;
      sort?: ResolvedListSort<AssetClassListSortField>;
    },
  ): Promise<{ rows: AssetRegisterAssetClassRow[]; total: number }> {
    const conditions = [
      eq(assetRegisterAssetClasses.organizationId, organizationId),
    ];
    if (options.isActive !== undefined) {
      conditions.push(eq(assetRegisterAssetClasses.isActive, options.isActive));
    }
    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(assetRegisterAssetClasses.classId, pattern),
          ilike(assetRegisterAssetClasses.name, pattern),
          ilike(assetRegisterAssetClasses.brand, pattern),
          ilike(assetRegisterAssetClasses.modelName, pattern),
        )!,
      );
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(assetRegisterAssetClasses)
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            ASSET_CLASS_LIST_SORT_COLUMNS,
            options.sort ?? ASSET_CLASS_LIST_DEFAULT_SORT,
            assetRegisterAssetClasses.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetRegisterAssetClasses)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async updateAssetClassInTx(
    tx: Pick<AppDatabase, 'update'>,
    organizationId: string,
    id: string,
    patch: Parameters<AssetRegisterRepository['updateAssetClass']>[2],
  ): Promise<void> {
    await tx
      .update(assetRegisterAssetClasses)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.id, id),
        ),
      );
  }

  async updateAssetClass(
    organizationId: string,
    id: string,
    patch: Partial<
      Pick<
        AssetRegisterAssetClassRow,
        | 'name'
        | 'description'
        | 'brand'
        | 'modelName'
        | 'manufacturingYear'
        | 'engineDisplacementCc'
        | 'fuelCapacity'
        | 'fuelSystem'
        | 'color'
        | 'colorCode'
        | 'vehicleType'
        | 'fuelType'
        | 'mileageFrom'
        | 'mileageTo'
        | 'mileageUnit'
        | 'fuelTankCapacity'
        | 'ratedLoadFrom'
        | 'ratedLoadTo'
        | 'defaultIntakeChecklist'
        | 'isActive'
        | 'deactivatedAt'
        | 'deactivateReason'
      >
    >,
  ): Promise<void> {
    await this.db
      .update(assetRegisterAssetClasses)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.id, id),
        ),
      );
  }

  async countActiveVehiclesByClassIds(
    organizationId: string,
    assetClassIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (assetClassIds.length === 0) return map;
    const rows = await this.db
      .select({
        assetClassId: assetRegisterVehicles.assetClassId,
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicles)
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.isActive, true),
          inArray(assetRegisterVehicles.assetClassId, assetClassIds),
        ),
      )
      .groupBy(assetRegisterVehicles.assetClassId);
    for (const row of rows) {
      map.set(row.assetClassId, row.count);
    }
    return map;
  }

  async countAvailableVehiclesForClassExcludingIds(
    organizationId: string,
    assetClassId: string,
    excludeVehicleIds: string[],
  ): Promise<number> {
    const uniqueExclude = [...new Set(excludeVehicleIds)];
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterVehicles.isActive, true),
      eq(assetRegisterVehicles.operationalStatus, 'available'),
      eq(assetRegisterVehicles.assetClassId, assetClassId),
    ];
    if (uniqueExclude.length > 0) {
      conditions.push(notInArray(assetRegisterVehicles.id, uniqueExclude));
    }
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicles)
      .where(and(...conditions));
    return row?.count ?? 0;
  }

  async countAvailableVehiclesByClassIds(
    organizationId: string,
    assetClassIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (assetClassIds.length === 0) return map;
    const rows = await this.db
      .select({
        assetClassId: assetRegisterVehicles.assetClassId,
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicles)
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.isActive, true),
          eq(assetRegisterVehicles.operationalStatus, 'available'),
          inArray(assetRegisterVehicles.assetClassId, assetClassIds),
        ),
      )
      .groupBy(assetRegisterVehicles.assetClassId);
    for (const row of rows) {
      map.set(row.assetClassId, row.count);
    }
    return map;
  }

  async listDistinctActiveAssetClassNames(
    organizationId: string,
  ): Promise<string[]> {
    const { rows } = await this.listDistinctActiveAssetClassNamesPaginated(
      organizationId,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    return rows;
  }

  async listDistinctActiveAssetClassNamesPaginated(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: string[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const where = and(
      eq(assetRegisterAssetClasses.organizationId, organizationId),
      eq(assetRegisterAssetClasses.isActive, true),
    );
    const [nameRows, countRows] = await Promise.all([
      this.db
        .selectDistinct({ name: assetRegisterAssetClasses.name })
        .from(assetRegisterAssetClasses)
        .where(where)
        .orderBy(asc(assetRegisterAssetClasses.name))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({
          count: sql<number>`count(DISTINCT ${assetRegisterAssetClasses.name})::int`,
        })
        .from(assetRegisterAssetClasses)
        .where(where),
    ]);
    const rows = nameRows
      .map((row) => row.name.trim())
      .filter((name) => name.length > 0);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async countAvailableVehiclesForClassNames(
    organizationId: string,
    assetClassNames: string[],
  ): Promise<Map<string, number>> {
    const names = [
      ...new Set(assetClassNames.map((n) => n.trim()).filter(Boolean)),
    ];
    const result = new Map<string, number>();
    for (const name of names) {
      result.set(name, 0);
    }
    if (names.length === 0) {
      return result;
    }
    const rows = await this.db
      .select({
        name: assetRegisterAssetClasses.name,
        count: sql<number>`count(*)::int`,
      })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.isActive, true),
          eq(assetRegisterVehicles.operationalStatus, 'available'),
          eq(assetRegisterAssetClasses.isActive, true),
          inArray(assetRegisterAssetClasses.name, names),
        ),
      )
      .groupBy(assetRegisterAssetClasses.name);
    for (const row of rows) {
      result.set(row.name.trim(), row.count ?? 0);
    }
    return result;
  }

  async listActiveAssetClassesByIds(
    organizationId: string,
    assetClassIds: string[],
  ): Promise<AssetRegisterAssetClassRow[]> {
    if (assetClassIds.length === 0) return [];
    return this.db
      .select()
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.isActive, true),
          inArray(assetRegisterAssetClasses.id, assetClassIds),
        ),
      );
  }

  async getActiveAssetClassByName(
    organizationId: string,
    name: string,
  ): Promise<AssetRegisterAssetClassRow | undefined> {
    const trimmed = name.trim();
    const [row] = await this.db
      .select()
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.isActive, true),
          eq(assetRegisterAssetClasses.name, trimmed),
        ),
      )
      .limit(1);
    return row;
  }

  async countAvailableVehiclesForClassName(
    organizationId: string,
    assetClassName: string,
  ): Promise<number> {
    const trimmed = assetClassName.trim();
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.isActive, true),
          eq(assetRegisterVehicles.operationalStatus, 'available'),
          eq(assetRegisterAssetClasses.name, trimmed),
          eq(assetRegisterAssetClasses.isActive, true),
        ),
      );
    return row?.count ?? 0;
  }

  async allocateAssetClassIdInTransaction(
    organizationId: string,
  ): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [counter] = await tx
        .select()
        .from(assetRegisterAssetClassIdCounters)
        .where(
          eq(assetRegisterAssetClassIdCounters.organizationId, organizationId),
        )
        .for('update');

      let sequence: number;
      if (!counter) {
        sequence = ASSET_CLASS_ID_SEQUENCE_START;
        await tx.insert(assetRegisterAssetClassIdCounters).values({
          organizationId,
          nextSequence: sequence + 1,
        });
      } else {
        sequence = counter.nextSequence;
        await tx
          .update(assetRegisterAssetClassIdCounters)
          .set({ nextSequence: sequence + 1 })
          .where(
            eq(
              assetRegisterAssetClassIdCounters.organizationId,
              organizationId,
            ),
          );
      }
      return formatAssetClassId(sequence);
    });
  }

  async allocateFleetCodeInTransaction(
    organizationId: string,
  ): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [counter] = await tx
        .select()
        .from(assetRegisterFleetCodeCounters)
        .where(
          eq(assetRegisterFleetCodeCounters.organizationId, organizationId),
        )
        .for('update');

      let sequence: number;
      if (!counter) {
        sequence = FLEET_CODE_SEQUENCE_START;
        await tx.insert(assetRegisterFleetCodeCounters).values({
          organizationId,
          nextSequence: sequence + 1,
        });
      } else {
        sequence = counter.nextSequence;
        await tx
          .update(assetRegisterFleetCodeCounters)
          .set({ nextSequence: sequence + 1 })
          .where(
            eq(assetRegisterFleetCodeCounters.organizationId, organizationId),
          );
      }
      return formatFleetCode(sequence);
    });
  }

  async insertVehicle(
    values: Omit<
      AssetRegisterVehicleRow,
      | 'id'
      | 'operationalStatus'
      | 'isActive'
      | 'deactivatedAt'
      | 'deactivateReason'
      | 'createdAt'
      | 'updatedAt'
    > & {
      operationalStatus?: AssetRegisterVehicleRow['operationalStatus'];
      isActive?: boolean;
    },
  ): Promise<AssetRegisterVehicleRow> {
    const [row] = await this.db
      .insert(assetRegisterVehicles)
      .values({
        ...values,
        operationalStatus: values.operationalStatus ?? 'available',
        isActive: values.isActive ?? true,
        updatedAt: new Date(),
      })
      .returning();
    if (!row) throw new Error('Failed to insert asset register vehicle');
    return row;
  }

  async findVehicleIdByNormalizedRegistration(
    organizationId: string,
    registrationNumber: string,
    excludeVehicleId?: string,
  ): Promise<string | undefined> {
    const normalized =
      normalizeAssetRegisterRegistrationNumber(registrationNumber);
    if (!normalized) return undefined;
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      sql`regexp_replace(upper(trim(${assetRegisterVehicles.registrationNumber})), '\\s+', ' ', 'g') = ${normalized}`,
    ];
    if (excludeVehicleId) {
      conditions.push(ne(assetRegisterVehicles.id, excludeVehicleId));
    }
    const [row] = await this.db
      .select({ id: assetRegisterVehicles.id })
      .from(assetRegisterVehicles)
      .where(and(...conditions))
      .limit(1);
    return row?.id;
  }

  async getVehicleInOrg(
    organizationId: string,
    id: string,
  ): Promise<AssetRegisterVehicleRow | undefined> {
    const [row] = await this.db
      .select()
      .from(assetRegisterVehicles)
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async getVehicleWithRelationsInOrg(
    organizationId: string,
    id: string,
  ): Promise<AssetRegisterVehicleWithRelations | undefined> {
    const [row] = await this.db
      .select({
        vehicle: assetRegisterVehicles,
        assetClass: assetRegisterAssetClasses,
        assetMaster: assetRegisterAssetMasters,
      })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .leftJoin(
        assetRegisterAssetMasters,
        eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.id, id),
          eq(assetRegisterAssetClasses.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!row) return undefined;
    return {
      ...row.vehicle,
      assetClass: row.assetClass,
      assetMaster: row.assetMaster,
    };
  }

  async listVehicles(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      isActive?: boolean;
      assetClassId?: string;
      operationalStatus?: AssetRegisterVehicleRow['operationalStatus'];
      demandFilter?: 'any' | 'in_demand' | 'no_demand';
      assetClassIdsWithOpenDemand?: string[];
      sort?: ResolvedListSort<AssetRegisterVehicleListSortField>;
    },
  ): Promise<{ rows: AssetRegisterVehicleWithRelations[]; total: number }> {
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterAssetClasses.organizationId, organizationId),
    ];
    if (options.isActive !== undefined) {
      conditions.push(eq(assetRegisterVehicles.isActive, options.isActive));
    }
    if (options.assetClassId) {
      conditions.push(
        eq(assetRegisterVehicles.assetClassId, options.assetClassId),
      );
    }
    if (options.operationalStatus) {
      conditions.push(
        eq(assetRegisterVehicles.operationalStatus, options.operationalStatus),
      );
    }
    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(assetRegisterVehicles.fleetCode, pattern),
          ilike(assetRegisterVehicles.registrationNumber, pattern),
          ilike(assetRegisterAssetClasses.name, pattern),
        )!,
      );
    }
    if (options.demandFilter === 'in_demand') {
      const ids = options.assetClassIdsWithOpenDemand ?? [];
      if (ids.length === 0) {
        conditions.push(sql`false`);
      } else {
        conditions.push(inArray(assetRegisterVehicles.assetClassId, ids));
      }
    } else if (options.demandFilter === 'no_demand') {
      const ids = options.assetClassIdsWithOpenDemand ?? [];
      if (ids.length > 0) {
        conditions.push(notInArray(assetRegisterVehicles.assetClassId, ids));
      }
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [joined, countRows] = await Promise.all([
      this.db
        .select({
          vehicle: assetRegisterVehicles,
          assetClass: assetRegisterAssetClasses,
          assetMaster: assetRegisterAssetMasters,
        })
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .leftJoin(
          assetRegisterAssetMasters,
          eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            ASSET_REGISTER_VEHICLE_LIST_SORT_COLUMNS,
            options.sort ?? ASSET_REGISTER_VEHICLE_LIST_DEFAULT_SORT,
            assetRegisterVehicles.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .where(where),
    ]);
    const rows = joined.map((row) => ({
      ...row.vehicle,
      assetClass: row.assetClass,
      assetMaster: row.assetMaster,
    }));
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async updateVehicle(
    organizationId: string,
    id: string,
    patch: Partial<
      Pick<
        AssetRegisterVehicleRow,
        | 'assetClassId'
        | 'assetMasterId'
        | 'registrationNumber'
        | 'chassisNumber'
        | 'modelYear'
        | 'odometer'
        | 'registrationStartDate'
        | 'registrationEndDate'
        | 'insuranceStartDate'
        | 'insuranceEndDate'
        | 'insurancePremium'
        | 'insuranceSupplierId'
        | 'warrantyStartDate'
        | 'warrantyEndDate'
        | 'specialNotes'
        | 'purchaseInvoiceId'
        | 'operationalStatus'
        | 'isActive'
        | 'deactivatedAt'
        | 'deactivateReason'
      >
    >,
  ): Promise<void> {
    await this.db
      .update(assetRegisterVehicles)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.id, id),
        ),
      );
  }

  async getOrganisationClientInOrg(
    organizationId: string,
    clientId: string,
  ): Promise<{ id: string; name: string } | undefined> {
    const [row] = await this.db
      .select({ id: organisationClients.id, name: organisationClients.name })
      .from(organisationClients)
      .where(
        and(
          eq(organisationClients.organizationId, organizationId),
          eq(organisationClients.id, clientId),
        ),
      )
      .limit(1);
    return row;
  }

  async getVehiclesWithRelationsByIds(
    organizationId: string,
    vehicleIds: string[],
  ): Promise<AssetRegisterVehicleWithRelations[]> {
    if (vehicleIds.length === 0) return [];
    const rows = await this.db
      .select({
        vehicle: assetRegisterVehicles,
        assetClass: assetRegisterAssetClasses,
        assetMaster: assetRegisterAssetMasters,
      })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .leftJoin(
        assetRegisterAssetMasters,
        eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          inArray(assetRegisterVehicles.id, vehicleIds),
        ),
      );
    return rows.map((row) => ({
      ...row.vehicle,
      assetClass: row.assetClass,
      assetMaster: row.assetMaster,
    }));
  }

  async findVehicleByRegistrationVinOrFleetCode(
    organizationId: string,
    query: string,
  ): Promise<AssetRegisterVehicleWithRelations | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const [row] = await this.db
      .select({
        vehicle: assetRegisterVehicles,
        assetClass: assetRegisterAssetClasses,
        assetMaster: assetRegisterAssetMasters,
      })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .leftJoin(
        assetRegisterAssetMasters,
        eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          or(
            ilike(assetRegisterVehicles.registrationNumber, trimmed),
            ilike(assetRegisterVehicles.chassisNumber, trimmed),
            ilike(assetRegisterVehicles.fleetCode, trimmed),
          ),
        ),
      )
      .limit(1);
    if (!row) return null;
    return {
      ...row.vehicle,
      assetClass: row.assetClass,
      assetMaster: row.assetMaster,
    };
  }

  async findOnLeaseAssignmentForRegisterVehicle(
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
      .from(assetRegisterVehicleAssignments)
      .innerJoin(
        leaseContracts,
        eq(assetRegisterVehicleAssignments.leaseContractId, leaseContracts.id),
      )
      .leftJoin(fleetClients, eq(leaseContracts.clientId, fleetClients.id))
      .leftJoin(
        organisationClients,
        eq(fleetClients.organisationClientId, organisationClients.id),
      )
      .where(
        and(
          eq(assetRegisterVehicleAssignments.vehicleId, vehicleId),
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
          inArray(leaseContracts.status, eligibleStatuses),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listAllocatedRegisterVehiclesOnContract(
    organizationId: string,
    contractId: string,
  ) {
    return this.listAllocatedRegisterVehiclesOnContractSlice(
      organizationId,
      contractId,
      0,
      Number.MAX_SAFE_INTEGER,
    );
  }

  async countAllocatedRegisterVehiclesOnContract(
    organizationId: string,
    contractId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetRegisterVehicleAssignments)
      .where(
        and(
          eq(assetRegisterVehicleAssignments.leaseContractId, contractId),
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      );
    return row?.count ?? 0;
  }

  async listAllocatedRegisterVehiclesOnContractSlice(
    organizationId: string,
    contractId: string,
    offset: number,
    limit: number,
  ) {
    return this.db
      .select({
        id: assetRegisterVehicles.id,
        registrationNo: assetRegisterVehicles.registrationNumber,
        vin: assetRegisterVehicles.chassisNumber,
        assetClass: assetRegisterAssetClasses.name,
        status: assetRegisterVehicles.operationalStatus,
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
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      )
      .orderBy(asc(assetRegisterVehicles.registrationNumber))
      .limit(limit)
      .offset(offset);
  }

  private availableRegisterReplacementConditions(params: {
    organizationId: string;
    assetClass?: string;
    vehicleType?: string;
    brand?: string;
    modelName?: string;
    excludeVehicleIds?: string[];
  }) {
    const {
      organizationId,
      assetClass,
      vehicleType,
      brand,
      modelName,
      excludeVehicleIds,
    } = params;
    const today = sql`CURRENT_DATE`;
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterVehicles.isActive, true),
      eq(assetRegisterVehicles.operationalStatus, 'available'),
      sql`${assetRegisterVehicles.registrationEndDate} >= ${today}`,
      sql`${assetRegisterVehicles.insuranceEndDate} >= ${today}`,
    ];
    if (assetClass?.trim()) {
      conditions.push(eq(assetRegisterAssetClasses.name, assetClass.trim()));
    }
    if (vehicleType?.trim()) {
      conditions.push(
        eq(
          assetRegisterAssetClasses.vehicleType,
          vehicleType.trim() as AssetRegisterAssetClassRow['vehicleType'],
        ),
      );
    }
    if (brand?.trim()) {
      conditions.push(eq(assetRegisterAssetClasses.brand, brand.trim()));
    }
    if (modelName?.trim()) {
      conditions.push(
        eq(assetRegisterAssetClasses.modelName, modelName.trim()),
      );
    }
    if (excludeVehicleIds && excludeVehicleIds.length > 0) {
      conditions.push(notInArray(assetRegisterVehicles.id, excludeVehicleIds));
    }
    return and(...conditions);
  }

  async listDistinctBrandsForAvailableReplacements(params: {
    organizationId: string;
    vehicleType: string;
    excludeVehicleIds?: string[];
  }) {
    const where = this.availableRegisterReplacementConditions({
      organizationId: params.organizationId,
      vehicleType: params.vehicleType,
      excludeVehicleIds: params.excludeVehicleIds,
    });
    const rows = await this.db
      .selectDistinct({ brand: assetRegisterAssetClasses.brand })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(where)
      .orderBy(asc(assetRegisterAssetClasses.brand));
    return rows.map((r) => r.brand).filter((b) => b.trim().length > 0);
  }

  async listDistinctModelsForAvailableReplacements(params: {
    organizationId: string;
    vehicleType: string;
    brand: string;
    excludeVehicleIds?: string[];
  }) {
    const where = this.availableRegisterReplacementConditions({
      organizationId: params.organizationId,
      vehicleType: params.vehicleType,
      brand: params.brand,
      excludeVehicleIds: params.excludeVehicleIds,
    });
    const rows = await this.db
      .selectDistinct({ modelName: assetRegisterAssetClasses.modelName })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(where)
      .orderBy(asc(assetRegisterAssetClasses.modelName));
    return rows.map((r) => r.modelName).filter((m) => m.trim().length > 0);
  }

  async listAvailableRegisterReplacementVehicles(params: {
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
    } = params;
    const offset = sliceOffset ?? (page - 1) * pageSize;
    const limit = sliceLimit ?? pageSize;
    const includeTotal = sliceOffset === undefined;
    const where = this.availableRegisterReplacementConditions({
      organizationId,
      assetClass,
      vehicleType,
      brand,
      modelName,
      excludeVehicleIds,
    });
    const rowsQuery = this.db
      .select({
        id: assetRegisterVehicles.id,
        registrationNo: assetRegisterVehicles.registrationNumber,
        vin: assetRegisterVehicles.chassisNumber,
        assetClass: assetRegisterAssetClasses.name,
        status: assetRegisterVehicles.operationalStatus,
      })
      .from(assetRegisterVehicles)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
      )
      .where(where)
      .orderBy(asc(assetRegisterVehicles.registrationNumber))
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
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findOtherActiveAssignmentForRegisterVehicle(
    organizationId: string,
    vehicleId: string,
    excludeContractId: string,
  ) {
    const [row] = await this.db
      .select({
        contractId: assetRegisterVehicleAssignments.leaseContractId,
        contractNumber: leaseContracts.contractNumber,
        status: leaseContracts.status,
      })
      .from(assetRegisterVehicleAssignments)
      .innerJoin(
        leaseContracts,
        eq(assetRegisterVehicleAssignments.leaseContractId, leaseContracts.id),
      )
      .where(
        and(
          eq(assetRegisterVehicleAssignments.vehicleId, vehicleId),
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
          ne(
            assetRegisterVehicleAssignments.leaseContractId,
            excludeContractId,
          ),
          notInArray(leaseContracts.status, ['closed', 'concluded']),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async executeRegisterVehicleReplacementOnContract(input: {
    organizationId: string;
    contractId: string;
    fromVehicleId: string;
    toVehicleId: string;
    fleetClientId: string | null;
    organisationClientId: string | null;
  }) {
    await this.db.transaction(async (tx) => {
      const now = new Date();
      const [active] = await tx
        .select()
        .from(assetRegisterVehicleAssignments)
        .where(
          and(
            eq(
              assetRegisterVehicleAssignments.organizationId,
              input.organizationId,
            ),
            eq(assetRegisterVehicleAssignments.vehicleId, input.fromVehicleId),
            eq(
              assetRegisterVehicleAssignments.leaseContractId,
              input.contractId,
            ),
            isNull(assetRegisterVehicleAssignments.unassignedAt),
          ),
        )
        .limit(1);
      if (!active) {
        throw new Error('Active assignment not found for replacement source');
      }
      await tx
        .update(assetRegisterVehicleAssignments)
        .set({ unassignedAt: now })
        .where(eq(assetRegisterVehicleAssignments.id, active.id));
      await tx
        .update(assetRegisterVehicles)
        .set({ operationalStatus: 'available', updatedAt: now })
        .where(
          and(
            eq(assetRegisterVehicles.organizationId, input.organizationId),
            eq(assetRegisterVehicles.id, input.fromVehicleId),
          ),
        );
      await tx.insert(assetRegisterVehicleAssignments).values({
        organizationId: input.organizationId,
        vehicleId: input.toVehicleId,
        leaseContractId: input.contractId,
        fleetClientId: input.fleetClientId,
        organisationClientId: input.organisationClientId,
        assignedAt: now,
      });
      await tx
        .update(assetRegisterVehicles)
        .set({ operationalStatus: 'leased', updatedAt: now })
        .where(
          and(
            eq(assetRegisterVehicles.organizationId, input.organizationId),
            eq(assetRegisterVehicles.id, input.toVehicleId),
          ),
        );
    });
  }

  async listAssignmentHistoryForVehicle(
    organizationId: string,
    vehicleId: string,
  ): Promise<AssetRegisterVehicleAssignmentRow[]> {
    return this.db
      .select()
      .from(assetRegisterVehicleAssignments)
      .where(
        and(
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          eq(assetRegisterVehicleAssignments.vehicleId, vehicleId),
        ),
      )
      .orderBy(desc(assetRegisterVehicleAssignments.assignedAt));
  }

  async findActiveAssignmentForVehicle(
    organizationId: string,
    vehicleId: string,
  ): Promise<AssetRegisterVehicleAssignmentRow | undefined> {
    const map = await this.findActiveAssignmentsForVehicles(organizationId, [
      vehicleId,
    ]);
    return map.get(vehicleId);
  }

  async findActiveAssignmentsForVehicles(
    organizationId: string,
    vehicleIds: string[],
  ): Promise<Map<string, AssetRegisterVehicleAssignmentRow>> {
    const uniqueIds = [...new Set(vehicleIds)];
    const result = new Map<string, AssetRegisterVehicleAssignmentRow>();
    if (uniqueIds.length === 0) {
      return result;
    }
    const rows = await this.db
      .select()
      .from(assetRegisterVehicleAssignments)
      .where(
        and(
          eq(assetRegisterVehicleAssignments.organizationId, organizationId),
          inArray(assetRegisterVehicleAssignments.vehicleId, uniqueIds),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      );
    for (const row of rows) {
      if (!result.has(row.vehicleId)) {
        result.set(row.vehicleId, row);
      }
    }
    return result;
  }

  async countActiveAssignmentsByContractGroupedByClassName(
    contractId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
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
          eq(assetRegisterVehicleAssignments.leaseContractId, contractId),
          isNull(assetRegisterVehicleAssignments.unassignedAt),
        ),
      )
      .groupBy(assetRegisterAssetClasses.name);
    const out = new Map<string, number>();
    for (const row of rows) {
      out.set(row.className.trim(), row.count);
    }
    return out;
  }

  async bulkAssignVehicles(input: {
    organizationId: string;
    leaseContractId: string;
    fleetClientId: string | null;
    organisationClientId: string | null;
    vehicleIds: string[];
    assignedAt?: Date;
    odometerAtHandover?: number;
    handoverLocation?: string;
    notes?: string;
  }): Promise<AssetRegisterVehicleAssignmentRow[]> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const assignedAt = input.assignedAt ?? now;
      const inserted: AssetRegisterVehicleAssignmentRow[] = [];
      for (const vehicleId of input.vehicleIds) {
        const [row] = await tx
          .insert(assetRegisterVehicleAssignments)
          .values({
            organizationId: input.organizationId,
            vehicleId,
            leaseContractId: input.leaseContractId,
            fleetClientId: input.fleetClientId,
            organisationClientId: input.organisationClientId,
            assignedAt,
            handoverLocation: input.handoverLocation?.trim() || null,
            notes: input.notes?.trim() || null,
          })
          .returning();
        if (!row) throw new Error('Failed to insert vehicle assignment');
        inserted.push(row);
        const vehiclePatch: {
          operationalStatus: 'leased';
          updatedAt: Date;
          odometer?: number;
        } = {
          operationalStatus: 'leased',
          updatedAt: now,
        };
        if (input.odometerAtHandover !== undefined) {
          vehiclePatch.odometer = input.odometerAtHandover;
        }
        await tx
          .update(assetRegisterVehicles)
          .set(vehiclePatch)
          .where(
            and(
              eq(assetRegisterVehicles.organizationId, input.organizationId),
              eq(assetRegisterVehicles.id, vehicleId),
            ),
          );
      }
      return inserted;
    });
  }

  async unassignVehicle(
    organizationId: string,
    vehicleId: string,
  ): Promise<AssetRegisterVehicleAssignmentRow | undefined> {
    return this.db.transaction(async (tx) => {
      const [active] = await tx
        .select()
        .from(assetRegisterVehicleAssignments)
        .where(
          and(
            eq(assetRegisterVehicleAssignments.organizationId, organizationId),
            eq(assetRegisterVehicleAssignments.vehicleId, vehicleId),
            isNull(assetRegisterVehicleAssignments.unassignedAt),
          ),
        )
        .limit(1);
      if (!active) return undefined;
      const now = new Date();
      const [updated] = await tx
        .update(assetRegisterVehicleAssignments)
        .set({ unassignedAt: now })
        .where(eq(assetRegisterVehicleAssignments.id, active.id))
        .returning();
      await tx
        .update(assetRegisterVehicles)
        .set({ operationalStatus: 'available', updatedAt: now })
        .where(
          and(
            eq(assetRegisterVehicles.organizationId, organizationId),
            eq(assetRegisterVehicles.id, vehicleId),
          ),
        );
      return updated;
    });
  }

  private complianceDateFilterSql(
    filter: AssetRegisterComplianceFilterStatus | undefined,
  ) {
    if (!filter || filter === AssetRegisterComplianceFilterStatus.ALL) {
      return undefined;
    }
    const today = sql`CURRENT_DATE`;
    const soon = sql`CURRENT_DATE + ${sql.raw(String(COMPLIANCE_EXPIRING_SOON_DAYS))}`;
    const expiredCond = or(
      sql`${assetRegisterVehicles.insuranceEndDate} < ${today}`,
      sql`${assetRegisterVehicles.registrationEndDate} < ${today}`,
      sql`${assetRegisterVehicles.warrantyEndDate} < ${today}`,
    )!;
    if (filter === AssetRegisterComplianceFilterStatus.EXPIRED) {
      return expiredCond;
    }
    const allValidBeyondSoon = and(
      sql`${assetRegisterVehicles.insuranceEndDate} > ${soon}`,
      sql`${assetRegisterVehicles.registrationEndDate} > ${soon}`,
      sql`${assetRegisterVehicles.warrantyEndDate} > ${soon}`,
    );
    if (filter === AssetRegisterComplianceFilterStatus.VALID) {
      return allValidBeyondSoon;
    }
    const expiringCond = and(
      sql`NOT (${expiredCond})`,
      or(
        sql`${assetRegisterVehicles.insuranceEndDate} <= ${soon}`,
        sql`${assetRegisterVehicles.registrationEndDate} <= ${soon}`,
        sql`${assetRegisterVehicles.warrantyEndDate} <= ${soon}`,
      ),
    );
    return expiringCond;
  }

  async listVehiclesForCompliance(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      assetClassId?: string;
      complianceStatus?: AssetRegisterComplianceFilterStatus;
      sort?: ResolvedListSort<AssetComplianceListSortField>;
    },
  ): Promise<{ rows: AssetRegisterVehicleWithRelations[]; total: number }> {
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterVehicles.isActive, true),
      eq(assetRegisterAssetClasses.organizationId, organizationId),
    ];
    if (options.assetClassId) {
      conditions.push(
        eq(assetRegisterVehicles.assetClassId, options.assetClassId),
      );
    }
    const complianceFilter = this.complianceDateFilterSql(
      options.complianceStatus,
    );
    if (complianceFilter) {
      conditions.push(complianceFilter);
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [joined, countRows] = await Promise.all([
      this.db
        .select({
          vehicle: assetRegisterVehicles,
          assetClass: assetRegisterAssetClasses,
          assetMaster: assetRegisterAssetMasters,
        })
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .leftJoin(
          assetRegisterAssetMasters,
          eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
        )
        .where(where)
        .orderBy(
          ...buildListOrderBy(
            ASSET_COMPLIANCE_LIST_SORT_COLUMNS,
            options.sort ?? ASSET_COMPLIANCE_LIST_DEFAULT_SORT,
            assetRegisterVehicles.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetRegisterVehicles)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(assetRegisterVehicles.assetClassId, assetRegisterAssetClasses.id),
        )
        .leftJoin(
          assetRegisterAssetMasters,
          eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
        )
        .where(where),
    ]);
    const rows = joined.map((row) => ({
      ...row.vehicle,
      assetClass: row.assetClass,
      assetMaster: row.assetMaster,
    }));
    return { rows, total: countRows[0]?.count ?? 0 };
  }
}
