import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FleetLeasingRepository } from '../fleet-leasing/repositories/fleet-leasing.repository';
import { AuditService } from '../audit/audit.service';
import { AssetRegisterAssignmentErrorCodes } from './constants/asset-register-assignment.constants';
import type { BulkAssignAssetRegisterVehiclesDto } from './dto/bulk-assign-asset-register-vehicles.dto';
import {
  AssetRegisterRepository,
  type AssetRegisterVehicleWithRelations,
} from './repositories/asset-register.repository';

@Injectable()
export class AssetRegisterAssignmentsService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly fleetRepo: FleetLeasingRepository,
    private readonly audit: AuditService,
  ) {}

  async bulkAssign(userId: string, dto: BulkAssignAssetRegisterVehiclesDto) {
    const uniqueIds = [...new Set(dto.vehicleIds)];
    if (uniqueIds.length !== dto.vehicleIds.length) {
      throw new BadRequestException('vehicleIds must be unique');
    }

    const contract = await this.fleetRepo.findContractInOrg(
      dto.organizationId,
      dto.leaseContractId,
    );
    if (!contract) {
      throw new NotFoundException('Lease contract not found');
    }
    if (contract.status !== 'active') {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.NO_ACTIVE_LEASE_CONTRACT,
        message: 'Vehicles can only be assigned to an active lease contract',
      });
    }

    await this.assertOrganisationClientForLease(
      dto.organizationId,
      contract.clientId ?? null,
      dto.organisationClientId,
    );

    const assetLines = await this.fleetRepo.listAssetLines(dto.leaseContractId);
    const lineByClass = new Map(
      assetLines.map((line) => [line.assetClass.trim(), line]),
    );

    const vehicles = await this.repo.getVehiclesWithRelationsByIds(
      dto.organizationId,
      uniqueIds,
    );
    if (vehicles.length !== uniqueIds.length) {
      throw new BadRequestException('One or more vehicles were not found');
    }

    this.assertVehiclesAssignable(vehicles);

    for (const vehicle of vehicles) {
      const active = await this.repo.findActiveAssignmentForVehicle(
        dto.organizationId,
        vehicle.id,
      );
      if (active) {
        throw new BadRequestException({
          code: AssetRegisterAssignmentErrorCodes.VEHICLE_ALREADY_ASSIGNED,
          message: `Vehicle ${vehicle.fleetCode} already has an active assignment`,
          vehicleId: vehicle.id,
        });
      }
    }

    const allocatedByClass =
      await this.repo.countActiveAssignmentsByContractGroupedByClassName(
        dto.leaseContractId,
      );
    const pendingByClass = new Map<string, number>();
    for (const vehicle of vehicles) {
      const className = vehicle.assetClass.name.trim();
      const line = lineByClass.get(className);
      if (!line) {
        throw new BadRequestException({
          code: AssetRegisterAssignmentErrorCodes.NO_MATCHING_ASSET_LINE,
          message: `No lease asset line matches asset class "${className}"`,
          assetClassName: className,
        });
      }
      pendingByClass.set(className, (pendingByClass.get(className) ?? 0) + 1);
    }

    const shortfallDetails: Array<{
      assetClass: string;
      committedQuantity: number;
      allocatedCount: number;
      requestedCount: number;
      remainingCapacity: number;
    }> = [];

    for (const [className, pending] of pendingByClass) {
      const line = lineByClass.get(className)!;
      const allocated = allocatedByClass.get(className) ?? 0;
      const remaining = line.committedQuantity - allocated;
      if (pending > remaining) {
        shortfallDetails.push({
          assetClass: className,
          committedQuantity: line.committedQuantity,
          allocatedCount: allocated,
          requestedCount: pending,
          remainingCapacity: Math.max(0, remaining),
        });
      }
    }

    if (shortfallDetails.length > 0) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.LEASE_CAPACITY_SHORTFALL,
        message:
          'Lease contract has insufficient remaining capacity for one or more asset classes',
        details: shortfallDetails,
      });
    }

    const assignments = await this.repo.bulkAssignVehicles({
      organizationId: dto.organizationId,
      leaseContractId: dto.leaseContractId,
      fleetClientId: contract.clientId ?? null,
      organisationClientId: dto.organisationClientId ?? null,
      vehicleIds: uniqueIds,
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'asset_register_vehicle.assign',
      resourceType: 'asset_register_vehicle_assignment',
      resourceId: dto.leaseContractId,
      status: 'SUCCESS',
      metadata: {
        leaseContractId: dto.leaseContractId,
        vehicleIds: uniqueIds,
        assignmentIds: assignments.map((a) => a.id),
      },
    });

    return {
      leaseContractId: dto.leaseContractId,
      assignedCount: assignments.length,
      assignments: assignments.map((row) => ({
        id: row.id,
        vehicleId: row.vehicleId,
        leaseContractId: row.leaseContractId,
        fleetClientId: row.fleetClientId,
        organisationClientId: row.organisationClientId,
        assignedAt: row.assignedAt.toISOString(),
      })),
    };
  }

  async unassign(userId: string, organizationId: string, vehicleId: string) {
    const vehicle = await this.repo.getVehicleInOrg(organizationId, vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Asset register vehicle not found');
    }
    const closed = await this.repo.unassignVehicle(organizationId, vehicleId);
    if (!closed) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.NO_ACTIVE_ASSIGNMENT,
        message: 'Vehicle has no active lease assignment',
      });
    }

    await this.audit.log({
      organizationId,
      userId,
      action: 'asset_register_vehicle.unassign',
      resourceType: 'asset_register_vehicle_assignment',
      resourceId: closed.id,
      status: 'SUCCESS',
      metadata: {
        vehicleId,
        leaseContractId: closed.leaseContractId,
      },
    });

    return {
      vehicleId,
      assignmentId: closed.id,
      leaseContractId: closed.leaseContractId,
      unassignedAt: closed.unassignedAt?.toISOString() ?? null,
      operationalStatus: 'available',
    };
  }

  private normalizeClientLabel(value: string): string {
    return value.trim().toLowerCase();
  }

  private async assertOrganisationClientForLease(
    organizationId: string,
    leaseFleetClientId: string | null,
    organisationClientId: string | undefined,
  ): Promise<void> {
    if (!leaseFleetClientId) {
      if (!organisationClientId) return;
      const orgClient = await this.repo.getOrganisationClientInOrg(
        organizationId,
        organisationClientId,
      );
      if (!orgClient) {
        throw new BadRequestException('Organisation client not found');
      }
      return;
    }

    if (!organisationClientId) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.ORGANISATION_CLIENT_REQUIRED,
        message:
          'organisationClientId is required when the lease contract has a fleet client',
      });
    }

    const orgClient = await this.repo.getOrganisationClientInOrg(
      organizationId,
      organisationClientId,
    );
    if (!orgClient) {
      throw new BadRequestException('Organisation client not found');
    }

    const fleetBundle = await this.fleetRepo.getClientWithPocs(
      organizationId,
      leaseFleetClientId,
    );
    if (!fleetBundle) {
      throw new BadRequestException('Lease fleet client not found');
    }

    if (
      this.normalizeClientLabel(orgClient.name) !==
      this.normalizeClientLabel(fleetBundle.client.companyName)
    ) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.ORGANISATION_CLIENT_MISMATCH,
        message:
          'Organisation client name must match the lease contract fleet client company name',
      });
    }
  }

  private assertVehiclesAssignable(
    vehicles: AssetRegisterVehicleWithRelations[],
  ) {
    for (const vehicle of vehicles) {
      if (!vehicle.isActive) {
        throw new BadRequestException({
          code: AssetRegisterAssignmentErrorCodes.VEHICLE_NOT_ASSIGNABLE,
          message: `Vehicle ${vehicle.fleetCode} is inactive`,
          vehicleId: vehicle.id,
        });
      }
      if (vehicle.operationalStatus !== 'available') {
        throw new BadRequestException({
          code: AssetRegisterAssignmentErrorCodes.VEHICLE_NOT_ASSIGNABLE,
          message: `Vehicle ${vehicle.fleetCode} must be available (current: ${vehicle.operationalStatus})`,
          vehicleId: vehicle.id,
          operationalStatus: vehicle.operationalStatus,
        });
      }
    }
  }
}
