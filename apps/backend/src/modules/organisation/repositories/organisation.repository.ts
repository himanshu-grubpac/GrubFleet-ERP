import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  organisationClientPocs,
  organisationClients,
  organisationDrivers,
  organisationEmployees,
  organisationLocations,
  organisationLocationTypes,
  organisationSuppliers,
} from '../../../database/schema';
import type { OrganisationSupplierType } from '../constants/supplier-type.constants';
import { SYSTEM_LOCATION_TYPE_PRESETS } from '../constants/system-location-type-presets';

export type LocationInsert = typeof organisationLocations.$inferInsert;
export type LocationRow = typeof organisationLocations.$inferSelect;
export type LocationTypeRow = typeof organisationLocationTypes.$inferSelect;
export type EmployeeInsert = typeof organisationEmployees.$inferInsert;
export type EmployeeRow = typeof organisationEmployees.$inferSelect;
export type SupplierInsert = typeof organisationSuppliers.$inferInsert;
export type SupplierRow = typeof organisationSuppliers.$inferSelect;
export type DriverInsert = typeof organisationDrivers.$inferInsert;
export type DriverRow = typeof organisationDrivers.$inferSelect;
export type OrganisationClientInsert = typeof organisationClients.$inferInsert;
export type OrganisationClientRow = typeof organisationClients.$inferSelect;
export type OrganisationClientPocRow =
  typeof organisationClientPocs.$inferSelect;

export type DriverListRow = {
  driver: DriverRow;
  supplierName: string;
};

const reportsToEmployee = alias(organisationEmployees, 'reports_to_employee');

@Injectable()
export class OrganisationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async ensureSystemLocationTypes(organizationId: string): Promise<void> {
    for (const preset of SYSTEM_LOCATION_TYPE_PRESETS) {
      await this.db
        .insert(organisationLocationTypes)
        .values({
          organizationId,
          name: preset.name,
          presetKey: preset.presetKey,
          isSystem: true,
        })
        .onConflictDoNothing({
          target: [
            organisationLocationTypes.organizationId,
            organisationLocationTypes.presetKey,
          ],
        });
    }
  }

  async listLocationTypesWithUsage(
    organizationId: string,
  ): Promise<Array<LocationTypeRow & { locationCount: number }>> {
    await this.ensureSystemLocationTypes(organizationId);
    const rows = await this.db
      .select()
      .from(organisationLocationTypes)
      .where(eq(organisationLocationTypes.organizationId, organizationId))
      .orderBy(
        asc(organisationLocationTypes.isSystem),
        asc(organisationLocationTypes.name),
      );
    const usageRows = await this.db
      .select({
        locationTypeId: organisationLocations.locationTypeId,
        locationCount: count(),
      })
      .from(organisationLocations)
      .where(eq(organisationLocations.organizationId, organizationId))
      .groupBy(organisationLocations.locationTypeId);
    const countByType = new Map(
      usageRows.map((row) => [row.locationTypeId, row.locationCount]),
    );
    return rows.map((row) => ({
      ...row,
      locationCount: countByType.get(row.id) ?? 0,
    }));
  }

  async getLocationTypeInOrg(
    organizationId: string,
    typeId: string,
  ): Promise<LocationTypeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(organisationLocationTypes)
      .where(
        and(
          eq(organisationLocationTypes.organizationId, organizationId),
          eq(organisationLocationTypes.id, typeId),
        ),
      )
      .limit(1);
    return row;
  }

  async insertCustomLocationType(
    organizationId: string,
    name: string,
  ): Promise<LocationTypeRow> {
    const [row] = await this.db
      .insert(organisationLocationTypes)
      .values({
        organizationId,
        name: name.trim(),
        isSystem: false,
        presetKey: null,
      })
      .returning();
    return row;
  }

  async countLocationsForType(locationTypeId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(organisationLocations)
      .where(eq(organisationLocations.locationTypeId, locationTypeId));
    return row?.count ?? 0;
  }

  async deleteLocationType(
    organizationId: string,
    typeId: string,
  ): Promise<boolean> {
    const result = await this.db
      .delete(organisationLocationTypes)
      .where(
        and(
          eq(organisationLocationTypes.organizationId, organizationId),
          eq(organisationLocationTypes.id, typeId),
          eq(organisationLocationTypes.isSystem, false),
        ),
      )
      .returning({ id: organisationLocationTypes.id });
    return result.length > 0;
  }

  async resolveLocationTypeByName(
    organizationId: string,
    name: string,
  ): Promise<LocationTypeRow | undefined> {
    await this.ensureSystemLocationTypes(organizationId);
    const [row] = await this.db
      .select()
      .from(organisationLocationTypes)
      .where(
        and(
          eq(organisationLocationTypes.organizationId, organizationId),
          ilike(organisationLocationTypes.name, name.trim()),
        ),
      )
      .limit(1);
    return row;
  }

  async listLocations(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      locationTypeId?: string;
      isActive?: boolean;
    },
  ): Promise<{
    rows: Array<LocationRow & { typeName: string }>;
    total: number;
  }> {
    const conditions = [
      eq(organisationLocations.organizationId, organizationId),
    ];
    if (options.locationTypeId) {
      conditions.push(
        eq(organisationLocations.locationTypeId, options.locationTypeId),
      );
    }
    if (options.isActive !== undefined) {
      conditions.push(eq(organisationLocations.isActive, options.isActive));
    }
    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(organisationLocations.name, pattern),
          ilike(organisationLocations.addressLine1, pattern),
          ilike(organisationLocations.addressLine2, pattern),
          ilike(organisationLocations.addressCity, pattern),
          ilike(organisationLocations.addressState, pattern),
          ilike(organisationLocations.addressDistrict, pattern),
          ilike(organisationLocations.addressPincode, pattern),
          ilike(organisationLocations.siteContactEmail, pattern),
          ilike(organisationLocations.siteContactPhone, pattern),
        )!,
      );
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      // Type name is joined for the page rows only — no per-request catalog load.
      this.db
        .select({
          id: organisationLocations.id,
          organizationId: organisationLocations.organizationId,
          name: organisationLocations.name,
          locationTypeId: organisationLocations.locationTypeId,
          addressLine1: organisationLocations.addressLine1,
          addressLine2: organisationLocations.addressLine2,
          addressCity: organisationLocations.addressCity,
          addressState: organisationLocations.addressState,
          addressDistrict: organisationLocations.addressDistrict,
          addressPincode: organisationLocations.addressPincode,
          addressCountry: organisationLocations.addressCountry,
          siteContactPhone: organisationLocations.siteContactPhone,
          siteContactEmail: organisationLocations.siteContactEmail,
          responsibleEmployeeId: organisationLocations.responsibleEmployeeId,
          deputyEmployeeId: organisationLocations.deputyEmployeeId,
          isActive: organisationLocations.isActive,
          createdAt: organisationLocations.createdAt,
          updatedAt: organisationLocations.updatedAt,
          typeName: organisationLocationTypes.name,
        })
        .from(organisationLocations)
        .innerJoin(
          organisationLocationTypes,
          eq(
            organisationLocations.locationTypeId,
            organisationLocationTypes.id,
          ),
        )
        .where(where)
        .orderBy(
          desc(organisationLocations.createdAt),
          desc(organisationLocations.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(organisationLocations)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async getLocationInOrg(
    organizationId: string,
    locationId: string,
  ): Promise<
    | (LocationRow & { typeName: string; typePresetKey: string | null })
    | undefined
  > {
    const [row] = await this.db
      .select({
        id: organisationLocations.id,
        organizationId: organisationLocations.organizationId,
        name: organisationLocations.name,
        locationTypeId: organisationLocations.locationTypeId,
        addressLine1: organisationLocations.addressLine1,
        addressLine2: organisationLocations.addressLine2,
        addressCity: organisationLocations.addressCity,
        addressState: organisationLocations.addressState,
        addressDistrict: organisationLocations.addressDistrict,
        addressPincode: organisationLocations.addressPincode,
        addressCountry: organisationLocations.addressCountry,
        siteContactPhone: organisationLocations.siteContactPhone,
        siteContactEmail: organisationLocations.siteContactEmail,
        responsibleEmployeeId: organisationLocations.responsibleEmployeeId,
        deputyEmployeeId: organisationLocations.deputyEmployeeId,
        isActive: organisationLocations.isActive,
        createdAt: organisationLocations.createdAt,
        updatedAt: organisationLocations.updatedAt,
        typeName: organisationLocationTypes.name,
        typePresetKey: organisationLocationTypes.presetKey,
      })
      .from(organisationLocations)
      .innerJoin(
        organisationLocationTypes,
        eq(organisationLocations.locationTypeId, organisationLocationTypes.id),
      )
      .where(
        and(
          eq(organisationLocations.organizationId, organizationId),
          eq(organisationLocations.id, locationId),
        ),
      )
      .limit(1);
    return row;
  }

  async insertLocation(values: LocationInsert): Promise<LocationRow> {
    const [row] = await this.db
      .insert(organisationLocations)
      .values(values)
      .returning();
    return row;
  }

  async updateLocation(
    organizationId: string,
    locationId: string,
    patch: Partial<Omit<LocationInsert, 'id' | 'organizationId' | 'createdAt'>>,
  ): Promise<LocationRow | undefined> {
    const [row] = await this.db
      .update(organisationLocations)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(organisationLocations.organizationId, organizationId),
          eq(organisationLocations.id, locationId),
        ),
      )
      .returning();
    return row;
  }

  async listEmployees(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      department?: string;
      isActive?: boolean;
    },
  ): Promise<{
    rows: Array<EmployeeRow & { linkedLocationName: string | null }>;
    total: number;
  }> {
    const conditions = [
      eq(organisationEmployees.organizationId, organizationId),
    ];
    if (options.department?.trim()) {
      conditions.push(
        eq(organisationEmployees.department, options.department.trim()),
      );
    }
    if (options.isActive !== undefined) {
      conditions.push(eq(organisationEmployees.isActive, options.isActive));
    }
    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(organisationEmployees.fullName, pattern),
          ilike(organisationEmployees.designation, pattern),
          ilike(organisationEmployees.department, pattern),
          ilike(organisationEmployees.branchLocationLabel, pattern),
          ilike(organisationEmployees.mobile, pattern),
          ilike(organisationEmployees.companyEmail, pattern),
        )!,
      );
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: organisationEmployees.id,
          organizationId: organisationEmployees.organizationId,
          employeeCode: organisationEmployees.employeeCode,
          fullName: organisationEmployees.fullName,
          designation: organisationEmployees.designation,
          department: organisationEmployees.department,
          departmentId: organisationEmployees.departmentId,
          branchLocationLabel: organisationEmployees.branchLocationLabel,
          locationId: organisationEmployees.locationId,
          reportsToEmployeeId: organisationEmployees.reportsToEmployeeId,
          reportsToDesignationOverride:
            organisationEmployees.reportsToDesignationOverride,
          reportsToLocationOverride:
            organisationEmployees.reportsToLocationOverride,
          linkedUserId: organisationEmployees.linkedUserId,
          employmentType: organisationEmployees.employmentType,
          dateOfJoining: organisationEmployees.dateOfJoining,
          mobile: organisationEmployees.mobile,
          companyEmail: organisationEmployees.companyEmail,
          isActive: organisationEmployees.isActive,
          offBoardReasonType: organisationEmployees.offBoardReasonType,
          offBoardComment: organisationEmployees.offBoardComment,
          offBoardedAt: organisationEmployees.offBoardedAt,
          createdAt: organisationEmployees.createdAt,
          updatedAt: organisationEmployees.updatedAt,
          linkedLocationName: organisationLocations.name,
        })
        .from(organisationEmployees)
        .leftJoin(
          organisationLocations,
          eq(organisationEmployees.locationId, organisationLocations.id),
        )
        .where(where)
        .orderBy(
          desc(organisationEmployees.createdAt),
          desc(organisationEmployees.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(organisationEmployees)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async listDistinctEmployeeDepartments(
    organizationId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ department: organisationEmployees.department })
      .from(organisationEmployees)
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          isNotNull(organisationEmployees.department),
          ne(organisationEmployees.department, ''),
        ),
      )
      .orderBy(asc(organisationEmployees.department));

    return rows
      .map((row) => row.department?.trim())
      .filter((department): department is string => Boolean(department));
  }

  async getEmployeesByIds(
    organizationId: string,
    employeeIds: string[],
  ): Promise<EmployeeRow[]> {
    if (employeeIds.length === 0) return [];
    const uniqueIds = [...new Set(employeeIds)];
    return this.db
      .select()
      .from(organisationEmployees)
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          inArray(organisationEmployees.id, uniqueIds),
        ),
      );
  }

  async getEmployeeInOrg(
    organizationId: string,
    employeeId: string,
  ): Promise<
    | (EmployeeRow & {
        reportsToName: string | null;
        locationName: string | null;
      })
    | undefined
  > {
    const [row] = await this.db
      .select({
        id: organisationEmployees.id,
        organizationId: organisationEmployees.organizationId,
        employeeCode: organisationEmployees.employeeCode,
        fullName: organisationEmployees.fullName,
        designation: organisationEmployees.designation,
        department: organisationEmployees.department,
        departmentId: organisationEmployees.departmentId,
        branchLocationLabel: organisationEmployees.branchLocationLabel,
        locationId: organisationEmployees.locationId,
        reportsToEmployeeId: organisationEmployees.reportsToEmployeeId,
        reportsToDesignationOverride:
          organisationEmployees.reportsToDesignationOverride,
        reportsToLocationOverride:
          organisationEmployees.reportsToLocationOverride,
        linkedUserId: organisationEmployees.linkedUserId,
        employmentType: organisationEmployees.employmentType,
        dateOfJoining: organisationEmployees.dateOfJoining,
        mobile: organisationEmployees.mobile,
        companyEmail: organisationEmployees.companyEmail,
        isActive: organisationEmployees.isActive,
        offBoardReasonType: organisationEmployees.offBoardReasonType,
        offBoardComment: organisationEmployees.offBoardComment,
        offBoardedAt: organisationEmployees.offBoardedAt,
        createdAt: organisationEmployees.createdAt,
        updatedAt: organisationEmployees.updatedAt,
        reportsToName: reportsToEmployee.fullName,
        locationName: organisationLocations.name,
      })
      .from(organisationEmployees)
      .leftJoin(
        reportsToEmployee,
        eq(organisationEmployees.reportsToEmployeeId, reportsToEmployee.id),
      )
      .leftJoin(
        organisationLocations,
        eq(organisationEmployees.locationId, organisationLocations.id),
      )
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          eq(organisationEmployees.id, employeeId),
        ),
      )
      .limit(1);
    return row;
  }

  async insertEmployee(values: EmployeeInsert): Promise<EmployeeRow> {
    const [row] = await this.db
      .insert(organisationEmployees)
      .values(values)
      .returning();
    return row;
  }

  async updateEmployee(
    organizationId: string,
    employeeId: string,
    patch: Partial<Omit<EmployeeInsert, 'id' | 'organizationId' | 'createdAt'>>,
  ): Promise<EmployeeRow | undefined> {
    const [row] = await this.db
      .update(organisationEmployees)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(organisationEmployees.organizationId, organizationId),
          eq(organisationEmployees.id, employeeId),
        ),
      )
      .returning();
    return row;
  }

  async listSuppliers(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      supplierType?: OrganisationSupplierType;
      isActive?: boolean;
    },
  ): Promise<{ rows: SupplierRow[]; total: number }> {
    const conditions = [
      eq(organisationSuppliers.organizationId, organizationId),
    ];
    if (options.supplierType) {
      conditions.push(
        eq(organisationSuppliers.supplierType, options.supplierType),
      );
    }
    if (options.isActive !== undefined) {
      conditions.push(eq(organisationSuppliers.isActive, options.isActive));
    }
    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(organisationSuppliers.name, pattern),
          ilike(organisationSuppliers.contactPerson, pattern),
          ilike(organisationSuppliers.contactEmail, pattern),
          ilike(organisationSuppliers.contactPhone, pattern),
          ilike(organisationSuppliers.agreementReference, pattern),
        )!,
      );
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(organisationSuppliers)
        .where(where)
        .orderBy(
          desc(organisationSuppliers.createdAt),
          desc(organisationSuppliers.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(organisationSuppliers)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async getSupplierInOrg(
    organizationId: string,
    supplierId: string,
  ): Promise<SupplierRow | undefined> {
    const [row] = await this.db
      .select()
      .from(organisationSuppliers)
      .where(
        and(
          eq(organisationSuppliers.organizationId, organizationId),
          eq(organisationSuppliers.id, supplierId),
        ),
      )
      .limit(1);
    return row;
  }

  async insertSupplier(values: SupplierInsert): Promise<SupplierRow> {
    const [row] = await this.db
      .insert(organisationSuppliers)
      .values(values)
      .returning();
    return row;
  }

  async updateSupplier(
    organizationId: string,
    supplierId: string,
    patch: Partial<Omit<SupplierInsert, 'id' | 'organizationId' | 'createdAt'>>,
  ): Promise<SupplierRow | undefined> {
    const [row] = await this.db
      .update(organisationSuppliers)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(organisationSuppliers.organizationId, organizationId),
          eq(organisationSuppliers.id, supplierId),
        ),
      )
      .returning();
    return row;
  }

  async listDrivers(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      isActive?: boolean;
      licenseExpired?: boolean;
    },
  ): Promise<{ rows: DriverListRow[]; total: number }> {
    const conditions = [eq(organisationDrivers.organizationId, organizationId)];
    if (options.isActive !== undefined) {
      conditions.push(eq(organisationDrivers.isActive, options.isActive));
    }
    if (options.licenseExpired) {
      conditions.push(lt(organisationDrivers.licenseExpiry, sql`CURRENT_DATE`));
    }
    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(organisationDrivers.name, pattern),
          ilike(organisationDrivers.cprNo, pattern),
          ilike(organisationDrivers.licenseNumber, pattern),
          ilike(organisationDrivers.email, pattern),
          ilike(organisationDrivers.phone, pattern),
          ilike(organisationDrivers.assignedVehicleCode, pattern),
          ilike(organisationSuppliers.name, pattern),
        )!,
      );
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          driver: organisationDrivers,
          supplierName: organisationSuppliers.name,
        })
        .from(organisationDrivers)
        .innerJoin(
          organisationSuppliers,
          eq(organisationDrivers.supplierId, organisationSuppliers.id),
        )
        .where(where)
        .orderBy(
          desc(organisationDrivers.createdAt),
          desc(organisationDrivers.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(organisationDrivers)
        .innerJoin(
          organisationSuppliers,
          eq(organisationDrivers.supplierId, organisationSuppliers.id),
        )
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async getDriverInOrg(
    organizationId: string,
    driverId: string,
  ): Promise<DriverRow | undefined> {
    const [row] = await this.db
      .select()
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.id, driverId),
        ),
      )
      .limit(1);
    return row;
  }

  async getDriverWithSupplierInOrg(
    organizationId: string,
    driverId: string,
  ): Promise<DriverListRow | undefined> {
    const [row] = await this.db
      .select({
        driver: organisationDrivers,
        supplierName: organisationSuppliers.name,
      })
      .from(organisationDrivers)
      .innerJoin(
        organisationSuppliers,
        eq(organisationDrivers.supplierId, organisationSuppliers.id),
      )
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.id, driverId),
        ),
      )
      .limit(1);
    return row;
  }

  async insertDriver(values: DriverInsert): Promise<DriverRow> {
    const [row] = await this.db
      .insert(organisationDrivers)
      .values(values)
      .returning();
    return row;
  }

  async listAssignedVehicleCodes(organizationId: string): Promise<string[]> {
    const rows = await this.db
      .select({
        code: organisationDrivers.assignedVehicleCode,
      })
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          sql`${organisationDrivers.assignedVehicleCode} IS NOT NULL`,
        ),
      );
    return rows
      .map((row) => row.code?.trim())
      .filter((code): code is string => Boolean(code));
  }

  async listDriversBySupplierId(
    organizationId: string,
    supplierId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: DriverListRow[]; total: number }> {
    const where = and(
      eq(organisationDrivers.organizationId, organizationId),
      eq(organisationDrivers.supplierId, supplierId),
    );
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          driver: organisationDrivers,
          supplierName: organisationSuppliers.name,
        })
        .from(organisationDrivers)
        .innerJoin(
          organisationSuppliers,
          eq(organisationDrivers.supplierId, organisationSuppliers.id),
        )
        .where(where)
        .orderBy(
          desc(organisationDrivers.createdAt),
          desc(organisationDrivers.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(organisationDrivers)
        .where(
          and(
            eq(organisationDrivers.organizationId, organizationId),
            eq(organisationDrivers.supplierId, supplierId),
          ),
        ),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async listDriversByActiveLeaseId(
    organizationId: string,
    activeLeaseId: string,
  ): Promise<DriverRow[]> {
    const trimmed = activeLeaseId.trim();
    if (!trimmed) return [];
    return this.db
      .select()
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.assignedActiveLeaseId, trimmed),
          sql`${organisationDrivers.assignedVehicleCode} IS NOT NULL`,
        ),
      );
  }

  async findDriverByAssignedVehicleCode(
    organizationId: string,
    vehicleCode: string,
  ): Promise<DriverRow | undefined> {
    const trimmed = vehicleCode.trim();
    if (!trimmed) return undefined;
    const [row] = await this.db
      .select()
      .from(organisationDrivers)
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.assignedVehicleCode, trimmed),
        ),
      )
      .limit(1);
    return row;
  }

  async updateDriver(
    organizationId: string,
    driverId: string,
    patch: Partial<Omit<DriverInsert, 'id' | 'organizationId' | 'createdAt'>>,
  ): Promise<DriverRow | undefined> {
    const [row] = await this.db
      .update(organisationDrivers)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(organisationDrivers.organizationId, organizationId),
          eq(organisationDrivers.id, driverId),
        ),
      )
      .returning();
    return row;
  }

  async listOrganisationClients(
    organizationId: string,
    page: number,
    pageSize: number,
    options: {
      search?: string;
      isActive?: boolean;
    } = {},
  ): Promise<{ rows: OrganisationClientRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(organisationClients.organizationId, organizationId)];
    if (options.isActive !== undefined) {
      conditions.push(eq(organisationClients.isActive, options.isActive));
    }
    if (options.search?.trim()) {
      const pattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(organisationClients.name, pattern),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(organisationClientPocs)
              .where(
                and(
                  eq(organisationClientPocs.clientId, organisationClients.id),
                  or(
                    ilike(organisationClientPocs.name, pattern),
                    ilike(organisationClientPocs.email, pattern),
                  ),
                ),
              ),
          ),
        )!,
      );
    }
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(organisationClients)
        .where(where)
        .orderBy(
          desc(organisationClients.createdAt),
          desc(organisationClients.id),
        )
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(organisationClients).where(where),
    ]);
    return { rows, total: Number(countRows[0]?.count ?? 0) };
  }

  async getOrganisationClientInOrg(
    organizationId: string,
    clientId: string,
  ): Promise<OrganisationClientRow | undefined> {
    const [row] = await this.db
      .select()
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

  async getOrganisationClientWithPocs(
    organizationId: string,
    clientId: string,
  ): Promise<{
    client: OrganisationClientRow;
    pocs: OrganisationClientPocRow[];
  } | null> {
    const client = await this.getOrganisationClientInOrg(
      organizationId,
      clientId,
    );
    if (!client) return null;
    const pocs = await this.db
      .select()
      .from(organisationClientPocs)
      .where(eq(organisationClientPocs.clientId, clientId))
      .orderBy(asc(organisationClientPocs.sortOrder));
    return { client, pocs };
  }

  async insertOrganisationClient(
    values: OrganisationClientInsert,
  ): Promise<OrganisationClientRow> {
    const [row] = await this.db
      .insert(organisationClients)
      .values(values)
      .returning();
    return row;
  }

  async updateOrganisationClient(
    organizationId: string,
    clientId: string,
    patch: Partial<
      Omit<OrganisationClientInsert, 'id' | 'organizationId' | 'createdAt'>
    >,
  ): Promise<OrganisationClientRow | undefined> {
    const [row] = await this.db
      .update(organisationClients)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(organisationClients.organizationId, organizationId),
          eq(organisationClients.id, clientId),
        ),
      )
      .returning();
    return row;
  }

  async replaceOrganisationClientPocs(
    clientId: string,
    pocs: Omit<
      typeof organisationClientPocs.$inferInsert,
      'id' | 'clientId' | 'createdAt' | 'updatedAt'
    >[],
  ): Promise<OrganisationClientPocRow[]> {
    await this.db
      .delete(organisationClientPocs)
      .where(eq(organisationClientPocs.clientId, clientId));
    if (pocs.length === 0) return [];
    return this.db
      .insert(organisationClientPocs)
      .values(pocs.map((p) => ({ ...p, clientId })))
      .returning();
  }

  async getPrimaryPocsForOrganisationClients(
    clientIds: string[],
  ): Promise<Map<string, OrganisationClientPocRow>> {
    if (clientIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(organisationClientPocs)
      .where(
        and(
          inArray(organisationClientPocs.clientId, clientIds),
          eq(organisationClientPocs.isPrimary, true),
        ),
      );
    const map = new Map<string, OrganisationClientPocRow>();
    for (const row of rows) {
      map.set(row.clientId, row);
    }
    return map;
  }
}
