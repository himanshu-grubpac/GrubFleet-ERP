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
import type { CreateAssetClassDto } from './dto/create-asset-class.dto';
import type { ListAssetClassesQueryDto } from './dto/list-asset-classes-query.dto';
import type { UpdateAssetClassDto } from './dto/update-asset-class.dto';
import type { UpdateAssetClassStatusDto } from './dto/update-asset-class-status.dto';
import { AssetRegisterRepository } from './repositories/asset-register.repository';
import type { AssetRegisterAssetClassRow } from '../../database/schema';
import {
  assetClassCodeCandidate,
  deriveAssetClassCodeBase,
} from './utils/asset-class-code.util';

@Injectable()
export class AssetClassesService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListAssetClassesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listAssetClasses(
      query.organizationId,
      page,
      pageSize,
      { search: query.search, isActive },
    );
    const classIds = rows.map((row) => row.id);
    const fleetCounts = await this.repo.countActiveVehiclesByClassIds(
      query.organizationId,
      classIds,
    );
    const availableCounts = await this.repo.countAvailableVehiclesByClassIds(
      query.organizationId,
      classIds,
    );
    const items = rows.map((row) =>
      this.toListItem(
        row,
        fleetCounts.get(row.id) ?? 0,
        availableCounts.get(row.id) ?? 0,
      ),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, id: string) {
    const row = await this.repo.getAssetClassInOrg(organizationId, id);
    if (!row) throw new NotFoundException('Asset class not found');
    const inFleetCount =
      (await this.repo.countActiveVehiclesByClassIds(organizationId, [id])).get(
        id,
      ) ?? 0;
    const availableCount =
      (
        await this.repo.countAvailableVehiclesByClassIds(organizationId, [id])
      ).get(id) ?? 0;
    return this.toDetail(row, inFleetCount, availableCount);
  }

  async create(dto: CreateAssetClassDto) {
    this.assertNumericRanges(dto);
    const code = await this.allocateUniqueCode(
      dto.organizationId,
      dto.name.trim(),
    );
    const inserted = await this.repo.insertAssetClass({
      organizationId: dto.organizationId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      code,
      vehicleType: dto.vehicleType,
      fuelType: dto.fuelType.trim(),
      mileageFrom: this.toNumericString(dto.mileageFrom),
      mileageTo: this.toNumericString(dto.mileageTo),
      mileageUnit: dto.mileageUnit?.trim() ?? null,
      fuelTankCapacity: this.toNumericStringRequired(dto.fuelTankCapacity),
      ratedLoadFrom: this.toNumericStringRequired(dto.ratedLoadFrom),
      ratedLoadTo: this.toNumericStringRequired(dto.ratedLoadTo),
      defaultIntakeChecklist: dto.defaultIntakeChecklist?.trim() ?? null,
      isActive: true,
    });
    return this.toDetail(inserted, 0, 0);
  }

  async update(organizationId: string, id: string, dto: UpdateAssetClassDto) {
    const existing = await this.repo.getAssetClassInOrg(organizationId, id);
    if (!existing) throw new NotFoundException('Asset class not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive asset classes cannot be edited until reactivated',
      );
    }

    const nextMileageFrom =
      dto.mileageFrom !== undefined
        ? dto.mileageFrom
        : this.parseNumeric(existing.mileageFrom);
    const nextMileageTo =
      dto.mileageTo !== undefined
        ? dto.mileageTo
        : this.parseNumeric(existing.mileageTo);
    const nextRatedFrom =
      dto.ratedLoadFrom !== undefined
        ? dto.ratedLoadFrom
        : this.parseNumericRequired(existing.ratedLoadFrom);
    const nextRatedTo =
      dto.ratedLoadTo !== undefined
        ? dto.ratedLoadTo
        : this.parseNumericRequired(existing.ratedLoadTo);
    this.assertNumericRanges({
      mileageFrom: nextMileageFrom,
      mileageTo: nextMileageTo,
      ratedLoadFrom: nextRatedFrom,
      ratedLoadTo: nextRatedTo,
    });

    await this.repo.updateAssetClass(organizationId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() ?? null }
        : {}),
      ...(dto.vehicleType !== undefined
        ? { vehicleType: dto.vehicleType }
        : {}),
      ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType.trim() } : {}),
      ...(dto.mileageFrom !== undefined
        ? { mileageFrom: this.toNumericString(dto.mileageFrom) }
        : {}),
      ...(dto.mileageTo !== undefined
        ? { mileageTo: this.toNumericString(dto.mileageTo) }
        : {}),
      ...(dto.mileageUnit !== undefined
        ? { mileageUnit: dto.mileageUnit?.trim() ?? null }
        : {}),
      ...(dto.fuelTankCapacity !== undefined
        ? {
            fuelTankCapacity: this.toNumericStringRequired(
              dto.fuelTankCapacity,
            ),
          }
        : {}),
      ...(dto.ratedLoadFrom !== undefined
        ? { ratedLoadFrom: this.toNumericStringRequired(dto.ratedLoadFrom) }
        : {}),
      ...(dto.ratedLoadTo !== undefined
        ? { ratedLoadTo: this.toNumericStringRequired(dto.ratedLoadTo) }
        : {}),
      ...(dto.defaultIntakeChecklist !== undefined
        ? {
            defaultIntakeChecklist: dto.defaultIntakeChecklist?.trim() ?? null,
          }
        : {}),
    });
    return this.getById(organizationId, id);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateAssetClassStatusDto,
  ) {
    const existing = await this.repo.getAssetClassInOrg(organizationId, id);
    if (!existing) throw new NotFoundException('Asset class not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Asset class is already inactive');
      }
      await this.repo.updateAssetClass(organizationId, id, {
        isActive: false,
        deactivatedAt: new Date(),
        deactivateReason: reason,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'asset_register.asset_class.deactivate',
        resourceType: 'asset_register_asset_class',
        resourceId: id,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Asset class is already active');
      }
      await this.repo.updateAssetClass(organizationId, id, {
        isActive: true,
        deactivatedAt: null,
        deactivateReason: null,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'asset_register.asset_class.activate',
        resourceType: 'asset_register_asset_class',
        resourceId: id,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, id);
  }

  private async allocateUniqueCode(
    organizationId: string,
    name: string,
  ): Promise<string> {
    const base = deriveAssetClassCodeBase(name);
    for (let attempt = 1; attempt <= 999; attempt++) {
      const candidate = assetClassCodeCandidate(base, attempt);
      const taken = await this.repo.codeExistsInOrg(organizationId, candidate);
      if (!taken) return candidate;
    }
    throw new BadRequestException(
      'Unable to generate a unique asset class code',
    );
  }

  private assertNumericRanges(input: {
    mileageFrom?: number;
    mileageTo?: number;
    ratedLoadFrom?: number;
    ratedLoadTo?: number;
  }) {
    if (
      input.mileageFrom !== undefined &&
      input.mileageTo !== undefined &&
      input.mileageFrom > input.mileageTo
    ) {
      throw new BadRequestException(
        'mileageFrom must be less than or equal to mileageTo',
      );
    }
    if (
      input.ratedLoadFrom !== undefined &&
      input.ratedLoadTo !== undefined &&
      input.ratedLoadFrom > input.ratedLoadTo
    ) {
      throw new BadRequestException(
        'ratedLoadFrom must be less than or equal to ratedLoadTo',
      );
    }
  }

  private toNumericString(value: number | undefined): string | null {
    if (value === undefined) return null;
    return String(value);
  }

  private toNumericStringRequired(value: number): string {
    return String(value);
  }

  private parseNumeric(value: string | null): number | undefined {
    if (value === null || value === '') return undefined;
    return Number(value);
  }

  private parseNumericRequired(value: string): number {
    return Number(value);
  }

  private toListItem(
    row: AssetRegisterAssetClassRow,
    inFleetCount: number,
    availableCount: number,
  ) {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      vehicleType: row.vehicleType,
      fuelType: row.fuelType,
      inFleetCount,
      availableCount,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(
    row: AssetRegisterAssetClassRow,
    inFleetCount: number,
    availableCount: number,
  ) {
    return {
      ...this.toListItem(row, inFleetCount, availableCount),
      description: row.description ?? '',
      mileageFrom: row.mileageFrom ?? null,
      mileageTo: row.mileageTo ?? null,
      mileageUnit: row.mileageUnit ?? null,
      fuelTankCapacity: row.fuelTankCapacity,
      ratedLoadFrom: row.ratedLoadFrom,
      ratedLoadTo: row.ratedLoadTo,
      defaultIntakeChecklist: row.defaultIntakeChecklist ?? '',
      isActive: row.isActive,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      deactivateReason: row.deactivateReason ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
