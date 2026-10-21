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
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  LABOR_JOB_CARD_LIST_DEFAULT_SORT,
  LABOR_JOB_CARD_LIST_SORT_FIELDS,
} from './constants/workshop-list-sort.constants';
import { AuditService } from '../audit/audit.service';
import { InventoryRepository } from '../inventory/repositories/inventory.repository';
import type { CreateLaborJobCardDto } from './dto/create-labor-job-card.dto';
import type { ListLaborJobCardsQueryDto } from './dto/list-labor-job-cards-query.dto';
import type { UpdateLaborJobCardDto } from './dto/update-labor-job-card.dto';
import type { UpdateLaborJobCardStatusDto } from './dto/update-labor-job-card-status.dto';
import { WorkshopRepository } from './repositories/workshop.repository';

@Injectable()
export class LaborJobCardsService {
  constructor(
    private readonly workshopRepo: WorkshopRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListLaborJobCardsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const sort = resolveListSort(
      LABOR_JOB_CARD_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      LABOR_JOB_CARD_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.workshopRepo.listLaborJobCards(
      query.organizationId,
      page,
      pageSize,
      { search: query.search, isActive, sort },
    );
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      laborChargeMinor: row.laborChargeMinor,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, id: string) {
    const row = await this.workshopRepo.getLaborJobCardInOrg(
      organizationId,
      id,
    );
    if (!row) throw new NotFoundException('Labor job card not found');
    const partRows = await this.workshopRepo.listLaborJobCardParts(row.id);
    const parts = await Promise.all(
      partRows.map(async ({ line, partName, partCode }) => ({
        partId: line.inventoryPartId,
        partName,
        partCode: partCode ?? null,
        quantity: line.quantity,
        unitCostMinor: await this.workshopRepo.averageUnitCostMinorForPart(
          organizationId,
          line.inventoryPartId,
        ),
      })),
    );
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      laborChargeMinor: row.laborChargeMinor,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      parts,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(organizationId: string, id: string, dto: UpdateLaborJobCardDto) {
    const existing = await this.workshopRepo.getLaborJobCardInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('Labor job card not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive labor job card cannot be edited until reactivated',
      );
    }

    if (dto.parts !== undefined) {
      const seenPartIds = new Set<string>();
      for (const line of dto.parts) {
        if (seenPartIds.has(line.partId)) {
          throw new BadRequestException('Duplicate part on labor job card');
        }
        seenPartIds.add(line.partId);
        const part = await this.inventoryRepo.getSparePartInOrg(
          organizationId,
          line.partId,
        );
        if (!part) {
          throw new BadRequestException(
            'Inventory part not found in organization',
          );
        }
        if (!part.isActive) {
          throw new BadRequestException(
            'Inactive inventory part cannot be added to a labor job card',
          );
        }
      }
      await this.workshopRepo.replaceLaborJobCardParts(
        id,
        dto.parts.map((line) => ({
          inventoryPartId: line.partId,
          quantity: line.quantity,
        })),
      );
    }

    try {
      await this.workshopRepo.updateLaborJobCard(organizationId, id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ?? null }
          : {}),
        ...(dto.laborChargeMinor !== undefined
          ? { laborChargeMinor: dto.laborChargeMinor }
          : {}),
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '23505') {
        throw new ConflictException(
          'Labor job card name already exists in this organization',
        );
      }
      throw err;
    }

    return this.getById(organizationId, id);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateLaborJobCardStatusDto,
  ) {
    const existing = await this.workshopRepo.getLaborJobCardInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('Labor job card not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Labor job card is already inactive');
      }
      await this.workshopRepo.updateLaborJobCard(organizationId, id, {
        isActive: false,
        deactivateReason: reason,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'workshop.labor_job_card.deactivate',
        resourceType: 'workshop_labor_job_card',
        resourceId: id,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Labor job card is already active');
      }
      await this.workshopRepo.updateLaborJobCard(organizationId, id, {
        isActive: true,
        deactivateReason: null,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'workshop.labor_job_card.activate',
        resourceType: 'workshop_labor_job_card',
        resourceId: id,
        status: 'SUCCESS',
      });
    }

    return this.getById(organizationId, id);
  }

  async create(dto: CreateLaborJobCardDto) {
    const partLines = dto.parts ?? [];
    const seenPartIds = new Set<string>();
    for (const line of partLines) {
      if (seenPartIds.has(line.partId)) {
        throw new BadRequestException('Duplicate part on labor job card');
      }
      seenPartIds.add(line.partId);
      const part = await this.inventoryRepo.getSparePartInOrg(
        dto.organizationId,
        line.partId,
      );
      if (!part) {
        throw new BadRequestException(
          'Inventory part not found in organization',
        );
      }
      if (!part.isActive) {
        throw new BadRequestException(
          'Inactive inventory part cannot be added to a labor job card',
        );
      }
    }

    try {
      const inserted = await this.workshopRepo.insertLaborJobCard(
        {
          organizationId: dto.organizationId,
          name: dto.name.trim(),
          description: dto.description?.trim() ?? null,
          laborChargeMinor: dto.laborChargeMinor,
          isActive: true,
        },
        partLines.map((line) => ({
          inventoryPartId: line.partId,
          quantity: line.quantity,
        })),
      );
      return this.getById(dto.organizationId, inserted.id);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '23505') {
        throw new ConflictException(
          'Labor job card name already exists in this organization',
        );
      }
      throw err;
    }
  }
}
