import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import { AuditService } from '../audit/audit.service';
import { FleetLeasingRepository } from '../fleet-leasing/repositories/fleet-leasing.repository';
import type { CreateAssetClassDto } from './dto/create-asset-class.dto';
import type { ListAssetClassesQueryDto } from './dto/list-asset-classes-query.dto';
import type { UpdateAssetClassDto } from './dto/update-asset-class.dto';
import type { UpdateAssetClassStatusDto } from './dto/update-asset-class-status.dto';
import { AssetRegisterRepository } from './repositories/asset-register.repository';
import type { AssetRegisterAssetClassRow } from '../../database/schema';
import {
  assetClassNameCollisionCandidate,
  buildAssetClassNameFromSpec,
  buildAssetClassSpecLabel,
} from './utils/asset-class-name.util';

const NAME_SPEC_FIELDS = [
  'modelName',
  'manufacturingYear',
  'engineDisplacementCc',
  'fuelType',
  'fuelSystem',
  'colorCode',
] as const;

type NameSpecField = (typeof NAME_SPEC_FIELDS)[number];

@Injectable()
export class AssetClassesService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly audit: AuditService,
    private readonly fleetLeasingRepo: FleetLeasingRepository,
    @Inject(DRIZZLE) private readonly db: AppDatabase,
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
    const spec = this.specFromCreateDto(dto);
    const className = await this.allocateUniqueClassName(
      dto.organizationId,
      spec,
    );
    const intakeStored = this.serializeIntakeChecklist(dto);

    const inserted = await this.repo.insertAssetClass({
      organizationId: dto.organizationId,
      name: className,
      description: dto.description?.trim() ?? null,
      brand: spec.brand,
      modelName: spec.modelName,
      manufacturingYear: spec.manufacturingYear,
      engineDisplacementCc: spec.engineDisplacementCc,
      fuelCapacity: this.toNumericString(dto.fuelCapacity),
      fuelSystem: spec.fuelSystem,
      color: spec.color,
      colorCode: spec.colorCode,
      vehicleType: dto.vehicleType,
      fuelType: dto.fuelType.trim(),
      mileageFrom: this.toNumericString(dto.mileageFrom),
      mileageTo: this.toNumericString(dto.mileageTo),
      mileageUnit: dto.mileageUnit?.trim() ?? null,
      fuelTankCapacity: this.toNumericString(dto.fuelTankCapacity),
      ratedLoadFrom: this.toNumericString(dto.ratedLoadFrom),
      ratedLoadTo: this.toNumericString(dto.ratedLoadTo),
      defaultIntakeChecklist: intakeStored,
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
        : this.parseNumeric(existing.ratedLoadFrom);
    const nextRatedTo =
      dto.ratedLoadTo !== undefined
        ? dto.ratedLoadTo
        : this.parseNumeric(existing.ratedLoadTo);
    this.assertNumericRanges({
      mileageFrom: nextMileageFrom,
      mileageTo: nextMileageTo,
      ratedLoadFrom: nextRatedFrom,
      ratedLoadTo: nextRatedTo,
    });

    const patch: Parameters<AssetRegisterRepository['updateAssetClass']>[2] = {
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() ?? null }
        : {}),
      ...(dto.brand !== undefined ? { brand: dto.brand.trim() } : {}),
      ...(dto.modelName !== undefined
        ? { modelName: dto.modelName.trim() }
        : {}),
      ...(dto.manufacturingYear !== undefined
        ? { manufacturingYear: dto.manufacturingYear }
        : {}),
      ...(dto.engineDisplacementCc !== undefined
        ? { engineDisplacementCc: dto.engineDisplacementCc }
        : {}),
      ...(dto.fuelCapacity !== undefined
        ? { fuelCapacity: this.toNumericString(dto.fuelCapacity) }
        : {}),
      ...(dto.fuelSystem !== undefined
        ? { fuelSystem: dto.fuelSystem.trim() }
        : {}),
      ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
      ...(dto.colorCode !== undefined
        ? { colorCode: dto.colorCode.trim() }
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
            fuelTankCapacity: this.toNumericString(dto.fuelTankCapacity),
          }
        : {}),
      ...(dto.ratedLoadFrom !== undefined
        ? { ratedLoadFrom: this.toNumericString(dto.ratedLoadFrom) }
        : {}),
      ...(dto.ratedLoadTo !== undefined
        ? { ratedLoadTo: this.toNumericString(dto.ratedLoadTo) }
        : {}),
    };

    if (
      dto.intakeChecklistItems !== undefined ||
      dto.defaultIntakeChecklist !== undefined
    ) {
      patch.defaultIntakeChecklist = this.serializeIntakeChecklist({
        intakeChecklistItems: dto.intakeChecklistItems,
        defaultIntakeChecklist: dto.defaultIntakeChecklist,
      });
    }

    const mergedRow = { ...existing, ...patch };
    let nextName: string | undefined;
    if (this.didNameSpecChange(existing, dto)) {
      const nameSpec = this.nameSpecFromRow(mergedRow);
      nextName = await this.allocateUniqueClassName(
        organizationId,
        nameSpec,
        id,
      );
      if (nextName !== existing.name) {
        patch.name = nextName;
      }
    }

    if (nextName && nextName !== existing.name) {
      await this.db.transaction(async (tx) => {
        await this.repo.updateAssetClassInTx(tx, organizationId, id, patch);
        await this.fleetLeasingRepo.cascadeAssetClassDisplayName(
          tx,
          organizationId,
          id,
          existing.name,
          nextName,
        );
      });
    } else {
      await this.repo.updateAssetClass(organizationId, id, patch);
    }

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

  private specFromCreateDto(dto: CreateAssetClassDto) {
    return {
      brand: dto.brand?.trim() ?? '',
      modelName: dto.modelName?.trim() ?? '',
      manufacturingYear: dto.manufacturingYear ?? 0,
      engineDisplacementCc: dto.engineDisplacementCc ?? 0,
      fuelType: dto.fuelType.trim(),
      fuelSystem: dto.fuelSystem?.trim() ?? '',
      color: dto.color?.trim() ?? '',
      colorCode: dto.colorCode?.trim() ?? '',
    };
  }

  private nameSpecFromRow(row: AssetRegisterAssetClassRow) {
    return {
      brand: row.brand,
      modelName: row.modelName,
      manufacturingYear: row.manufacturingYear,
      engineDisplacementCc: row.engineDisplacementCc,
      fuelType: row.fuelType,
      fuelSystem: row.fuelSystem,
      color: row.color,
      colorCode: row.colorCode,
    };
  }

  private didNameSpecChange(
    existing: AssetRegisterAssetClassRow,
    dto: UpdateAssetClassDto,
  ): boolean {
    for (const field of NAME_SPEC_FIELDS) {
      if (!this.dtoTouchesNameSpecField(dto, field)) {
        continue;
      }
      const next = this.normalizedNameSpecValue(field, dto, existing);
      const prev = this.normalizedNameSpecValue(field, undefined, existing);
      if (next !== prev) {
        return true;
      }
    }
    return false;
  }

  private dtoTouchesNameSpecField(
    dto: UpdateAssetClassDto,
    field: NameSpecField,
  ): boolean {
    return (dto as Record<string, unknown>)[field] !== undefined;
  }

  private normalizedNameSpecValue(
    field: NameSpecField,
    dto: UpdateAssetClassDto | undefined,
    existing: AssetRegisterAssetClassRow,
  ): string | number {
    const raw =
      dto && (dto as Record<string, unknown>)[field] !== undefined
        ? (dto as Record<string, unknown>)[field]
        : existing[field];
    if (typeof raw === 'string') {
      return raw.trim().toLowerCase();
    }
    if (typeof raw === 'number') {
      return raw;
    }
    return '';
  }

  private async allocateUniqueClassName(
    organizationId: string,
    spec: ReturnType<AssetClassesService['nameSpecFromRow']>,
    excludeClassId?: string,
  ): Promise<string> {
    const base = buildAssetClassNameFromSpec(spec);
    for (let attempt = 1; attempt <= 999; attempt++) {
      const candidate = assetClassNameCollisionCandidate(base, attempt);
      const taken = await this.repo.classNameExistsInOrg(
        organizationId,
        candidate,
        excludeClassId,
      );
      if (!taken) return candidate;
    }
    throw new BadRequestException(
      'Unable to generate a unique asset class name',
    );
  }

  private serializeIntakeChecklist(input: {
    intakeChecklistItems?: string[];
    defaultIntakeChecklist?: string;
  }): string | null {
    if (input.intakeChecklistItems !== undefined) {
      const items = input.intakeChecklistItems
        .map((line) => line.trim())
        .filter(Boolean);
      return items.length > 0 ? JSON.stringify(items) : null;
    }
    if (input.defaultIntakeChecklist !== undefined) {
      const trimmed = input.defaultIntakeChecklist.trim();
      return trimmed || null;
    }
    return null;
  }

  private parseIntakeChecklistItems(stored: string | null): string[] {
    if (!stored?.trim()) return [];
    const trimmed = stored.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        return [trimmed];
      }
    }
    return trimmed
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
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

  private parseNumeric(value: string | null): number | undefined {
    if (value === null || value === '') return undefined;
    return Number(value);
  }

  private toListItem(
    row: AssetRegisterAssetClassRow,
    inFleetCount: number,
    availableCount: number,
  ) {
    const specLabel = buildAssetClassSpecLabel({
      brand: row.brand,
      modelName: row.modelName,
      manufacturingYear: row.manufacturingYear,
      engineDisplacementCc: row.engineDisplacementCc,
      fuelType: row.fuelType,
      fuelSystem: row.fuelSystem,
      color: row.color,
      colorCode: row.colorCode,
    });
    return {
      id: row.id,
      name: row.name,
      specLabel,
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
    const intakeChecklistItems = this.parseIntakeChecklistItems(
      row.defaultIntakeChecklist,
    );
    return {
      ...this.toListItem(row, inFleetCount, availableCount),
      brand: row.brand,
      modelName: row.modelName,
      manufacturingYear: row.manufacturingYear,
      engineDisplacementCc: row.engineDisplacementCc,
      fuelCapacity: row.fuelCapacity ?? null,
      fuelSystem: row.fuelSystem,
      color: row.color,
      colorCode: row.colorCode,
      description: row.description ?? '',
      mileageFrom: row.mileageFrom ?? null,
      mileageTo: row.mileageTo ?? null,
      mileageUnit: row.mileageUnit ?? null,
      fuelTankCapacity: row.fuelTankCapacity ?? null,
      ratedLoadFrom: row.ratedLoadFrom ?? null,
      ratedLoadTo: row.ratedLoadTo ?? null,
      intakeChecklistItems,
      defaultIntakeChecklist: row.defaultIntakeChecklist ?? '',
      isActive: row.isActive,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      deactivateReason: row.deactivateReason ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
