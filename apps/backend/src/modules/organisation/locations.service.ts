import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { CreateLocationDto } from './dto/create-location.dto';
import type { ListLocationsQueryDto } from './dto/list-locations-query.dto';
import type { UpdateLocationDto } from './dto/update-location.dto';
import type { UpdateLocationStatusDto } from './dto/update-location-status.dto';
import { EmployeesService } from './employees.service';
import { OrganisationRepository } from './repositories/organisation.repository';
import type { EmployeeRow } from './repositories/organisation.repository';
import { formatLocationAddress } from './utils/format-location-address.util';
import {
  assertValidLocationCountry,
  assertValidLocationPostal,
} from './utils/validate-location-geo.util';

@Injectable()
export class LocationsService {
  constructor(
    private readonly repo: OrganisationRepository,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListLocationsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listLocations(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        locationTypeId: query.locationTypeId,
        isActive,
      },
    );
    const employeeNameById = await this.resolveEmployeeNames(
      query.organizationId,
      rows.map((row) => row.responsibleEmployeeId),
    );
    const items = rows.map((row) => this.toListItem(row, employeeNameById));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, locationId: string) {
    const row = await this.repo.getLocationInOrg(organizationId, locationId);
    if (!row) throw new NotFoundException('Location not found');
    const employeeNameById = await this.resolveEmployeeNames(organizationId, [
      row.responsibleEmployeeId,
      row.deputyEmployeeId,
    ]);
    return this.toDetail(row, employeeNameById);
  }

  async create(dto: CreateLocationDto) {
    this.assertDistinctResponsibleAndDeputy(
      dto.responsibleEmployeeId,
      dto.deputyEmployeeId,
    );
    await this.assertEmployeesForLocation(dto.organizationId, {
      responsibleEmployeeId: dto.responsibleEmployeeId,
      deputyEmployeeId: dto.deputyEmployeeId,
    });
    const type = await this.repo.getLocationTypeInOrg(
      dto.organizationId,
      dto.locationTypeId,
    );
    if (!type) {
      throw new BadRequestException('Invalid location type for organization');
    }
    const addressCountry = assertValidLocationCountry(dto.addressCountry);
    assertValidLocationPostal(addressCountry, dto.addressPincode);
    const inserted = await this.repo.insertLocation({
      organizationId: dto.organizationId,
      name: dto.name.trim(),
      locationTypeId: dto.locationTypeId,
      addressLine1: dto.addressLine1.trim(),
      addressLine2: dto.addressLine2?.trim() ?? null,
      addressCity: dto.addressCity?.trim() ?? null,
      addressCountry,
      addressState: dto.addressState?.trim() ?? null,
      addressDistrict: dto.addressDistrict?.trim() ?? null,
      addressPincode: dto.addressPincode?.trim() ?? null,
      siteContactPhone: dto.siteContactPhone?.trim() ?? null,
      siteContactEmail: dto.siteContactEmail?.trim() ?? null,
      responsibleEmployeeId: dto.responsibleEmployeeId ?? null,
      deputyEmployeeId: dto.deputyEmployeeId ?? null,
      isActive: true,
    });
    return this.getById(dto.organizationId, inserted.id);
  }

  async update(
    organizationId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    const existing = await this.repo.getLocationInOrg(
      organizationId,
      locationId,
    );
    if (!existing) throw new NotFoundException('Location not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive locations cannot be edited until reactivated',
      );
    }
    const nextResponsible =
      dto.responsibleEmployeeId !== undefined
        ? dto.responsibleEmployeeId
        : existing.responsibleEmployeeId;
    const nextDeputy =
      dto.deputyEmployeeId !== undefined
        ? dto.deputyEmployeeId
        : existing.deputyEmployeeId;
    this.assertDistinctResponsibleAndDeputy(nextResponsible, nextDeputy);
    await this.assertEmployeesForLocation(organizationId, {
      responsibleEmployeeId:
        dto.responsibleEmployeeId !== undefined
          ? dto.responsibleEmployeeId
          : undefined,
      deputyEmployeeId:
        dto.deputyEmployeeId !== undefined ? dto.deputyEmployeeId : undefined,
    });
    if (dto.locationTypeId) {
      const type = await this.repo.getLocationTypeInOrg(
        organizationId,
        dto.locationTypeId,
      );
      if (!type) {
        throw new BadRequestException('Invalid location type for organization');
      }
    }
    const nextCountry =
      dto.addressCountry !== undefined
        ? assertValidLocationCountry(dto.addressCountry)
        : existing.addressCountry;
    if (dto.addressPincode !== undefined || dto.addressCountry !== undefined) {
      const postal =
        dto.addressPincode !== undefined
          ? dto.addressPincode
          : (existing.addressPincode ?? '');
      assertValidLocationPostal(nextCountry, postal);
    }
    await this.repo.updateLocation(organizationId, locationId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.locationTypeId !== undefined
        ? { locationTypeId: dto.locationTypeId }
        : {}),
      ...(dto.addressLine1 !== undefined
        ? { addressLine1: dto.addressLine1.trim() }
        : {}),
      ...(dto.addressLine2 !== undefined
        ? { addressLine2: dto.addressLine2?.trim() ?? null }
        : {}),
      ...(dto.addressCity !== undefined
        ? { addressCity: dto.addressCity?.trim() ?? null }
        : {}),
      ...(dto.addressCountry !== undefined
        ? { addressCountry: nextCountry }
        : {}),
      ...(dto.addressState !== undefined
        ? { addressState: dto.addressState?.trim() ?? null }
        : {}),
      ...(dto.addressDistrict !== undefined
        ? { addressDistrict: dto.addressDistrict?.trim() ?? null }
        : {}),
      ...(dto.addressPincode !== undefined
        ? { addressPincode: dto.addressPincode?.trim() ?? null }
        : {}),
      ...(dto.siteContactPhone !== undefined
        ? { siteContactPhone: dto.siteContactPhone?.trim() ?? null }
        : {}),
      ...(dto.siteContactEmail !== undefined
        ? { siteContactEmail: dto.siteContactEmail?.trim() ?? null }
        : {}),
      ...(dto.responsibleEmployeeId !== undefined
        ? { responsibleEmployeeId: dto.responsibleEmployeeId }
        : {}),
      ...(dto.deputyEmployeeId !== undefined
        ? { deputyEmployeeId: dto.deputyEmployeeId }
        : {}),
    });
    return this.getById(organizationId, locationId);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    locationId: string,
    dto: UpdateLocationStatusDto,
  ) {
    const existing = await this.repo.getLocationInOrg(
      organizationId,
      locationId,
    );
    if (!existing) throw new NotFoundException('Location not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Location is already inactive');
      }
      await this.repo.updateLocation(organizationId, locationId, {
        isActive: false,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.location.deactivate',
        resourceType: 'organisation_location',
        resourceId: locationId,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Location is already active');
      }
      await this.repo.updateLocation(organizationId, locationId, {
        isActive: true,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.location.activate',
        resourceType: 'organisation_location',
        resourceId: locationId,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, locationId);
  }

  private assertDistinctResponsibleAndDeputy(
    responsibleEmployeeId: string | null | undefined,
    deputyEmployeeId: string | null | undefined,
  ) {
    if (
      responsibleEmployeeId &&
      deputyEmployeeId &&
      responsibleEmployeeId === deputyEmployeeId
    ) {
      throw new BadRequestException(
        'Responsible person and deputy must be different employees',
      );
    }
  }

  private async resolveEmployeeNames(
    organizationId: string,
    employeeIds: Array<string | null | undefined>,
  ): Promise<Map<string, EmployeeRow>> {
    const ids = employeeIds.filter((id): id is string => Boolean(id));
    const rows = await this.repo.getEmployeesByIds(organizationId, ids);
    return new Map(rows.map((row) => [row.id, row]));
  }

  private async assertEmployeesForLocation(
    organizationId: string,
    input: {
      responsibleEmployeeId?: string | null;
      deputyEmployeeId?: string | null;
    },
  ) {
    if (input.responsibleEmployeeId) {
      await this.employees.assertEmployeeAssignable(
        organizationId,
        input.responsibleEmployeeId,
        { mustBeActive: true },
      );
    }
    if (input.deputyEmployeeId) {
      await this.employees.assertEmployeeAssignable(
        organizationId,
        input.deputyEmployeeId,
        { mustBeActive: true },
      );
    }
  }

  private toListItem(
    row: {
      id: string;
      name: string;
      locationTypeId: string;
      typeName: string;
      responsibleEmployeeId: string | null;
      addressLine1: string;
      addressLine2: string | null;
      addressCity: string | null;
      addressState: string | null;
      addressDistrict: string | null;
      addressPincode: string | null;
      siteContactEmail: string | null;
      siteContactPhone: string | null;
      isActive: boolean;
    },
    employeeById: Map<string, EmployeeRow>,
  ) {
    const responsible = row.responsibleEmployeeId
      ? employeeById.get(row.responsibleEmployeeId)
      : undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.typeName,
      locationTypeId: row.locationTypeId,
      address: formatLocationAddress(row),
      responsiblePerson: this.employees.employeeDisplayName(responsible),
      email: responsible?.companyEmail ?? '',
      phone: responsible?.mobile ?? '',
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(
    row: NonNullable<
      Awaited<ReturnType<OrganisationRepository['getLocationInOrg']>>
    >,
    employeeById: Map<string, EmployeeRow>,
  ) {
    const responsible = row.responsibleEmployeeId
      ? employeeById.get(row.responsibleEmployeeId)
      : undefined;
    const deputy = row.deputyEmployeeId
      ? employeeById.get(row.deputyEmployeeId)
      : undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.typeName,
      locationTypeId: row.locationTypeId,
      typePresetKey: row.typePresetKey,
      address: formatLocationAddress(row),
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      addressCity: row.addressCity,
      addressState: row.addressState,
      addressDistrict: row.addressDistrict,
      addressPincode: row.addressPincode,
      addressCountry: row.addressCountry,
      siteContactPhone: row.siteContactPhone,
      siteContactEmail: row.siteContactEmail,
      responsibleEmployeeId: row.responsibleEmployeeId,
      deputyEmployeeId: row.deputyEmployeeId,
      responsiblePerson: this.employees.employeeDisplayName(responsible),
      responsiblePersonPhone: responsible?.mobile ?? '',
      responsiblePersonEmail: responsible?.companyEmail ?? '',
      deputyName: this.employees.employeeDisplayName(deputy),
      deputyPhone: deputy?.mobile ?? '',
      deputyEmail: deputy?.companyEmail ?? '',
      email: responsible?.companyEmail ?? '',
      phone: responsible?.mobile ?? '',
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
