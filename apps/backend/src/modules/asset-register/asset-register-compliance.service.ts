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
  AssetRegisterComplianceRenewType,
  type RenewAssetRegisterComplianceDto,
} from './dto/renew-asset-register-compliance.dto';
import {
  AssetRegisterComplianceFilterStatus,
  type ListAssetRegisterComplianceQueryDto,
} from './dto/list-asset-register-compliance-query.dto';
import {
  AssetRegisterRepository,
  type AssetRegisterVehicleWithRelations,
} from './repositories/asset-register.repository';
import {
  complianceStatusForEndDate,
  worstComplianceStatus,
  type ComplianceItemKind,
  type ComplianceItemStatus,
} from './utils/compliance-status.util';

@Injectable()
export class AssetRegisterComplianceService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListAssetRegisterComplianceQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const filter =
      query.complianceStatus ?? AssetRegisterComplianceFilterStatus.ALL;
    const { rows, total } = await this.repo.listVehiclesForCompliance(
      query.organizationId,
      page,
      pageSize,
      {
        assetClassId: query.assetClassId,
        complianceStatus: filter,
      },
    );
    const items = rows.map((row) => this.toComplianceListItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getDetail(organizationId: string, vehicleId: string) {
    const row = await this.repo.getVehicleWithRelationsInOrg(
      organizationId,
      vehicleId,
    );
    if (!row) {
      throw new NotFoundException('Asset register vehicle not found');
    }
    return this.toComplianceDetail(row);
  }

  async renew(
    userId: string,
    vehicleId: string,
    dto: RenewAssetRegisterComplianceDto,
  ) {
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const existing = await this.repo.getVehicleWithRelationsInOrg(
      dto.organizationId,
      vehicleId,
    );
    if (!existing) {
      throw new NotFoundException('Asset register vehicle not found');
    }
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive asset register vehicle cannot be renewed until reactivated',
      );
    }

    if (
      dto.type === AssetRegisterComplianceRenewType.INSURANCE &&
      dto.insurancePremium === undefined
    ) {
      throw new BadRequestException(
        'insurancePremium is required when renewing insurance',
      );
    }

    const patch: Parameters<AssetRegisterRepository['updateVehicle']>[2] = {};
    if (dto.type === AssetRegisterComplianceRenewType.INSURANCE) {
      patch.insuranceStartDate = dto.startDate;
      patch.insuranceEndDate = dto.endDate;
      patch.insurancePremium = String(dto.insurancePremium);
    } else if (dto.type === AssetRegisterComplianceRenewType.REGISTRATION) {
      patch.registrationStartDate = dto.startDate;
      patch.registrationEndDate = dto.endDate;
    } else {
      patch.warrantyStartDate = dto.startDate;
      patch.warrantyEndDate = dto.endDate;
    }

    await this.repo.updateVehicle(dto.organizationId, vehicleId, patch);

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: `asset_register_compliance.renew_${dto.type}`,
      resourceType: 'asset_register_vehicle',
      resourceId: vehicleId,
      status: 'SUCCESS',
      metadata: {
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        insurancePremium: dto.insurancePremium,
      },
    });

    return this.getDetail(dto.organizationId, vehicleId);
  }

  private toComplianceListItem(row: AssetRegisterVehicleWithRelations) {
    const compliance = this.buildComplianceItems(row);
    return {
      vehicleId: row.id,
      fleetCode: row.fleetCode,
      registrationNumber: row.registrationNumber,
      assetClassName: row.assetClass.name,
      overallComplianceStatus: compliance.overallStatus,
      insurance: compliance.insurance,
      registration: compliance.registration,
      warranty: compliance.warranty,
    };
  }

  private toComplianceDetail(row: AssetRegisterVehicleWithRelations) {
    const compliance = this.buildComplianceItems(row);
    return {
      vehicleId: row.id,
      fleetCode: row.fleetCode,
      registrationNumber: row.registrationNumber,
      chassisNumber: row.chassisNumber,
      modelYear: row.modelYear,
      odometer: row.odometer,
      assetClassId: row.assetClassId,
      assetClassName: row.assetClass.name,
      assetMasterId: row.assetMasterId,
      assetMasterName: row.assetMaster.name,
      operationalStatus: row.operationalStatus,
      isActive: row.isActive,
      overallComplianceStatus: compliance.overallStatus,
      insurance: compliance.insurance,
      registration: compliance.registration,
      warranty: compliance.warranty,
    };
  }

  private buildComplianceItems(row: AssetRegisterVehicleWithRelations) {
    const insurance = this.itemFromDates(
      'insurance',
      row.insuranceStartDate,
      row.insuranceEndDate,
    );
    const registration = this.itemFromDates(
      'registration',
      row.registrationStartDate,
      row.registrationEndDate,
    );
    const warranty = this.itemFromDates(
      'warranty',
      row.warrantyStartDate,
      row.warrantyEndDate,
    );
    const overallStatus = worstComplianceStatus([
      insurance.status,
      registration.status,
      warranty.status,
    ]);
    return {
      overallStatus,
      insurance: { ...insurance, premium: row.insurancePremium },
      registration,
      warranty,
    };
  }

  private itemFromDates(
    kind: ComplianceItemKind,
    startDate: string,
    endDate: string,
  ): {
    kind: ComplianceItemKind;
    startDate: string;
    endDate: string;
    status: ComplianceItemStatus;
  } {
    return {
      kind,
      startDate,
      endDate,
      status: complianceStatusForEndDate(endDate),
    };
  }
}
