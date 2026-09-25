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
import { ALLOCATION_ELIGIBLE_CONTRACT_STATUSES } from './constants/lease-contract-status';
import type { CreateVehicleAllocationDto } from './dto/create-vehicle-allocation.dto';
import type { ListVehicleAllocationsQueryDto } from './dto/list-vehicle-allocations-query.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { evaluateVehicleAllocation } from './utils/vehicle-allocation.util';

@Injectable()
export class VehicleAllocationsService {
  constructor(
    private readonly repo: FleetLeasingRepository,
    private readonly audit: AuditService,
  ) {}

  async listHub(query: ListVehicleAllocationsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listVehicleAllocations({
      organizationId: query.organizationId,
      page,
      pageSize,
      contractId: query.contractId,
    });
    const items = rows.map((r) => this.toListItem(r));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async listForContract(organizationId: string, contractId: string) {
    await this.requireContract(organizationId, contractId);
    const { rows } = await this.repo.listVehicleAllocations({
      organizationId,
      page: 1,
      pageSize: 200,
      contractId,
    });
    return rows.map((r) => this.toListItem(r));
  }

  async getById(organizationId: string, allocationId: string) {
    const row = await this.repo.findVehicleAllocationInOrg(
      organizationId,
      allocationId,
    );
    if (!row) throw new NotFoundException('Vehicle allocation not found');
    return this.toListItem(row);
  }

  async allocate(
    userId: string,
    organizationId: string,
    contractId: string,
    dto: CreateVehicleAllocationDto,
  ) {
    const contract = await this.requireContract(organizationId, contractId);
    const vehicle = await this.repo.getVehicleInOrg(
      organizationId,
      dto.vehicleId,
    );
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }
    const linked = await this.repo.listContractVehicleIds(contractId);
    const alreadyOnTarget = linked.includes(dto.vehicleId);
    const other = await this.repo.findOtherContractForVehicle(
      organizationId,
      dto.vehicleId,
      contractId,
    );
    const precheck = evaluateVehicleAllocation({
      contractStatus: contract.status,
      eligibleStatuses: ALLOCATION_ELIGIBLE_CONTRACT_STATUSES,
      vehicleStatus: vehicle.status,
      vehicleOnOtherContract: Boolean(other),
      otherContractId: other?.contractId,
      alreadyOnTargetContract: alreadyOnTarget,
      reassignmentConfirmation: dto.reassignmentConfirmation,
    });
    if (!precheck.allowed) {
      throw new BadRequestException({
        code: precheck.reason,
        message: precheck.message,
        otherContractId: precheck.otherContractId,
      });
    }

    if (other) {
      await this.repo.removeContractVehicle(other.contractId, dto.vehicleId);
      await this.repo.insertEvent({
        contractId: other.contractId,
        organizationId,
        eventType: 'vehicle.reassigned_away',
        message: `Vehicle ${vehicle.registrationNo} reassigned to contract ${contract.contractNumber}`,
        actorUserId: userId,
        metadata: {
          targetContractId: contractId,
          reassignmentConfirmation: dto.reassignmentConfirmation?.trim(),
        },
      });
    }

    await this.repo.addContractVehicleIfMissing(contractId, dto.vehicleId);
    const allocation = await this.repo.insertVehicleAllocation({
      organizationId,
      contractId,
      vehicleId: dto.vehicleId,
      reassignmentConfirmation: precheck.requiresReassignmentConfirmation
        ? (dto.reassignmentConfirmation?.trim() ?? null)
        : null,
      notifiedStakeholders: dto.notifiedStakeholders,
    });
    await this.repo.updateVehicleStatus(dto.vehicleId, 'leased');

    await this.repo.insertEvent({
      contractId,
      organizationId,
      eventType: 'vehicle.allocated',
      message: `Vehicle ${vehicle.registrationNo} allocated to contract`,
      actorUserId: userId,
      metadata: {
        allocationId: allocation.id,
        notifiedStakeholders: dto.notifiedStakeholders,
        reassignmentFromContractId: other?.contractId ?? null,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'fleet_vehicle.allocate',
      resourceType: 'fleet_vehicle_allocation',
      resourceId: allocation.id,
      status: 'SUCCESS',
      metadata: {
        contractId,
        vehicleId: dto.vehicleId,
        notifiedStakeholders: dto.notifiedStakeholders,
      },
    });

    return this.toListItem({
      allocation,
      contractNumber: contract.contractNumber,
      registrationNo: vehicle.registrationNo,
      vehicleStatus: 'leased',
      assetClass: vehicle.assetClass,
    });
  }

  private toListItem(row: {
    allocation: {
      id: string;
      organizationId: string;
      contractId: string;
      vehicleId: string;
      reassignmentConfirmation: string | null;
      notifiedStakeholders: unknown;
      createdAt: Date;
    };
    contractNumber: string;
    registrationNo: string;
    vehicleStatus: string;
    assetClass: string;
  }) {
    return {
      id: row.allocation.id,
      organizationId: row.allocation.organizationId,
      contractId: row.allocation.contractId,
      contractNumber: row.contractNumber,
      vehicleId: row.allocation.vehicleId,
      registrationNo: row.registrationNo,
      assetClass: row.assetClass,
      vehicleStatus: row.vehicleStatus,
      reassignmentConfirmation: row.allocation.reassignmentConfirmation,
      notifiedStakeholders: row.allocation.notifiedStakeholders,
      createdAt: row.allocation.createdAt.toISOString(),
    };
  }

  private async requireContract(organizationId: string, contractId: string) {
    const contract = await this.repo.findContractInOrg(
      organizationId,
      contractId,
    );
    if (!contract) throw new NotFoundException('Lease contract not found');
    return contract;
  }
}
