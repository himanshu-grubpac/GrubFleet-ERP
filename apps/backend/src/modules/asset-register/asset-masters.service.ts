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
import type { CreateAssetMasterDto } from './dto/create-asset-master.dto';
import type { ListAssetMastersQueryDto } from './dto/list-asset-masters-query.dto';
import type { UpdateAssetMasterDto } from './dto/update-asset-master.dto';
import type { UpdateAssetMasterStatusDto } from './dto/update-asset-master-status.dto';
import {
  AssetRegisterRepository,
  type AssetMasterWithClassRow,
} from './repositories/asset-register.repository';
import type { AssetRegisterAssetClassRow } from '../../database/schema';

@Injectable()
export class AssetMastersService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListAssetMastersQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listAssetMasters(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive,
        assetClassId: query.assetClassId,
      },
    );
    const items = rows.map((row) => this.toListItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async listCatalogForClass(
    organizationId: string,
    assetClassId: string,
    query: ListAssetMastersQueryDto,
  ) {
    const assetClass = await this.repo.getAssetClassInOrg(
      organizationId,
      assetClassId,
    );
    if (!assetClass) {
      throw new NotFoundException('Asset class not found');
    }
    if (!assetClass.isActive) {
      throw new BadRequestException(
        'Cannot list catalog masters for an inactive asset class',
      );
    }
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listAssetMasters(
      organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive: true,
        assetClassId,
      },
    );
    const items = rows.map((row) => this.toCatalogItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, id: string) {
    const row = await this.repo.getAssetMasterWithClassInOrg(
      organizationId,
      id,
    );
    if (!row) throw new NotFoundException('Asset master not found');
    return this.toDetail(row);
  }

  async create(dto: CreateAssetMasterDto) {
    await this.assertActiveAssetClassInOrg(
      dto.organizationId,
      dto.assetClassId,
    );
    try {
      const inserted = await this.repo.insertAssetMaster({
        organizationId: dto.organizationId,
        assetClassId: dto.assetClassId,
        name: dto.name.trim(),
        isActive: true,
      });
      return this.getById(dto.organizationId, inserted.id);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          'An asset master with this name already exists for the selected asset class',
        );
      }
      throw err;
    }
  }

  async update(organizationId: string, id: string, dto: UpdateAssetMasterDto) {
    if (dto.assetClassId === undefined && dto.name === undefined) {
      throw new BadRequestException('At least one field is required to update');
    }

    const existing = await this.repo.getAssetMasterWithClassInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('Asset master not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive asset masters cannot be edited until reactivated',
      );
    }
    if (!existing.assetClass.isActive) {
      throw new BadRequestException(
        'Asset masters under an inactive asset class cannot be edited until the class is reactivated',
      );
    }

    if (dto.assetClassId !== undefined) {
      await this.assertActiveAssetClassInOrg(organizationId, dto.assetClassId);
    }

    try {
      await this.repo.updateAssetMaster(organizationId, id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.assetClassId !== undefined
          ? { assetClassId: dto.assetClassId }
          : {}),
      });
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          'An asset master with this name already exists for the selected asset class',
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
    dto: UpdateAssetMasterStatusDto,
  ) {
    const existing = await this.repo.getAssetMasterInOrg(organizationId, id);
    if (!existing) throw new NotFoundException('Asset master not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Asset master is already inactive');
      }
      await this.repo.updateAssetMaster(organizationId, id, {
        isActive: false,
        deactivatedAt: new Date(),
        deactivateReason: reason,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'asset_register.asset_master.deactivate',
        resourceType: 'asset_register_asset_master',
        resourceId: id,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Asset master is already active');
      }
      await this.repo.updateAssetMaster(organizationId, id, {
        isActive: true,
        deactivatedAt: null,
        deactivateReason: null,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'asset_register.asset_master.activate',
        resourceType: 'asset_register_asset_master',
        resourceId: id,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, id);
  }

  private async assertActiveAssetClassInOrg(
    organizationId: string,
    assetClassId: string,
  ): Promise<AssetRegisterAssetClassRow> {
    const assetClass = await this.repo.getAssetClassInOrg(
      organizationId,
      assetClassId,
    );
    if (!assetClass) {
      throw new NotFoundException('Asset class not found');
    }
    if (!assetClass.isActive) {
      throw new BadRequestException(
        'Cannot use an inactive asset class for asset masters',
      );
    }
    return assetClass;
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }

  private classSpecSnapshot(assetClass: AssetRegisterAssetClassRow) {
    return {
      vehicleType: assetClass.vehicleType,
      fuelType: assetClass.fuelType,
      mileageFrom: assetClass.mileageFrom ?? null,
      mileageTo: assetClass.mileageTo ?? null,
      mileageUnit: assetClass.mileageUnit ?? null,
      fuelTankCapacity: assetClass.fuelTankCapacity,
      ratedLoadFrom: assetClass.ratedLoadFrom,
      ratedLoadTo: assetClass.ratedLoadTo,
    };
  }

  private toListItem(row: AssetMasterWithClassRow) {
    return {
      id: row.id,
      name: row.name,
      assetClassId: row.assetClassId,
      assetClassName: row.assetClass.name,
      assetClassCode: row.assetClass.code,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toCatalogItem(row: AssetMasterWithClassRow) {
    return {
      id: row.id,
      name: row.name,
      assetClassId: row.assetClassId,
    };
  }

  private toDetail(row: AssetMasterWithClassRow) {
    return {
      ...this.toListItem(row),
      ...this.classSpecSnapshot(row.assetClass),
      isActive: row.isActive,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      deactivateReason: row.deactivateReason ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
