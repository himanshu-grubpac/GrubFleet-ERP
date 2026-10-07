import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  assetRegisterAssetClasses,
  assetRegisterAssetMasters,
  assetRegisterFleetCodeCounters,
  assetRegisterVehicleAssignments,
  assetRegisterVehicles,
  organisationClients,
  type AssetRegisterAssetClassRow,
  type AssetRegisterAssetMasterRow,
  type AssetRegisterVehicleAssignmentRow,
  type AssetRegisterVehicleRow,
} from '../../../database/schema';
import { COMPLIANCE_EXPIRING_SOON_DAYS } from '../utils/compliance-status.util';
import { AssetRegisterComplianceFilterStatus } from '../dto/list-asset-register-compliance-query.dto';
import {
  FLEET_CODE_SEQUENCE_START,
  formatFleetCode,
} from '../utils/fleet-code.util';

export type AssetMasterWithClassRow = AssetRegisterAssetMasterRow & {
  assetClass: AssetRegisterAssetClassRow;
};

export type AssetRegisterVehicleWithRelations = AssetRegisterVehicleRow & {
  assetClass: AssetRegisterAssetClassRow;
  assetMaster: AssetRegisterAssetMasterRow;
};

export type AssetClassInsert = {
  organizationId: string;
  name: string;
  description: string | null;
  code: string;
  vehicleType: AssetRegisterAssetClassRow['vehicleType'];
  fuelType: string;
  mileageFrom: string | null;
  mileageTo: string | null;
  mileageUnit: string | null;
  fuelTankCapacity: string;
  ratedLoadFrom: string;
  ratedLoadTo: string;
  defaultIntakeChecklist: string | null;
  isActive: boolean;
};

@Injectable()
export class AssetRegisterRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async codeExistsInOrg(
    organizationId: string,
    code: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: assetRegisterAssetClasses.id })
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.code, code),
        ),
      )
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
    options: { search?: string; isActive?: boolean },
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
          ilike(assetRegisterAssetClasses.name, pattern),
          ilike(assetRegisterAssetClasses.code, pattern),
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
          desc(assetRegisterAssetClasses.createdAt),
          desc(assetRegisterAssetClasses.id),
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

  async updateAssetClass(
    organizationId: string,
    id: string,
    patch: Partial<
      Pick<
        AssetRegisterAssetClassRow,
        | 'name'
        | 'description'
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

  async insertAssetMaster(
    values: Pick<
      AssetRegisterAssetMasterRow,
      'organizationId' | 'assetClassId' | 'name' | 'isActive'
    >,
  ): Promise<AssetRegisterAssetMasterRow> {
    const [row] = await this.db
      .insert(assetRegisterAssetMasters)
      .values({
        ...values,
        updatedAt: new Date(),
      })
      .returning();
    if (!row) throw new Error('Failed to insert asset master');
    return row;
  }

  async getAssetMasterInOrg(
    organizationId: string,
    id: string,
  ): Promise<AssetRegisterAssetMasterRow | undefined> {
    const [row] = await this.db
      .select()
      .from(assetRegisterAssetMasters)
      .where(
        and(
          eq(assetRegisterAssetMasters.organizationId, organizationId),
          eq(assetRegisterAssetMasters.id, id),
        ),
      )
      .limit(1);
    return row;
  }

  async getAssetMasterWithClassInOrg(
    organizationId: string,
    id: string,
  ): Promise<AssetMasterWithClassRow | undefined> {
    const [row] = await this.db
      .select({
        master: assetRegisterAssetMasters,
        assetClass: assetRegisterAssetClasses,
      })
      .from(assetRegisterAssetMasters)
      .innerJoin(
        assetRegisterAssetClasses,
        eq(
          assetRegisterAssetMasters.assetClassId,
          assetRegisterAssetClasses.id,
        ),
      )
      .where(
        and(
          eq(assetRegisterAssetMasters.organizationId, organizationId),
          eq(assetRegisterAssetMasters.id, id),
          eq(assetRegisterAssetClasses.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!row) return undefined;
    return { ...row.master, assetClass: row.assetClass };
  }

  async listAssetMasters(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      isActive?: boolean;
      assetClassId?: string;
    },
  ): Promise<{ rows: AssetMasterWithClassRow[]; total: number }> {
    const conditions = [
      eq(assetRegisterAssetMasters.organizationId, organizationId),
      eq(assetRegisterAssetClasses.organizationId, organizationId),
    ];
    if (options.isActive !== undefined) {
      conditions.push(eq(assetRegisterAssetMasters.isActive, options.isActive));
    }
    if (options.assetClassId) {
      conditions.push(
        eq(assetRegisterAssetMasters.assetClassId, options.assetClassId),
      );
    }
    const search = options.search?.trim();
    if (search) {
      conditions.push(ilike(assetRegisterAssetMasters.name, `%${search}%`));
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [joined, countRows] = await Promise.all([
      this.db
        .select({
          master: assetRegisterAssetMasters,
          assetClass: assetRegisterAssetClasses,
        })
        .from(assetRegisterAssetMasters)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(
            assetRegisterAssetMasters.assetClassId,
            assetRegisterAssetClasses.id,
          ),
        )
        .where(where)
        .orderBy(
          desc(assetRegisterAssetMasters.createdAt),
          desc(assetRegisterAssetMasters.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetRegisterAssetMasters)
        .innerJoin(
          assetRegisterAssetClasses,
          eq(
            assetRegisterAssetMasters.assetClassId,
            assetRegisterAssetClasses.id,
          ),
        )
        .where(where),
    ]);
    const rows = joined.map((row) => ({
      ...row.master,
      assetClass: row.assetClass,
    }));
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async updateAssetMaster(
    organizationId: string,
    id: string,
    patch: Partial<
      Pick<
        AssetRegisterAssetMasterRow,
        | 'name'
        | 'assetClassId'
        | 'isActive'
        | 'deactivatedAt'
        | 'deactivateReason'
      >
    >,
  ): Promise<void> {
    await this.db
      .update(assetRegisterAssetMasters)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(assetRegisterAssetMasters.organizationId, organizationId),
          eq(assetRegisterAssetMasters.id, id),
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
    const rows = await this.db
      .selectDistinct({ name: assetRegisterAssetClasses.name })
      .from(assetRegisterAssetClasses)
      .where(
        and(
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetClasses.isActive, true),
        ),
      )
      .orderBy(asc(assetRegisterAssetClasses.name));

    return rows.map((row) => row.name.trim()).filter((name) => name.length > 0);
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
      .innerJoin(
        assetRegisterAssetMasters,
        eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          eq(assetRegisterVehicles.id, id),
          eq(assetRegisterAssetClasses.organizationId, organizationId),
          eq(assetRegisterAssetMasters.organizationId, organizationId),
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
    },
  ): Promise<{ rows: AssetRegisterVehicleWithRelations[]; total: number }> {
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterAssetClasses.organizationId, organizationId),
      eq(assetRegisterAssetMasters.organizationId, organizationId),
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
        )!,
      );
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
        .innerJoin(
          assetRegisterAssetMasters,
          eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
        )
        .where(where)
        .orderBy(
          desc(assetRegisterVehicles.createdAt),
          desc(assetRegisterVehicles.id),
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
        .innerJoin(
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
      .innerJoin(
        assetRegisterAssetMasters,
        eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
      )
      .where(
        and(
          eq(assetRegisterVehicles.organizationId, organizationId),
          inArray(assetRegisterVehicles.id, vehicleIds),
        ),
      );
    return rows.map((row) => ({
      ...row.vehicle,
      assetClass: row.assetClass,
      assetMaster: row.assetMaster,
    }));
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
    const [row] = await this.db
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
    return row;
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
  }): Promise<AssetRegisterVehicleAssignmentRow[]> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
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
            assignedAt: now,
          })
          .returning();
        if (!row) throw new Error('Failed to insert vehicle assignment');
        inserted.push(row);
        await tx
          .update(assetRegisterVehicles)
          .set({ operationalStatus: 'leased', updatedAt: now })
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
    },
  ): Promise<{ rows: AssetRegisterVehicleWithRelations[]; total: number }> {
    const conditions = [
      eq(assetRegisterVehicles.organizationId, organizationId),
      eq(assetRegisterVehicles.isActive, true),
      eq(assetRegisterAssetClasses.organizationId, organizationId),
      eq(assetRegisterAssetMasters.organizationId, organizationId),
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
        .innerJoin(
          assetRegisterAssetMasters,
          eq(assetRegisterVehicles.assetMasterId, assetRegisterAssetMasters.id),
        )
        .where(where)
        .orderBy(
          assetRegisterVehicles.insuranceEndDate,
          assetRegisterVehicles.id,
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
        .innerJoin(
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
