import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { LeaseContractsService } from '../fleet-leasing/lease-contracts.service';
import { FleetLeasingRepository } from '../fleet-leasing/repositories/fleet-leasing.repository';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  ASSET_REGISTER_VEHICLE_LIST_DEFAULT_SORT,
  ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS,
} from './constants/asset-register-list-sort.constants';
import { formatDecimalMoneyForStorage } from '@grubpac/validation';
import { AuditService } from '../audit/audit.service';
import type { CreateAssetRegisterVehicleDto } from './dto/create-asset-register-vehicle.dto';
import type { ListAssetRegisterVehiclesQueryDto } from './dto/list-asset-register-vehicles-query.dto';
import type { UpdateAssetRegisterVehicleDto } from './dto/update-asset-register-vehicle.dto';
import type { UpdateAssetRegisterVehicleStatusDto } from './dto/update-asset-register-vehicle-status.dto';
import {
  AssetRegisterRepository,
  type AssetRegisterVehicleWithRelations,
} from './repositories/asset-register.repository';
import { OrganisationRepository } from '../organisation/repositories/organisation.repository';
import { buildAssetClassSpecLabel } from './utils/asset-class-name.util';
import {
  ASSET_REGISTER_REGISTRATION_DUPLICATE_MESSAGE,
  normalizeAssetRegisterRegistrationNumber,
} from './utils/registration-number.util';
import { OrganizationDomainEventsService } from '../../infrastructure/organization-realtime/organization-domain-events.service';
import { OrganizationDomainEventType } from '../../infrastructure/organization-realtime/organization-domain-event.types';

@Injectable()
export class AssetRegisterVehiclesService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly orgRepo: OrganisationRepository,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => LeaseContractsService))
    private readonly leaseContracts: LeaseContractsService,
    private readonly fleetLeasingRepo: FleetLeasingRepository,
    private readonly domainEvents: OrganizationDomainEventsService,
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
    const sort = resolveListSort(
      ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      ASSET_REGISTER_VEHICLE_LIST_DEFAULT_SORT,
    );
    const demandFilter = query.demandFilter ?? 'any';
    let assetClassIdsWithOpenDemand: string[] | undefined;
    if (demandFilter === 'in_demand' || demandFilter === 'no_demand') {
      assetClassIdsWithOpenDemand =
        await this.fleetLeasingRepo.listAssetClassIdsWithOpenContractDemand(
          query.organizationId,
        );
    }
    const { rows, total } = await this.repo.listVehicles(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive,
        assetClassId: query.assetClassId,
        operationalStatus: query.operationalStatus,
        demandFilter,
        assetClassIdsWithOpenDemand,
        sort,
      },
    );
    const classIds = [...new Set(rows.map((row) => row.assetClassId))];
    const [openDemandContractCountByClass, openDemandUnitsByClass] =
      classIds.length > 0
        ? await Promise.all([
            this.fleetLeasingRepo.countContractsWithUnallocatedDemandByAssetClassIds(
              query.organizationId,
              classIds,
            ),
            this.fleetLeasingRepo.sumUnallocatedCommitmentsByAssetClassIds(
              query.organizationId,
              classIds,
            ),
          ])
        : [new Map<string, number>(), new Map<string, number>()];
    const items = rows.map((row) =>
      this.toListItem(
        row,
        openDemandUnitsByClass.get(row.assetClassId) ?? 0,
        openDemandContractCountByClass.get(row.assetClassId) ?? 0,
      ),
    );
    const paginated = toPaginatedResult(items, page, pageSize, total);
    if (!query.includeAssignmentSummary) {
      return paginated;
    }
    const assignmentSummary =
      await this.fleetLeasingRepo.summarizeOpenAssignmentDemandForOrg(
        query.organizationId,
      );
    return { ...paginated, assignmentSummary };
  }

  async getById(organizationId: string, id: string) {
    const row = await this.repo.getVehicleWithRelationsInOrg(
      organizationId,
      id,
    );
    if (!row) throw new NotFoundException('Asset register vehicle not found');
    const insuranceSupplierName = await this.resolveInsuranceSupplierName(
      organizationId,
      row.insuranceSupplierId,
    );
    return this.toDetail(row, insuranceSupplierName);
  }

  async create(dto: CreateAssetRegisterVehicleDto) {
    await this.assertActiveClass(dto.organizationId, dto.assetClassId);
    if (dto.insuranceSupplierId) {
      await this.assertInsuranceSupplierInOrg(
        dto.organizationId,
        dto.insuranceSupplierId,
      );
    }
    this.assertDateRanges({
      registrationStartDate: dto.registrationStartDate,
      registrationEndDate: dto.registrationEndDate,
      insuranceStartDate: dto.insuranceStartDate,
      insuranceEndDate: dto.insuranceEndDate,
      warrantyStartDate: dto.warrantyStartDate,
      warrantyEndDate: dto.warrantyEndDate,
    });

    const registrationNumber = normalizeAssetRegisterRegistrationNumber(
      dto.registrationNumber,
    );
    await this.assertRegistrationNumberUnique(
      dto.organizationId,
      registrationNumber,
    );

    const fleetCode = await this.repo.allocateFleetCodeInTransaction(
      dto.organizationId,
    );
    try {
      const inserted = await this.repo.insertVehicle({
        organizationId: dto.organizationId,
        assetClassId: dto.assetClassId,
        assetMasterId: null,
        fleetCode,
        registrationNumber,
        chassisNumber: dto.chassisNumber.trim(),
        modelYear: dto.modelYear,
        odometer: dto.odometer,
        registrationStartDate: dto.registrationStartDate,
        registrationEndDate: dto.registrationEndDate,
        insuranceStartDate: dto.insuranceStartDate,
        insuranceEndDate: dto.insuranceEndDate,
        insurancePremium: formatDecimalMoneyForStorage(dto.insurancePremium),
        warrantyStartDate: dto.warrantyStartDate,
        warrantyEndDate: dto.warrantyEndDate,
        specialNotes: dto.specialNotes?.trim() ?? null,
        purchaseInvoiceId: dto.purchaseInvoiceId ?? null,
        insuranceSupplierId: dto.insuranceSupplierId ?? null,
      });
      return this.getById(dto.organizationId, inserted.id);
    } catch (error) {
      if (this.isRegistrationUniqueViolation(error)) {
        throw new ConflictException(
          ASSET_REGISTER_REGISTRATION_DUPLICATE_MESSAGE,
        );
      }
      throw error;
    }
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
    if (dto.assetClassId !== undefined) {
      await this.assertActiveClass(organizationId, nextClassId);
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

    if (dto.registrationNumber !== undefined) {
      const registrationNumber = normalizeAssetRegisterRegistrationNumber(
        dto.registrationNumber,
      );
      await this.assertRegistrationNumberUnique(
        organizationId,
        registrationNumber,
        id,
      );
    }

    if (dto.insuranceSupplierId !== undefined && dto.insuranceSupplierId) {
      await this.assertInsuranceSupplierInOrg(
        organizationId,
        dto.insuranceSupplierId,
      );
    }

    try {
      await this.repo.updateVehicle(organizationId, id, {
        ...(dto.assetClassId !== undefined
          ? { assetClassId: dto.assetClassId, assetMasterId: null }
          : {}),
        ...(dto.registrationNumber !== undefined
          ? {
              registrationNumber: normalizeAssetRegisterRegistrationNumber(
                dto.registrationNumber,
              ),
            }
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
          ? {
              insurancePremium: formatDecimalMoneyForStorage(
                dto.insurancePremium,
              ),
            }
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
        ...(dto.insuranceSupplierId !== undefined
          ? { insuranceSupplierId: dto.insuranceSupplierId }
          : {}),
      });
    } catch (error) {
      if (this.isRegistrationUniqueViolation(error)) {
        throw new ConflictException(
          ASSET_REGISTER_REGISTRATION_DUPLICATE_MESSAGE,
        );
      }
      throw error;
    }
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

    await this.domainEvents.emit({
      type: OrganizationDomainEventType.ASSET_REGISTER_VEHICLE_POOL_CHANGED,
      organizationId,
      resource: 'asset_register_vehicle',
      ids: { vehicleId: id },
    });

    return this.getById(organizationId, id);
  }

  private async assertActiveClass(
    organizationId: string,
    assetClassId: string,
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
  }

  private async assertRegistrationNumberUnique(
    organizationId: string,
    registrationNumber: string,
    excludeVehicleId?: string,
  ): Promise<void> {
    const existingId = await this.repo.findVehicleIdByNormalizedRegistration(
      organizationId,
      registrationNumber,
      excludeVehicleId,
    );
    if (existingId) {
      throw new ConflictException(
        ASSET_REGISTER_REGISTRATION_DUPLICATE_MESSAGE,
      );
    }
  }

  private isRegistrationUniqueViolation(error: unknown): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      (error as { code: string }).code !== '23505'
    ) {
      return false;
    }
    const constraint = String(
      (error as { constraint?: string }).constraint ?? '',
    );
    return constraint === 'asset_register_vehicles_org_registration_norm_uidx';
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

  async getLeaseHistory(organizationId: string, vehicleId: string) {
    const vehicle = await this.repo.getVehicleInOrg(organizationId, vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    const assignments = await this.repo.listAssignmentHistoryForVehicle(
      organizationId,
      vehicleId,
    );
    const contractIds = [
      ...new Set(assignments.map((row) => row.leaseContractId)),
    ];
    const summaries = await this.leaseContracts.getContractSummariesForHistory(
      organizationId,
      contractIds,
    );
    return assignments.map((assignment) => {
      const contract = summaries.get(assignment.leaseContractId);
      const assignedDate = assignment.assignedAt.toISOString().slice(0, 10);
      const startDate = contract?.startDate
        ? contract.startDate.toISOString().slice(0, 10)
        : assignedDate;
      const endDate = contract?.endDate
        ? contract.endDate.toISOString().slice(0, 10)
        : assignment.unassignedAt
          ? assignment.unassignedAt.toISOString().slice(0, 10)
          : '—';
      const status = this.mapLeaseHistoryStatus(
        contract?.status,
        assignment.unassignedAt,
      );
      return {
        id: assignment.id,
        date: assignedDate,
        lessee: contract?.lesseeName ?? '—',
        leaseStartDate: startDate,
        leaseEndDate: endDate,
        status,
        changedBy: '—',
        contractId: assignment.leaseContractId,
        contractNumber: contract?.contractNumber ?? null,
      };
    });
  }

  private mapLeaseHistoryStatus(
    rawStatus: string | undefined,
    unassignedAt: Date | null,
  ): 'Active' | 'Completed' | 'Cancelled' {
    if (unassignedAt) {
      return 'Completed';
    }
    if (
      rawStatus === 'closed' ||
      rawStatus === 'concluded' ||
      rawStatus === 'deactivated' ||
      rawStatus === 'billing_paused' ||
      rawStatus === 'pending_termination'
    ) {
      return 'Cancelled';
    }
    return 'Active';
  }

  private toListItem(
    row: AssetRegisterVehicleWithRelations,
    openDemandUnitsToAssign = 0,
    openDemandContractCount = 0,
  ) {
    return {
      id: row.id,
      fleetCode: row.fleetCode,
      registrationNumber: row.registrationNumber,
      assetClassId: row.assetClassId,
      assetClassName: row.assetClass.name,
      chassisNumber: row.chassisNumber,
      modelYear: row.modelYear,
      odometer: row.odometer,
      addedToRegisterDate: row.createdAt.toISOString().slice(0, 10),
      openDemandUnitsToAssign,
      openDemandContractCount,
      operationalStatus: row.operationalStatus,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(
    row: AssetRegisterVehicleWithRelations,
    insuranceSupplierName: string | null,
  ) {
    const assetClassSpecLabel = buildAssetClassSpecLabel({
      brand: row.assetClass.brand,
      modelName: row.assetClass.modelName,
      manufacturingYear: row.assetClass.manufacturingYear,
      engineDisplacementCc: row.assetClass.engineDisplacementCc,
      fuelType: row.assetClass.fuelType,
      fuelSystem: row.assetClass.fuelSystem,
      color: row.assetClass.color,
      colorCode: row.assetClass.colorCode,
    });
    return {
      ...this.toListItem(row),
      assetClassSpecLabel,
      chassisNumber: row.chassisNumber,
      modelYear: row.modelYear,
      registrationStartDate: row.registrationStartDate,
      registrationEndDate: row.registrationEndDate,
      insuranceStartDate: row.insuranceStartDate,
      insuranceEndDate: row.insuranceEndDate,
      insurancePremium: row.insurancePremium,
      insuranceSupplierId: row.insuranceSupplierId,
      insuranceSupplierName,
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

  private async resolveInsuranceSupplierName(
    organizationId: string,
    supplierId: string | null,
  ): Promise<string | null> {
    if (!supplierId) return null;
    const supplier = await this.orgRepo.getSupplierInOrg(
      organizationId,
      supplierId,
    );
    return supplier?.name?.trim() || null;
  }

  private async assertInsuranceSupplierInOrg(
    organizationId: string,
    supplierId: string,
  ): Promise<void> {
    const supplier = await this.orgRepo.getSupplierInOrg(
      organizationId,
      supplierId,
    );
    if (!supplier) {
      throw new BadRequestException('Insurance supplier not found');
    }
    if (!supplier.isActive) {
      throw new BadRequestException(
        'Insurance supplier must be active to assign to a vehicle',
      );
    }
  }
}
