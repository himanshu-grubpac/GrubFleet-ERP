import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FleetLeasingRepository } from '../fleet-leasing/repositories/fleet-leasing.repository';
import { AuditService } from '../audit/audit.service';
import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { AssetRegisterAssignmentErrorCodes } from './constants/asset-register-assignment.constants';
import type { BulkAssignAssetRegisterVehiclesDto } from './dto/bulk-assign-asset-register-vehicles.dto';
import type { ListAssignableLeaseContractsForVehicleQueryDto } from './dto/list-assignable-lease-contracts-for-vehicle-query.dto';
import type { BulkAssignCatalogQueryDto } from './dto/bulk-assign-catalog-query.dto';
import type { BulkAssignValidateDto } from './dto/bulk-assign-validate.dto';
import {
  AssetRegisterRepository,
  type AssetRegisterVehicleWithRelations,
} from './repositories/asset-register.repository';
import {
  buildBulkAssignVehicleValidationRow,
  type BulkAssignVehicleValidationRow,
} from './utils/bulk-assign-validate.util';
import { OrganizationDomainEventsService } from '../../infrastructure/organization-realtime/organization-domain-events.service';
import { OrganizationDomainEventType } from '../../infrastructure/organization-realtime/organization-domain-event.types';

@Injectable()
export class AssetRegisterAssignmentsService {
  constructor(
    private readonly repo: AssetRegisterRepository,
    private readonly fleetRepo: FleetLeasingRepository,
    private readonly audit: AuditService,
    private readonly domainEvents: OrganizationDomainEventsService,
  ) {}

  async getBulkAssignCatalog(query: BulkAssignCatalogQueryDto) {
    const contractHeaders =
      await this.fleetRepo.listActiveLeaseContractsForBulkAssignCatalog({
        organizationId: query.organizationId,
        organisationClientId: query.organisationClientId,
        limit: 50,
      });
    const contractIds = contractHeaders.map((row) => row.contractId);
    const [lines, allocatedByContractClass] = await Promise.all([
      this.fleetRepo.listAssetLinesForContractIds(contractIds),
      contractIds.length > 0
        ? this.fleetRepo.countRegisterAssignmentsByContractsGroupedByClassName(
            contractIds,
          )
        : Promise.resolve(new Map<string, number>()),
    ]);

    const assetClassIds = [
      ...new Set(
        lines
          .map((line) => line.assetClassId)
          .filter((id): id is string => !!id),
      ),
    ];
    const availableByClassId = await this.repo.countAvailableVehiclesByClassIds(
      query.organizationId,
      assetClassIds,
    );

    type LineRow = {
      lineId: string;
      assetClassId: string | null;
      assetClassName: string;
      committedQuantity: number;
      allocatedCount: number;
      remainingToAssign: number;
      availableNow: number;
      lineStatus: 'enough' | 'short' | 'fully_assigned';
      shortBy: number;
      selectable: boolean;
    };

    const buildLineRow = (
      contractId: string,
      line: (typeof lines)[number],
    ): LineRow => {
      const className = line.assetClass.trim();
      const allocKey = `${contractId}::${className}`;
      const allocatedCount = allocatedByContractClass.get(allocKey) ?? 0;
      const remainingToAssign = Math.max(
        0,
        line.committedQuantity - allocatedCount,
      );
      const availableNow = line.assetClassId
        ? (availableByClassId.get(line.assetClassId) ?? 0)
        : 0;
      let lineStatus: LineRow['lineStatus'] = 'fully_assigned';
      let shortBy = 0;
      if (remainingToAssign > 0) {
        if (availableNow >= remainingToAssign) {
          lineStatus = 'enough';
        } else {
          lineStatus = 'short';
          shortBy = remainingToAssign - availableNow;
        }
      }
      return {
        lineId: line.id,
        assetClassId: line.assetClassId,
        assetClassName: className,
        committedQuantity: line.committedQuantity,
        allocatedCount,
        remainingToAssign,
        availableNow,
        lineStatus,
        shortBy,
        selectable: remainingToAssign > 0,
      };
    };

    const clientAgg = new Map<
      string,
      {
        organisationClientId: string;
        clientName: string;
        activeContractCount: number;
        openAssetClassLineCount: number;
        contractIds: Set<string>;
      }
    >();

    for (const header of contractHeaders) {
      const orgClientId = header.organisationClientId;
      if (!orgClientId) continue;
      const clientName = header.clientName?.trim() || '—';
      let agg = clientAgg.get(orgClientId);
      if (!agg) {
        agg = {
          organisationClientId: orgClientId,
          clientName,
          activeContractCount: 0,
          openAssetClassLineCount: 0,
          contractIds: new Set(),
        };
        clientAgg.set(orgClientId, agg);
      }
      agg.contractIds.add(header.contractId);
    }

    for (const line of lines) {
      const header = contractHeaders.find(
        (h) => h.contractId === line.contractId,
      );
      const orgClientId = header?.organisationClientId;
      if (!orgClientId) continue;
      const agg = clientAgg.get(orgClientId);
      if (!agg) continue;
      const built = buildLineRow(line.contractId, line);
      if (built.remainingToAssign > 0) {
        agg.openAssetClassLineCount += 1;
      }
    }

    for (const agg of clientAgg.values()) {
      agg.activeContractCount = agg.contractIds.size;
    }

    const clients = [...clientAgg.values()]
      .filter((row) => row.openAssetClassLineCount > 0)
      .map((row) => {
        const { contractIds: _contractIds, ...rest } = row;
        void _contractIds;
        return rest;
      })
      .sort((a, b) => a.clientName.localeCompare(b.clientName));

    if (!query.organisationClientId) {
      return { clients };
    }

    const contracts = contractHeaders.map((header) => {
      const contractLines = lines
        .filter((line) => line.contractId === header.contractId)
        .map((line) => buildLineRow(header.contractId, line));
      const unitsStillToAssign = contractLines.reduce(
        (sum, line) => sum + line.remainingToAssign,
        0,
      );
      return {
        leaseContractId: header.contractId,
        contractNumber: header.contractNumber,
        clientName: header.clientName ?? '—',
        status: header.status,
        startDate: header.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: header.endDate?.toISOString().slice(0, 10) ?? null,
        location: header.location,
        organisationClientId: header.organisationClientId,
        fleetClientId: header.fleetClientId,
        lineCount: contractLines.length,
        unitsStillToAssign,
        assetLines: contractLines,
      };
    });

    const selectedClient = clients.find(
      (c) => c.organisationClientId === query.organisationClientId,
    );

    return {
      clients,
      selectedClient: selectedClient ?? null,
      contracts,
    };
  }

  async listAssignableLeaseContractsForVehicle(
    query: ListAssignableLeaseContractsForVehicleQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const vehicle = await this.repo.getVehicleWithRelationsInOrg(
      query.organizationId,
      query.vehicleId,
    );
    if (!vehicle) {
      throw new NotFoundException('Asset register vehicle not found');
    }

    const assetClassId = vehicle.assetClassId;
    const [hiddenOtherActiveCount, contractPage] = await Promise.all([
      this.fleetRepo.countActiveContractsWithoutAssetClassLine(
        query.organizationId,
        assetClassId,
      ),
      this.fleetRepo.listLeaseContractsForVehicleAssignment({
        organizationId: query.organizationId,
        assetClassId,
        page,
        pageSize,
        search: query.search,
        organisationClientId: query.organisationClientId,
      }),
    ]);

    const contractIds = contractPage.rows.map((row) => row.contractId);
    const allocatedByContractClass =
      contractIds.length > 0
        ? await this.fleetRepo.countRegisterAssignmentsByContractsGroupedByClassName(
            contractIds,
          )
        : new Map<string, number>();

    const items = contractPage.rows.map((row) => {
      const allocKey = `${row.contractId}::${row.assetClassName.trim()}`;
      const allocatedCount = allocatedByContractClass.get(allocKey) ?? 0;
      const remainingToAssign = Math.max(
        0,
        row.committedQuantity - allocatedCount,
      );
      const assignable = row.status === 'active' && remainingToAssign > 0;
      return {
        leaseContractId: row.contractId,
        contractNumber: row.contractNumber,
        clientName: row.clientName ?? '—',
        status: row.status,
        startDate: row.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
        location: null as string | null,
        organisationClientId: row.organisationClientId,
        fleetClientId: row.fleetClientId,
        assetClassName: row.assetClassName,
        committedQuantity: row.committedQuantity,
        allocatedCount,
        remainingToAssign,
        assignable,
      };
    });

    const hasMatchingContractLine = contractPage.total > 0;
    const hasOpenDemand = items.some(
      (item) => item.assignable && item.remainingToAssign > 0,
    );

    return {
      vehicleId: vehicle.id,
      assetClassId,
      assetClassName: vehicle.assetClass.name,
      hiddenOtherActiveCount,
      hasMatchingContractLine,
      hasOpenDemand,
      ...toPaginatedResult(items, page, pageSize, contractPage.total),
    };
  }

  async validateBulkAssign(dto: BulkAssignValidateDto) {
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

    const assetLines = await this.fleetRepo.listAssetLines(dto.leaseContractId);
    const allowedClassNames = new Set(
      assetLines.map((line) => line.assetClass.trim()),
    );

    const vehicles = await this.repo.getVehiclesWithRelationsByIds(
      dto.organizationId,
      uniqueIds,
    );
    if (vehicles.length !== uniqueIds.length) {
      throw new BadRequestException('One or more vehicles were not found');
    }

    const validation = await this.buildBulkAssignVehicleValidation(
      dto.organizationId,
      vehicles,
      allowedClassNames,
    );

    const assetClassId = dto.assetClassId ?? vehicles[0]?.assetClassId ?? null;
    let replacementAvailableCount = 0;
    if (assetClassId) {
      replacementAvailableCount =
        await this.repo.countAvailableVehiclesForClassExcludingIds(
          dto.organizationId,
          assetClassId,
          uniqueIds,
        );
    }

    const conflictCount = validation.filter((row) => !row.available).length;

    return {
      leaseContractId: dto.leaseContractId,
      vehicles: validation,
      conflictCount,
      replacementAvailableCount,
      allAvailable: conflictCount === 0,
    };
  }

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

    const resolvedOrganisationClientId =
      await this.resolveOrganisationClientIdForAssign(
        dto.organizationId,
        contract.clientId ?? null,
        dto.organisationClientId,
      );

    const assetLines = await this.fleetRepo.listAssetLines(dto.leaseContractId);
    const lineByClass = new Map(
      assetLines.map((line) => [line.assetClass.trim(), line]),
    );
    const allowedClassNames = new Set(lineByClass.keys());

    const vehicles = await this.repo.getVehiclesWithRelationsByIds(
      dto.organizationId,
      uniqueIds,
    );
    if (vehicles.length !== uniqueIds.length) {
      throw new BadRequestException('One or more vehicles were not found');
    }

    const validation = await this.buildBulkAssignVehicleValidation(
      dto.organizationId,
      vehicles,
      allowedClassNames,
    );
    const conflicts = validation.filter((row) => !row.available);
    if (conflicts.length > 0) {
      const primaryClassId = vehicles[0]?.assetClassId;
      const replacementAvailableCount = primaryClassId
        ? await this.repo.countAvailableVehiclesForClassExcludingIds(
            dto.organizationId,
            primaryClassId,
            uniqueIds,
          )
        : 0;
      throw new ConflictException({
        code: AssetRegisterAssignmentErrorCodes.BULK_ASSIGN_VEHICLE_CONFLICT,
        message: `${conflicts.length} vehicle(s) are no longer available for assignment`,
        details: {
          vehicles: validation,
          conflictCount: conflicts.length,
          replacementAvailableCount,
        },
      });
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
      organisationClientId: resolvedOrganisationClientId,
      vehicleIds: uniqueIds,
      assignedAt: this.resolveHandoverAssignedAt(dto.handoverDate),
      odometerAtHandover: dto.odometerAtHandover,
      handoverLocation: dto.handoverLocation,
      notes: dto.notes,
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

    await this.domainEvents.emit({
      type: OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED,
      organizationId: dto.organizationId,
      resource: 'asset_register_vehicle_assignment',
      ids: {
        leaseContractId: dto.leaseContractId,
        vehicleIds: uniqueIds,
      },
    });

    const allocatedAfter =
      await this.repo.countActiveAssignmentsByContractGroupedByClassName(
        dto.leaseContractId,
      );

    const primaryClassName = vehicles[0]?.assetClass.name.trim() ?? '';
    const primaryLine = primaryClassName
      ? lineByClass.get(primaryClassName)
      : undefined;
    const allocatedOnPrimaryLine = primaryLine
      ? (allocatedAfter.get(primaryClassName) ?? 0)
      : 0;
    const lineCommitted = primaryLine?.committedQuantity ?? 0;
    const remainingToAssignOnLine = primaryLine
      ? Math.max(0, primaryLine.committedQuantity - allocatedOnPrimaryLine)
      : 0;
    const fullyAssignedLine =
      lineCommitted > 0 && allocatedOnPrimaryLine >= lineCommitted;

    const primaryClassId = vehicles[0]?.assetClassId;
    const remainingInPoolForClass = primaryClassId
      ? await this.repo.countAvailableVehiclesForClassExcludingIds(
          dto.organizationId,
          primaryClassId,
          uniqueIds,
        )
      : 0;

    let clientName = '';
    if (contract.clientId) {
      const clientJoined = await this.fleetRepo.getClientInOrgWithDisplayName(
        dto.organizationId,
        contract.clientId,
      );
      clientName =
        clientJoined?.organisationClientName?.trim() ||
        clientJoined?.client.companyName?.trim() ||
        '';
    }

    const handoverDate =
      dto.handoverDate?.trim() || new Date().toISOString().slice(0, 10);

    return {
      leaseContractId: dto.leaseContractId,
      contractId: dto.leaseContractId,
      contractNumber: contract.contractNumber,
      clientName,
      assetClassName: primaryClassName,
      handoverDate,
      lineCommitted,
      lineAllocatedAfter: allocatedOnPrimaryLine,
      remainingToAssignOnLine,
      remainingInPoolForClass,
      fullyAssignedLine,
      fleetCode: vehicles.length === 1 ? vehicles[0].fleetCode : null,
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

    await this.domainEvents.emit({
      type: OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED,
      organizationId,
      resource: 'asset_register_vehicle_assignment',
      ids: {
        leaseContractId: closed.leaseContractId ?? undefined,
        vehicleIds: [vehicleId],
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

  private resolveHandoverAssignedAt(handoverDate?: string): Date | undefined {
    if (!handoverDate?.trim()) {
      return undefined;
    }
    return new Date(`${handoverDate.trim()}T12:00:00.000Z`);
  }

  private normalizeClientLabel(value: string): string {
    return value.trim().toLowerCase();
  }

  /**
   * Resolves organisation client for assignment from lease fleet client link.
   * Accepts fleet client id in organisationClientId (portal lease detail uses fleet id as client.id).
   */
  private async resolveOrganisationClientIdForAssign(
    organizationId: string,
    leaseFleetClientId: string | null,
    organisationClientIdInput: string | undefined,
  ): Promise<string | null> {
    if (!leaseFleetClientId) {
      if (!organisationClientIdInput) {
        return null;
      }
      const orgClient = await this.repo.getOrganisationClientInOrg(
        organizationId,
        organisationClientIdInput,
      );
      if (!orgClient) {
        throw new BadRequestException({
          code: AssetRegisterAssignmentErrorCodes.ORGANISATION_CLIENT_NOT_FOUND,
          message: 'Organisation client not found',
        });
      }
      return organisationClientIdInput;
    }

    const fleetBundle = await this.fleetRepo.getClientWithPocs(
      organizationId,
      leaseFleetClientId,
    );
    if (!fleetBundle) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.LEASE_FLEET_CLIENT_NOT_FOUND,
        message: 'Lease fleet client not found',
      });
    }

    const linkedOrganisationClientId =
      fleetBundle.client.organisationClientId ?? null;

    let effectiveOrganisationClientId: string | null = null;

    if (!organisationClientIdInput) {
      effectiveOrganisationClientId = linkedOrganisationClientId;
    } else if (organisationClientIdInput === leaseFleetClientId) {
      effectiveOrganisationClientId = linkedOrganisationClientId;
    } else if (
      linkedOrganisationClientId &&
      organisationClientIdInput === linkedOrganisationClientId
    ) {
      effectiveOrganisationClientId = linkedOrganisationClientId;
    } else {
      const orgClient = await this.repo.getOrganisationClientInOrg(
        organizationId,
        organisationClientIdInput,
      );
      if (!orgClient) {
        throw new BadRequestException({
          code: AssetRegisterAssignmentErrorCodes.ORGANISATION_CLIENT_NOT_FOUND,
          message: 'Organisation client not found',
        });
      }
      effectiveOrganisationClientId = organisationClientIdInput;
    }

    if (!effectiveOrganisationClientId) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.FLEET_CLIENT_ORGANISATION_LINK_MISSING,
        message:
          'Lease fleet client is not linked to an organisation client; link the client in Organisation or Fleet before assigning vehicles',
      });
    }

    const orgClient = await this.repo.getOrganisationClientInOrg(
      organizationId,
      effectiveOrganisationClientId,
    );
    if (!orgClient) {
      throw new BadRequestException({
        code: AssetRegisterAssignmentErrorCodes.ORGANISATION_CLIENT_NOT_FOUND,
        message: 'Organisation client not found',
      });
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

    return effectiveOrganisationClientId;
  }

  private async buildBulkAssignVehicleValidation(
    organizationId: string,
    vehicles: AssetRegisterVehicleWithRelations[],
    allowedClassNames: Set<string>,
  ): Promise<BulkAssignVehicleValidationRow[]> {
    const activeByVehicleId = await this.repo.findActiveAssignmentsForVehicles(
      organizationId,
      vehicles.map((v) => v.id),
    );
    const assignmentContractIds = [
      ...new Set(
        [...activeByVehicleId.values()].map((row) => row.leaseContractId),
      ),
    ];
    const contractSummaries =
      assignmentContractIds.length > 0
        ? await this.fleetRepo.getContractSummariesByIds(
            organizationId,
            assignmentContractIds,
          )
        : [];
    const labelByContractId = new Map(
      contractSummaries.map((row) => [
        row.id,
        row.lesseeName?.trim() || row.contractNumber?.trim() || '—',
      ]),
    );

    return vehicles.map((vehicle) => {
      const assignment = activeByVehicleId.get(vehicle.id);
      const className = vehicle.assetClass.name.trim();
      return buildBulkAssignVehicleValidationRow({
        vehicle,
        hasActiveAssignment: !!assignment,
        assignmentConflictLabel: assignment
          ? (labelByContractId.get(assignment.leaseContractId) ?? '—')
          : null,
        assetClassAllowed: allowedClassNames.has(className),
      });
    });
  }
}
