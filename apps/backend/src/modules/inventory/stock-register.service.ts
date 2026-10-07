import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { CreateSparePartDto } from './dto/create-spare-part.dto';
import type { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import type { UpdateSparePartDto } from './dto/update-spare-part.dto';
import type { UpdateSparePartStatusDto } from './dto/update-spare-part-status.dto';
import { InventoryRepository } from './repositories/inventory.repository';

@Injectable()
export class StockRegisterService {
  constructor(
    private readonly repo: InventoryRepository,
    private readonly audit: AuditService,
  ) {}

  private formatCompatibleLabel(classes: string[]): string {
    if (classes.length === 0) return '—';
    if (classes.length >= 2) return 'Both classes';
    return classes[0];
  }

  private toListItem(
    row: Awaited<ReturnType<InventoryRepository['getSparePartInOrg']>> & object,
  ) {
    return {
      id: row.id,
      partName: row.name,
      partNumber: row.partCode ?? '—',
      compatibleClass: this.formatCompatibleLabel(
        row.compatibleAssetClasses ?? [],
      ),
      unit: row.unitOfMeasure,
      threshold: String(row.reorderThreshold),
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      availableActions: {
        edit: row.isActive,
      },
    };
  }

  async list(query: ListInventoryQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listSpareParts(
      query.organizationId,
      page,
      pageSize,
      { search: query.search, isActive },
    );
    return toPaginatedResult(
      rows.map((row) => this.toListItem(row)),
      page,
      pageSize,
      total,
    );
  }

  async getById(organizationId: string, partId: string) {
    const row = await this.repo.getSparePartInOrg(organizationId, partId);
    if (!row) throw new NotFoundException('Spare part not found');

    const locationStock = await this.repo.quantityByPartAndLocation(
      organizationId,
      partId,
    );
    const onHand = await this.repo.onHandTotalForPart(organizationId, partId);

    return {
      id: row.id,
      partName: row.name,
      partNumber: row.partCode ?? '—',
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      compatibleAssetClasses: row.compatibleAssetClasses ?? [],
      unitOfMeasure: row.unitOfMeasure,
      retailMarkup: String(row.retailMarkupPercent),
      wholesaleMarkup: String(row.wholesaleMarkupPercent),
      threshold: String(row.reorderThreshold),
      brand: row.brand,
      onHand,
      locationStock: locationStock.map((loc) => ({
        location: loc.locationName,
        quantity: Number(loc.quantity ?? 0),
      })),
      workOrderHistory: [],
      availableActions: {
        edit: row.isActive,
      },
    };
  }

  async create(dto: CreateSparePartDto) {
    const partCode = await this.repo.nextPartCode(dto.organizationId);
    try {
      const row = await this.repo.insertSparePart({
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        partCode,
        brand: dto.brand?.trim() || null,
        unitOfMeasure: dto.unitOfMeasure.trim(),
        reorderThreshold: dto.reorderThreshold,
        retailMarkupPercent: dto.retailMarkupPercent,
        wholesaleMarkupPercent: dto.wholesaleMarkupPercent,
        compatibleAssetClasses: dto.compatibleAssetClasses,
        isActive: true,
      });
      return this.getById(dto.organizationId, row.id);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '23505') {
        throw new ConflictException(
          'Part name already exists in this organization',
        );
      }
      throw err;
    }
  }

  async update(
    organizationId: string,
    partId: string,
    dto: UpdateSparePartDto,
  ) {
    const existing = await this.repo.getSparePartInOrg(organizationId, partId);
    if (!existing) throw new NotFoundException('Spare part not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive spare part cannot be edited until reactivated',
      );
    }
    const updated = await this.repo.updateSparePart(organizationId, partId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.brand !== undefined ? { brand: dto.brand.trim() || null } : {}),
      ...(dto.unitOfMeasure !== undefined
        ? { unitOfMeasure: dto.unitOfMeasure.trim() }
        : {}),
      ...(dto.reorderThreshold !== undefined
        ? { reorderThreshold: dto.reorderThreshold }
        : {}),
      ...(dto.retailMarkupPercent !== undefined
        ? { retailMarkupPercent: dto.retailMarkupPercent }
        : {}),
      ...(dto.wholesaleMarkupPercent !== undefined
        ? { wholesaleMarkupPercent: dto.wholesaleMarkupPercent }
        : {}),
      ...(dto.compatibleAssetClasses !== undefined
        ? { compatibleAssetClasses: dto.compatibleAssetClasses }
        : {}),
    });
    if (!updated) throw new NotFoundException('Spare part not found');
    return this.getById(organizationId, partId);
  }

  async updateStatus(
    organizationId: string,
    partId: string,
    dto: UpdateSparePartStatusDto,
    actorUserId: string,
  ) {
    const existing = await this.repo.getSparePartInOrg(organizationId, partId);
    if (!existing) throw new NotFoundException('Spare part not found');
    if (existing.isActive === dto.isActive) {
      throw new BadRequestException(
        dto.isActive
          ? 'Spare part is already active'
          : 'Spare part is already inactive',
      );
    }
    if (!dto.isActive && !dto.reason?.trim()) {
      throw new BadRequestException('Reason is required to deactivate');
    }
    const updated = await this.repo.updateSparePart(organizationId, partId, {
      isActive: dto.isActive,
      deactivateReason: dto.isActive ? null : (dto.reason?.trim() ?? null),
    });
    if (!updated) throw new NotFoundException('Spare part not found');

    await this.audit.log({
      organizationId,
      userId: actorUserId,
      action: dto.isActive
        ? 'inventory.spare_part.activate'
        : 'inventory.spare_part.deactivate',
      resourceType: 'inventory_spare_part',
      resourceId: partId,
      metadata: dto.reason ? { reason: dto.reason.trim() } : undefined,
    });

    return this.getById(organizationId, partId);
  }
}
