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
import {
  ORGANISATION_SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
  supplierTypeToLabel,
  type OrganisationSupplierType,
} from './constants/supplier-type.constants';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';
import type { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';
import { OrganisationRepository } from './repositories/organisation.repository';
import type { SupplierRow } from './repositories/organisation.repository';
import { formatLocationAddress } from './utils/format-location-address.util';
import {
  assertValidLocationCountry,
  assertValidLocationPostal,
} from './utils/validate-location-geo.util';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly repo: OrganisationRepository,
    private readonly audit: AuditService,
  ) {}

  listSupplierTypes(organizationId: string) {
    void organizationId;
    return {
      items: ORGANISATION_SUPPLIER_TYPES.map((key) => ({
        key,
        label: SUPPLIER_TYPE_LABELS[key],
      })),
    };
  }

  async list(query: ListSuppliersQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const supplierType =
      query.supplierType === 'spareparts'
        ? ('spare_parts' as const)
        : query.supplierType;
    const { rows, total } = await this.repo.listSuppliers(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        supplierType,
        isActive,
      },
    );
    const items = rows.map((row) => this.toListItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, supplierId: string) {
    const row = await this.repo.getSupplierInOrg(organizationId, supplierId);
    if (!row) throw new NotFoundException('Supplier not found');
    return this.toDetail(organizationId, row);
  }

  async create(dto: CreateSupplierDto) {
    const addressCountry = assertValidLocationCountry(dto.addressCountry);
    assertValidLocationPostal(addressCountry, dto.addressPincode);
    const inserted = await this.repo.insertSupplier({
      organizationId: dto.organizationId,
      name: dto.name.trim(),
      supplierType: dto.supplierType,
      contactPerson: dto.contactPerson.trim(),
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail.trim().toLowerCase(),
      agreementReference: dto.agreementReference?.trim() ?? null,
      addressLine1: dto.addressLine1.trim(),
      addressLine2: dto.addressLine2?.trim() ?? null,
      addressCity: dto.addressCity?.trim() ?? null,
      addressCountry,
      addressState: dto.addressState.trim(),
      addressDistrict: dto.addressDistrict.trim(),
      addressPincode: dto.addressPincode.trim(),
      isActive: true,
    });
    return this.getById(dto.organizationId, inserted.id);
  }

  async update(
    organizationId: string,
    supplierId: string,
    dto: UpdateSupplierDto,
  ) {
    const existing = await this.repo.getSupplierInOrg(
      organizationId,
      supplierId,
    );
    if (!existing) throw new NotFoundException('Supplier not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive suppliers cannot be edited until reactivated',
      );
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
    await this.repo.updateSupplier(organizationId, supplierId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.supplierType !== undefined
        ? { supplierType: dto.supplierType }
        : {}),
      ...(dto.contactPerson !== undefined
        ? { contactPerson: dto.contactPerson.trim() }
        : {}),
      ...(dto.contactPhone !== undefined
        ? { contactPhone: dto.contactPhone.trim() }
        : {}),
      ...(dto.contactEmail !== undefined
        ? { contactEmail: dto.contactEmail.trim().toLowerCase() }
        : {}),
      ...(dto.agreementReference !== undefined
        ? { agreementReference: dto.agreementReference?.trim() ?? null }
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
        ? { addressState: dto.addressState.trim() }
        : {}),
      ...(dto.addressDistrict !== undefined
        ? { addressDistrict: dto.addressDistrict.trim() }
        : {}),
      ...(dto.addressPincode !== undefined
        ? { addressPincode: dto.addressPincode.trim() }
        : {}),
    });
    return this.getById(organizationId, supplierId);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    supplierId: string,
    dto: UpdateSupplierStatusDto,
  ) {
    const existing = await this.repo.getSupplierInOrg(
      organizationId,
      supplierId,
    );
    if (!existing) throw new NotFoundException('Supplier not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Supplier is already inactive');
      }
      await this.repo.updateSupplier(organizationId, supplierId, {
        isActive: false,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.supplier.deactivate',
        resourceType: 'organisation_supplier',
        resourceId: supplierId,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Supplier is already active');
      }
      await this.repo.updateSupplier(organizationId, supplierId, {
        isActive: true,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.supplier.activate',
        resourceType: 'organisation_supplier',
        resourceId: supplierId,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, supplierId);
  }

  private toListItem(row: SupplierRow) {
    return {
      id: row.id,
      name: row.name,
      type: supplierTypeToLabel(row.supplierType),
      supplierType: row.supplierType,
      contactPerson: row.contactPerson,
      phone: row.contactPhone,
      email: row.contactEmail,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private static readonly LINKED_DRIVERS_PAGE_SIZE = 50;

  private async toDetail(organizationId: string, row: SupplierRow) {
    const linkedSections = await this.buildLinkedSections(
      organizationId,
      row.id,
      row.supplierType,
    );
    return {
      ...this.toListItem(row),
      agreementReference: row.agreementReference ?? '',
      address: formatLocationAddress(row),
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      addressCity: row.addressCity,
      addressState: row.addressState,
      addressDistrict: row.addressDistrict,
      addressPincode: row.addressPincode,
      addressCountry: row.addressCountry,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      linkedSections,
    };
  }

  /**
   * Cross-module links: driver-type suppliers load organisation drivers by
   * supplierId. Inventory, compliance, and bike vehicle links stay empty until
   * those modules ship — no placeholder rows.
   */
  private async buildLinkedSections(
    organizationId: string,
    supplierId: string,
    supplierType: OrganisationSupplierType,
  ) {
    const reliabilityTitle =
      supplierType === 'driver'
        ? 'Staffing reliability'
        : supplierType === 'compliance'
          ? null
          : 'Delivery reliability';

    const linkedTitleByType: Record<OrganisationSupplierType, string> = {
      bike: 'Linked vehicles',
      driver: 'Linked drivers',
      spare_parts: 'Linked parts',
      compliance: 'Linked renewals',
    };

    let linkedItems: Record<string, string | number>[] = [];
    let linkedTotal = 0;
    if (supplierType === 'driver') {
      const { rows, total } = await this.repo.listDriversBySupplierId(
        organizationId,
        supplierId,
        1,
        SuppliersService.LINKED_DRIVERS_PAGE_SIZE,
      );
      linkedTotal = total;
      linkedItems = rows.map(({ driver }) => ({
        id: driver.id,
        driver: driver.name,
        licenseNo: driver.licenseNumber,
        assignedVehicle: driver.assignedVehicleCode?.trim() || '—',
        status: driver.isActive ? 'Active' : 'Inactive',
      }));
    }

    return {
      reliability: reliabilityTitle
        ? {
            title: reliabilityTitle,
            items: [] as Array<{
              incident: string;
              date: string;
              details: string;
            }>,
          }
        : null,
      linked: {
        title: linkedTitleByType[supplierType],
        items: linkedItems,
        ...(supplierType === 'driver'
          ? {
              total: linkedTotal,
              page: 1,
              pageSize: SuppliersService.LINKED_DRIVERS_PAGE_SIZE,
            }
          : {}),
      },
    };
  }
}
