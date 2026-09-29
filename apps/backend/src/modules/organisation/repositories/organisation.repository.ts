import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  organisationLocations,
  organisationLocationTypes,
} from '../../../database/schema';
import { SYSTEM_LOCATION_TYPE_PRESETS } from '../constants/system-location-type-presets';

export type LocationInsert = typeof organisationLocations.$inferInsert;
export type LocationRow = typeof organisationLocations.$inferSelect;
export type LocationTypeRow = typeof organisationLocationTypes.$inferSelect;

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
  ): Promise<{ rows: LocationRow[]; total: number }> {
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
      this.db
        .select()
        .from(organisationLocations)
        .where(where)
        .orderBy(asc(organisationLocations.name))
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
}
