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
import type { CreateAssetRegisterVehicleDto } from './dto/create-asset-register-vehicle.dto';
import type { ListAssetRegisterVehiclesQueryDto } from './dto/list-asset-register-vehicles-query.dto';
import type { UpdateAssetRegisterVehicleDto } from './dto/update-asset-register-vehicle.dto';
import type { UpdateAssetRegisterVehicleStatusDto } from './dto/update-asset-register-vehicle-status.dto';
import {
  AssetRegisterRepository,
  type AssetRegisterVehicleWithRelations,
} from './repositories/asset-register.repository';

@Injectable()
export class AssetRegisterVehiclesService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListAssetRegisterVehiclesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listVehicles(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive,
        assetClassId: query.assetClassId,
        operationalStatus: query.operationalStatus,
      },
    );
    const items = rows.map((row) => this.toListItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, id: string) {
    const row = await this.repo.getVehicleWithRelationsInOrg(
      organizationId,
      id,
    );
    if (!row) throw new NotFoundException('Asset register vehicle not found');
    return this.toDetail(row);
  }

  async create(dto: CreateAssetRegisterVehicleDto) {
    await this.assertActiveClassAndMaster(
      dto.organizationId,
      dto.assetClassId,
      dto.assetMasterId,
    );
    this.assertDateRanges({
      registrationStartDate: dto.registrationStartDate,
      registrationEndDate: dto.registrationEndDate,
      insuranceStartDate: dto.insuranceStartDate,
      insuranceEndDate: dto.insuranceEndDate,
      warrantyStartDate: dto.warrantyStartDate,
      warrantyEndDate: dto.warrantyEndDate,
    });

    const fleetCode = await this.repo.allocateFleetCodeInTransaction(
      dto.organizationId,
    );
    const inserted = await this.repo.insertVehicle({
      organizationId: dto.organizationId,
      assetClassId: dto.assetClassId,
      assetMasterId: dto.assetMasterId,
      fleetCode,
      registrationNumber: dto.registrationNumber.trim(),
      chassisNumber: dto.chassisNumber.trim(),
      modelYear: dto.modelYear,
      odometer: dto.odometer,
      registrationStartDate: dto.registrationStartDate,
      registrationEndDate: dto.registrationEndDate,
      insuranceStartDate: dto.insuranceStartDate,
      insuranceEndDate: dto.insuranceEndDate,
      insurancePremium: String(dto.insurancePremium),
      warrantyStartDate: dto.warrantyStartDate,
      warrantyEndDate: dto.warrantyEndDate,
      specialNotes: dto.specialNotes?.trim() ?? null,
      purchaseInvoiceId: dto.purchaseInvoiceId ?? null,
    });
    return this.getById(dto.organizationId, inserted.id);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateAssetRegisterVehicleDto,
  ) {
    const keys = Object.keys(dto).filter(
      (k) => dto[k as keyof UpdateAssetRegisterVehicleDto] !== undefined,
    );
    if (keys.length === 0) {
      throw new BadRequestException('At least one field is required to update');
    }

    const existing = await this.repo.getVehicleWithRelationsInOrg(
      organizationId,
      id,
    );
    if (!existing) {
      throw new NotFoundException('Asset register vehicle not found');
    }
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive asset register vehicles cannot be edited until reactivated',
      );
    }

    const nextClassId = dto.assetClassId ?? existing.assetClassId;
    const nextMasterId = dto.assetMasterId ?? existing.assetMasterId;
    if (dto.assetClassId !== undefined || dto.assetMasterId !== undefined) {
      await this.assertActiveClassAndMaster(
        organizationId,
        nextClassId,
        nextMasterId,
      );
    }

    const registrationStartDate =
      dto.registrationStartDate ?? existing.registrationStartDate;
    const registrationEndDate =
      dto.registrationEndDate ?? existing.registrationEndDate;
    const insuranceStartDate =
      dto.insuranceStartDate ?? existing.insuranceStartDate;
    const insuranceEndDate = dto.insuranceEndDate ?? existing.insuranceEndDate;
    const warrantyStartDate =
      dto.warrantyStartDate ?? existing.warrantyStartDate;
    const warrantyEndDate = dto.warrantyEndDate ?? existing.warrantyEndDate;
    this.assertDateRanges({
      registrationStartDate,
      registrationEndDate,
      insuranceStartDate,
      insuranceEndDate,
      warrantyStartDate,
      warrantyEndDate,
    });

    await this.repo.updateVehicle(organizationId, id, {
      ...(dto.assetClassId !== undefined
        ? { assetClassId: dto.assetClassId }
        : {}),
      ...(dto.assetMasterId !== undefined
        ? { assetMasterId: dto.assetMasterId }
        : {}),
      ...(dto.registrationNumber !== undefined
        ? { registrationNumber: dto.registrationNumber.trim() }
        : {}),
      ...(dto.chassisNumber !== undefined
        ? { chassisNumber: dto.chassisNumber.trim() }
        : {}),
      ...(dto.modelYear !== undefined ? { modelYear: dto.modelYear } : {}),
      ...(dto.odometer !== undefined ? { odometer: dto.odometer } : {}),
      ...(dto.registrationStartDate !== undefined
        ? { registrationStartDate: dto.registrationStartDate }
        : {}),
      ...(dto.registrationEndDate !== undefined
        ? { registrationEndDate: dto.registrationEndDate }
        : {}),
      ...(dto.insuranceStartDate !== undefined
        ? { insuranceStartDate: dto.insuranceStartDate }
        : {}),
      ...(dto.insuranceEndDate !== undefined
        ? { insuranceEndDate: dto.insuranceEndDate }
        : {}),
      ...(dto.insurancePremium !== undefined
        ? { insurancePremium: String(dto.insurancePremium) }
        : {}),
      ...(dto.warrantyStartDate !== undefined
        ? { warrantyStartDate: dto.warrantyStartDate }
        : {}),
      ...(dto.warrantyEndDate !== undefined
        ? { warrantyEndDate: dto.warrantyEndDate }
        : {}),
      ...(dto.specialNotes !== undefined
        ? { specialNotes: dto.specialNotes?.trim() ?? null }
        : {}),
      ...(dto.purchaseInvoiceId !== undefined
        ? { purchaseInvoiceId: dto.purchaseInvoiceId }
        : {}),
    });
    return this.getById(organizationId, id);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateAssetRegisterVehicleStatusDto,
  ) {
    const existing = await this.repo.getVehicleInOrg(organizationId, id);
    if (!existing) {
      throw new NotFoundException('Asset register vehicle not found');
    }

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException(
          'Asset register vehicle is already inactive',
        );
      }
      await this.repo.updateVehicle(organizationId, id, {
        isActive: false,
        deactivatedAt: new Date(),
        deactivateReason: reason,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'asset_register.vehicle.deactivate',
        resourceType: 'asset_register_vehicle',
        resourceId: id,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException(
          'Asset register vehicle is already active',
        );
      }
      await this.repo.updateVehicle(organizationId, id, {
        isActive: true,
        deactivatedAt: null,
        deactivateReason: null,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'asset_register.vehicle.activate',
        resourceType: 'asset_register_vehicle',
        resourceId: id,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, id);
  }

  private async assertActiveClassAndMaster(
    organizationId: string,
    assetClassId: string,
    assetMasterId: string,
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
        'Asset class must be active to register a vehicle',
      );
    }
    const master = await this.repo.getAssetMasterInOrg(
      organizationId,
      assetMasterId,
    );
    if (!master) {
      throw new NotFoundException('Asset master not found');
    }
    if (!master.isActive) {
      throw new BadRequestException(
        'Asset master must be active to register a vehicle',
      );
    }
    if (master.assetClassId !== assetClassId) {
      throw new BadRequestException(
        'Asset master does not belong to the selected asset class',
      );
    }
  }

  private assertDateRanges(input: {
    registrationStartDate: string;
    registrationEndDate: string;
    insuranceStartDate: string;
    insuranceEndDate: string;
    warrantyStartDate: string;
    warrantyEndDate: string;
  }) {
    if (input.registrationStartDate > input.registrationEndDate) {
      throw new BadRequestException(
        'registrationStartDate must be on or before registrationEndDate',
      );
    }
    if (input.insuranceStartDate > input.insuranceEndDate) {
      throw new BadRequestException(
        'insuranceStartDate must be on or before insuranceEndDate',
      );
    }
    if (input.warrantyStartDate > input.warrantyEndDate) {
      throw new BadRequestException(
        'warrantyStartDate must be on or before warrantyEndDate',
      );
    }
  }

  private toListItem(row: AssetRegisterVehicleWithRelations) {
    return {
      id: row.id,
      fleetCode: row.fleetCode,
      registrationNumber: row.registrationNumber,
      assetClassId: row.assetClassId,
      assetClassName: row.assetClass.name,
      odometer: row.odometer,
      operationalStatus: row.operationalStatus,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(row: AssetRegisterVehicleWithRelations) {
    return {
      ...this.toListItem(row),
      assetMasterId: row.assetMasterId,
      assetMasterName: row.assetMaster.name,
      assetClassCode: row.assetClass.code,
      chassisNumber: row.chassisNumber,
      modelYear: row.modelYear,
      registrationStartDate: row.registrationStartDate,
      registrationEndDate: row.registrationEndDate,
      insuranceStartDate: row.insuranceStartDate,
      insuranceEndDate: row.insuranceEndDate,
      insurancePremium: row.insurancePremium,
      warrantyStartDate: row.warrantyStartDate,
      warrantyEndDate: row.warrantyEndDate,
      specialNotes: row.specialNotes ?? '',
      purchaseInvoiceId: row.purchaseInvoiceId,
      isActive: row.isActive,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      deactivateReason: row.deactivateReason ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
