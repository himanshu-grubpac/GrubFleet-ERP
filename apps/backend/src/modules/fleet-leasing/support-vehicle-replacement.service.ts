import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  REPLACEMENT_CANDIDATE_LIST_DEFAULT_SORT,
  REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS,
} from './constants/fleet-leasing-list-sort.constants';
import { paginateTwoMergedSortedLists } from '../../common/utils/merge-sorted-pagination.util';
import { AuditService } from '../audit/audit.service';
import { DriversService } from '../organisation/drivers.service';
import { SUPPORT_REPLACEMENT_CONTRACT_STATUSES } from './constants/support-replacement-contract-status';
import { SUPPORT_REPLACEMENT_STORE_MISMATCH_MESSAGE } from './constants/support-replacement-vehicle-store';
import type { CreateVehicleReplacementsDto } from './dto/create-vehicle-replacements.dto';
import type { ListReplacementCandidatesQueryDto } from './dto/list-replacement-candidates-query.dto';
import type { LookupOnLeaseVehicleQueryDto } from './dto/lookup-on-lease-vehicle-query.dto';
import type { ReplacementFilterOptionsQueryDto } from './dto/replacement-filter-options-query.dto';
import { AssetRegisterRepository } from '../asset-register/repositories/asset-register.repository';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';

const NOT_FOUND_LOOKUP_MESSAGE =
  'No fleet register vehicle matches that registration, VIN, or fleet code in this organisation';
const NOT_ON_LEASE_LOOKUP_MESSAGE =
  'This vehicle is in the fleet register but is not on an eligible active lease contract. Assign it on Asset Assignment, or pick a client contract below.';

const NOT_FOUND_AVAILABLE_REPLACEMENT_MESSAGE =
  'No available fleet vehicle matches that registration, VIN, or fleet code in this organisation';
const NOT_AVAILABLE_REPLACEMENT_MESSAGE =
  'This vehicle was found but is not available for replacement';
const ON_CONTRACT_REPLACEMENT_MESSAGE =
  'This vehicle is linked to another active lease contract';

@Injectable()
export class SupportVehicleReplacementService {
  constructor(
    private readonly repo: FleetLeasingRepository,
    private readonly assetRegisterRepo: AssetRegisterRepository,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => DriversService))
    private readonly driversService: DriversService,
  ) {}

  async lookupOnLeaseVehicle(query: LookupOnLeaseVehicleQueryDto) {
    const legacyVehicle = await this.repo.findVehicleByRegistrationOrVin(
      query.organizationId,
      query.q,
    );
    if (legacyVehicle) {
      const assignment = await this.repo.findOnLeaseAssignmentForVehicle(
        query.organizationId,
        legacyVehicle.id,
        SUPPORT_REPLACEMENT_CONTRACT_STATUSES,
      );
      if (!assignment) {
        throw new NotFoundException(NOT_ON_LEASE_LOOKUP_MESSAGE);
      }
      const { contract, clientCompanyName } = assignment;
      return {
        vehicle: {
          id: legacyVehicle.id,
          registrationNo: legacyVehicle.registrationNo,
          vin: legacyVehicle.vin,
          assetClass: legacyVehicle.assetClass,
          status: legacyVehicle.status,
          vehicleStore: 'legacy' as const,
        },
        contract: {
          id: contract.id,
          contractNumber: contract.contractNumber,
          status: contract.status,
          startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
          termMonths: contract.termMonths,
        },
        clientName: clientCompanyName ?? 'Not yet selected',
      };
    }

    const registerVehicle =
      await this.assetRegisterRepo.findVehicleByRegistrationVinOrFleetCode(
        query.organizationId,
        query.q,
      );
    if (!registerVehicle) {
      throw new NotFoundException(NOT_FOUND_LOOKUP_MESSAGE);
    }
    const registerAssignment =
      await this.assetRegisterRepo.findOnLeaseAssignmentForRegisterVehicle(
        query.organizationId,
        registerVehicle.id,
        SUPPORT_REPLACEMENT_CONTRACT_STATUSES,
      );
    if (!registerAssignment) {
      throw new NotFoundException(NOT_ON_LEASE_LOOKUP_MESSAGE);
    }
    const { contract, clientCompanyName } = registerAssignment;
    return {
      vehicle: {
        id: registerVehicle.id,
        registrationNo: registerVehicle.registrationNumber,
        vin: registerVehicle.chassisNumber,
        assetClass: registerVehicle.assetClass.name,
        status: registerVehicle.operationalStatus,
        vehicleStore: 'register' as const,
      },
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
        termMonths: contract.termMonths,
      },
      clientName: clientCompanyName ?? 'Not yet selected',
    };
  }

  async listReplacementCandidates(query: ListReplacementCandidatesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const excludeVehicleIds =
      query.excludeVehicleIds
        ?.split(',')
        .map((id) => id.trim())
        .filter(Boolean) ?? [];
    const sort = resolveListSort(
      REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      REPLACEMENT_CANDIDATE_LIST_DEFAULT_SORT,
    );
    const listParams = {
      organizationId: query.organizationId,
      page,
      pageSize,
      assetClass: query.assetClass,
      vehicleType: query.vehicleType,
      brand: query.brand,
      modelName: query.modelName,
      excludeVehicleIds,
      sort,
    };
    const sourceKind = query.sourceKind;
    const includeLegacy = !sourceKind || sourceKind === 'legacy';
    const includeRegister = !sourceKind || sourceKind === 'register';

    type ReplacementCandidateItem = {
      id: string;
      registrationNo: string;
      vin: string;
      assetClass: string;
      status: string;
      vehicleStore: 'legacy' | 'register';
    };
    const mapLegacy = (v: {
      id: string;
      registrationNo: string;
      vin: string;
      assetClass: string;
      status: string;
    }): ReplacementCandidateItem => ({
      id: v.id,
      registrationNo: v.registrationNo,
      vin: v.vin,
      assetClass: v.assetClass,
      status: v.status,
      vehicleStore: 'legacy',
    });
    const mapRegister = (v: {
      id: string;
      registrationNo: string;
      vin: string;
      assetClass: string;
      status: string;
    }): ReplacementCandidateItem => ({
      id: v.id,
      registrationNo: v.registrationNo,
      vin: v.vin,
      assetClass: v.assetClass,
      status: v.status,
      vehicleStore: 'register',
    });

    if (includeLegacy && !includeRegister) {
      const legacy =
        await this.repo.listAvailableReplacementVehicles(listParams);
      const items = legacy.rows.map(mapLegacy);
      return toPaginatedResult(items, page, pageSize, legacy.total);
    }
    if (includeRegister && !includeLegacy) {
      const register =
        await this.assetRegisterRepo.listAvailableRegisterReplacementVehicles(
          listParams,
        );
      const items = register.rows.map(mapRegister);
      return toPaginatedResult(items, page, pageSize, register.total);
    }

    const [legacyMeta, registerMeta] = await Promise.all([
      this.repo.listAvailableReplacementVehicles({
        ...listParams,
        page: 1,
        pageSize: 1,
      }),
      this.assetRegisterRepo.listAvailableRegisterReplacementVehicles({
        ...listParams,
        page: 1,
        pageSize: 1,
      }),
    ]);

    const { items, total } =
      await paginateTwoMergedSortedLists<ReplacementCandidateItem>({
        page,
        pageSize,
        leftTotal: legacyMeta.total,
        rightTotal: registerMeta.total,
        sortKey: (item) => item.registrationNo,
        fetchLeft: async (offset, limit) => {
          const { rows } = await this.repo.listAvailableReplacementVehicles({
            ...listParams,
            page: 1,
            pageSize: 1,
            sliceOffset: offset,
            sliceLimit: limit,
          });
          return rows.map(mapLegacy);
        },
        fetchRight: async (offset, limit) => {
          const { rows } =
            await this.assetRegisterRepo.listAvailableRegisterReplacementVehicles(
              {
                ...listParams,
                page: 1,
                pageSize: 1,
                sliceOffset: offset,
                sliceLimit: limit,
              },
            );
          return rows.map(mapRegister);
        },
      });
    return toPaginatedResult(items, page, pageSize, total);
  }

  async listReplacementFilterOptions(query: ReplacementFilterOptionsQueryDto) {
    if (query.brand?.trim()) {
      const models =
        await this.assetRegisterRepo.listDistinctModelsForAvailableReplacements(
          {
            organizationId: query.organizationId,
            vehicleType: query.vehicleType,
            brand: query.brand.trim(),
          },
        );
      return { models };
    }
    const brands =
      await this.assetRegisterRepo.listDistinctBrandsForAvailableReplacements({
        organizationId: query.organizationId,
        vehicleType: query.vehicleType,
      });
    return { brands };
  }

  async lookupAvailableReplacement(query: LookupOnLeaseVehicleQueryDto) {
    const now = new Date();
    const q = query.q.trim();
    if (!q) {
      throw new NotFoundException(NOT_FOUND_AVAILABLE_REPLACEMENT_MESSAGE);
    }

    const sourceKind = query.sourceKind;

    const tryRegister = async () => {
      const registerVehicle =
        await this.assetRegisterRepo.findVehicleByRegistrationVinOrFleetCode(
          query.organizationId,
          q,
        );
      if (!registerVehicle) {
        return null;
      }
      return this.buildAvailableReplacementFromRegister(
        query.organizationId,
        registerVehicle,
        now,
      );
    };

    const tryLegacy = async () => {
      const legacyVehicle = await this.repo.findVehicleByRegistrationOrVin(
        query.organizationId,
        q,
      );
      if (!legacyVehicle) {
        return null;
      }
      return this.buildAvailableReplacementFromLegacy(
        query.organizationId,
        legacyVehicle,
        now,
      );
    };

    if (sourceKind === 'register') {
      const registerHit = await tryRegister();
      if (registerHit) {
        return registerHit;
      }
      throw new NotFoundException(NOT_FOUND_AVAILABLE_REPLACEMENT_MESSAGE);
    }

    if (sourceKind === 'legacy') {
      const legacyHit = await tryLegacy();
      if (legacyHit) {
        return legacyHit;
      }
      throw new NotFoundException(NOT_FOUND_AVAILABLE_REPLACEMENT_MESSAGE);
    }

    const registerHit = await tryRegister();
    if (registerHit) {
      return registerHit;
    }
    const legacyHit = await tryLegacy();
    if (legacyHit) {
      return legacyHit;
    }

    throw new NotFoundException(NOT_FOUND_AVAILABLE_REPLACEMENT_MESSAGE);
  }

  private async buildAvailableReplacementFromRegister(
    organizationId: string,
    registerVehicle: NonNullable<
      Awaited<
        ReturnType<
          AssetRegisterRepository['findVehicleByRegistrationVinOrFleetCode']
        >
      >
    >,
    now: Date,
  ) {
    if (!registerVehicle.isActive) {
      throw new NotFoundException(NOT_AVAILABLE_REPLACEMENT_MESSAGE);
    }
    if (registerVehicle.operationalStatus !== 'available') {
      throw new NotFoundException(NOT_AVAILABLE_REPLACEMENT_MESSAGE);
    }
    const regEnd = new Date(registerVehicle.registrationEndDate);
    const insEnd = new Date(registerVehicle.insuranceEndDate);
    if (regEnd < now || insEnd < now) {
      throw new NotFoundException(NOT_AVAILABLE_REPLACEMENT_MESSAGE);
    }
    const other =
      await this.assetRegisterRepo.findOtherActiveAssignmentForRegisterVehicle(
        organizationId,
        registerVehicle.id,
        '00000000-0000-0000-0000-000000000000',
      );
    if (other) {
      throw new NotFoundException(ON_CONTRACT_REPLACEMENT_MESSAGE);
    }
    return {
      vehicle: {
        id: registerVehicle.id,
        registrationNo: registerVehicle.registrationNumber,
        vin: registerVehicle.chassisNumber,
        assetClass: registerVehicle.assetClass.name,
        brand: registerVehicle.assetClass.brand,
        modelName: registerVehicle.assetClass.modelName,
        vehicleType: registerVehicle.assetClass.vehicleType,
        status: registerVehicle.operationalStatus,
        vehicleStore: 'register' as const,
      },
    };
  }

  private async buildAvailableReplacementFromLegacy(
    organizationId: string,
    legacyVehicle: NonNullable<
      Awaited<
        ReturnType<FleetLeasingRepository['findVehicleByRegistrationOrVin']>
      >
    >,
    now: Date,
  ) {
    if (legacyVehicle.status !== 'available') {
      throw new NotFoundException(NOT_AVAILABLE_REPLACEMENT_MESSAGE);
    }
    if (
      legacyVehicle.registrationExpiry < now ||
      legacyVehicle.insuranceExpiry < now
    ) {
      throw new NotFoundException(NOT_AVAILABLE_REPLACEMENT_MESSAGE);
    }
    const other = await this.repo.findOtherContractForVehicle(
      organizationId,
      legacyVehicle.id,
      '00000000-0000-0000-0000-000000000000',
    );
    if (other) {
      throw new NotFoundException(ON_CONTRACT_REPLACEMENT_MESSAGE);
    }
    return {
      vehicle: {
        id: legacyVehicle.id,
        registrationNo: legacyVehicle.registrationNo,
        vin: legacyVehicle.vin,
        assetClass: legacyVehicle.assetClass,
        brand: null as string | null,
        modelName: null as string | null,
        vehicleType: null as string | null,
        status: legacyVehicle.status,
        vehicleStore: 'legacy' as const,
      },
    };
  }

  async listAllocatedVehicles(
    organizationId: string,
    contractId: string,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    const contract = await this.repo.findContractInOrg(
      organizationId,
      contractId,
    );
    if (!contract) {
      throw new NotFoundException('Lease contract not found');
    }
    if (!SUPPORT_REPLACEMENT_CONTRACT_STATUSES.includes(contract.status)) {
      throw new BadRequestException(
        'Contract is not eligible for vehicle replacement',
      );
    }
    const [legacyTotal, registerTotal] = await Promise.all([
      this.repo.countAllocatedVehiclesOnContract(organizationId, contractId),
      this.assetRegisterRepo.countAllocatedRegisterVehiclesOnContract(
        organizationId,
        contractId,
      ),
    ]);

    type AllocRow = {
      id: string;
      registrationNo: string;
      vin: string;
      assetClass: string;
      status: string;
      vehicleStore: 'legacy' | 'register';
    };

    const { items, total } = await paginateTwoMergedSortedLists<AllocRow>({
      page,
      pageSize,
      leftTotal: legacyTotal,
      rightTotal: registerTotal,
      sortKey: (item) => item.registrationNo,
      fetchLeft: async (offset, limit) => {
        const rows = await this.repo.listAllocatedVehiclesOnContractSlice(
          organizationId,
          contractId,
          offset,
          limit,
        );
        return rows.map((v) => ({ ...v, vehicleStore: 'legacy' as const }));
      },
      fetchRight: async (offset, limit) => {
        const rows =
          await this.assetRegisterRepo.listAllocatedRegisterVehiclesOnContractSlice(
            organizationId,
            contractId,
            offset,
            limit,
          );
        return rows.map((v) => ({ ...v, vehicleStore: 'register' as const }));
      },
    });
    return toPaginatedResult(items, page, pageSize, total);
  }

  async listActiveContractsForClient(
    organizationId: string,
    fleetClientId: string,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    const client = await this.repo.getClientInOrg(
      organizationId,
      fleetClientId,
    );
    if (!client) {
      throw new NotFoundException('Fleet client not found');
    }
    const { rows, total } = await this.repo.listContractsForFleetClient(
      organizationId,
      fleetClientId,
      SUPPORT_REPLACEMENT_CONTRACT_STATUSES,
      { page, pageSize },
    );
    const items = rows.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      status: c.status,
      startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
    }));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async executeReplacements(userId: string, dto: CreateVehicleReplacementsDto) {
    const now = new Date();
    const toVehicleIds = dto.replacements.map((p) => p.toVehicleId);
    if (new Set(toVehicleIds).size !== toVehicleIds.length) {
      throw new BadRequestException(
        'Each replacement vehicle can only be assigned once in the same request',
      );
    }
    const validatedPairs: {
      kind: 'legacy' | 'register';
      contractId: string;
      fromVehicleId: string;
      toVehicleId: string;
      fromRegistrationNo: string;
      toRegistrationNo: string;
      contractNumber: string;
      fleetClientId: string | null;
      organisationClientId: string | null;
    }[] = [];

    for (const pair of dto.replacements) {
      if (pair.fromVehicleId === pair.toVehicleId) {
        throw new BadRequestException(
          'Replacement vehicle must differ from the unit being replaced',
        );
      }
      const contract = await this.repo.findContractInOrg(
        dto.organizationId,
        pair.contractId,
      );
      if (!contract) {
        throw new NotFoundException('Lease contract not found');
      }
      if (!SUPPORT_REPLACEMENT_CONTRACT_STATUSES.includes(contract.status)) {
        throw new BadRequestException(
          `Contract ${contract.contractNumber} is not eligible for vehicle replacement`,
        );
      }

      const fromLegacy = await this.repo.getVehicleInOrg(
        dto.organizationId,
        pair.fromVehicleId,
      );
      const fromRegister = fromLegacy
        ? null
        : await this.assetRegisterRepo.getVehicleWithRelationsInOrg(
            dto.organizationId,
            pair.fromVehicleId,
          );
      if (!fromLegacy && !fromRegister) {
        throw new BadRequestException('Vehicle not found in this organisation');
      }

      const toLegacy = await this.repo.getVehicleInOrg(
        dto.organizationId,
        pair.toVehicleId,
      );
      const toRegister = toLegacy
        ? null
        : await this.assetRegisterRepo.getVehicleWithRelationsInOrg(
            dto.organizationId,
            pair.toVehicleId,
          );
      if (!toLegacy && !toRegister) {
        throw new BadRequestException('Vehicle not found in this organisation');
      }
      if (Boolean(fromLegacy) !== Boolean(toLegacy)) {
        throw new BadRequestException(
          SUPPORT_REPLACEMENT_STORE_MISMATCH_MESSAGE,
        );
      }

      if (fromLegacy && toLegacy) {
        const linked = await this.repo.listContractVehicleIds(pair.contractId);
        if (!linked.includes(pair.fromVehicleId)) {
          throw new BadRequestException(
            'Vehicle is not allocated to the specified contract',
          );
        }
        if (toLegacy.status !== 'available') {
          throw new BadRequestException(
            `Vehicle ${toLegacy.registrationNo} is not available`,
          );
        }
        if (
          toLegacy.registrationExpiry < now ||
          toLegacy.insuranceExpiry < now
        ) {
          throw new BadRequestException(
            `Vehicle ${toLegacy.registrationNo} has expired compliance`,
          );
        }
        const other = await this.repo.findOtherContractForVehicle(
          dto.organizationId,
          pair.toVehicleId,
          pair.contractId,
        );
        if (other) {
          throw new BadRequestException(
            `Vehicle ${toLegacy.registrationNo} is linked to another active contract`,
          );
        }
        validatedPairs.push({
          kind: 'legacy',
          contractId: pair.contractId,
          fromVehicleId: pair.fromVehicleId,
          toVehicleId: pair.toVehicleId,
          fromRegistrationNo: fromLegacy.registrationNo,
          toRegistrationNo: toLegacy.registrationNo,
          contractNumber: contract.contractNumber,
          fleetClientId: contract.clientId,
          organisationClientId: null,
        });
        continue;
      }

      const fromAssignment =
        await this.assetRegisterRepo.findActiveAssignmentForVehicle(
          dto.organizationId,
          pair.fromVehicleId,
        );
      if (
        !fromAssignment ||
        fromAssignment.leaseContractId !== pair.contractId
      ) {
        throw new BadRequestException(
          'Vehicle is not allocated to the specified contract',
        );
      }
      if (toRegister!.operationalStatus !== 'available') {
        throw new BadRequestException(
          `Vehicle ${toRegister!.registrationNumber} is not available`,
        );
      }
      const regEnd = new Date(toRegister!.registrationEndDate);
      const insEnd = new Date(toRegister!.insuranceEndDate);
      if (regEnd < now || insEnd < now) {
        throw new BadRequestException(
          `Vehicle ${toRegister!.registrationNumber} has expired compliance`,
        );
      }
      const otherRegister =
        await this.assetRegisterRepo.findOtherActiveAssignmentForRegisterVehicle(
          dto.organizationId,
          pair.toVehicleId,
          pair.contractId,
        );
      if (otherRegister) {
        throw new BadRequestException(
          `Vehicle ${toRegister!.registrationNumber} is linked to another active contract`,
        );
      }
      validatedPairs.push({
        kind: 'register',
        contractId: pair.contractId,
        fromVehicleId: pair.fromVehicleId,
        toVehicleId: pair.toVehicleId,
        fromRegistrationNo: fromRegister!.registrationNumber,
        toRegistrationNo: toRegister!.registrationNumber,
        contractNumber: contract.contractNumber,
        fleetClientId: fromAssignment.fleetClientId ?? contract.clientId,
        organisationClientId: fromAssignment.organisationClientId,
      });
    }

    for (const pair of validatedPairs) {
      await this.driversService.clearAssignmentForVehicleCode(
        dto.organizationId,
        pair.fromRegistrationNo,
        'fleet_vehicle_removed',
      );
    }

    const legacyPairs = validatedPairs.filter((p) => p.kind === 'legacy');
    if (legacyPairs.length > 0) {
      await this.repo.executeVehicleReplacementSwapsInTransaction(
        legacyPairs.map((p) => ({
          contractId: p.contractId,
          fromVehicleId: p.fromVehicleId,
          toVehicleId: p.toVehicleId,
        })),
      );
    }
    for (const pair of validatedPairs.filter((p) => p.kind === 'register')) {
      await this.assetRegisterRepo.executeRegisterVehicleReplacementOnContract({
        organizationId: dto.organizationId,
        contractId: pair.contractId,
        fromVehicleId: pair.fromVehicleId,
        toVehicleId: pair.toVehicleId,
        fleetClientId: pair.fleetClientId,
        organisationClientId: pair.organisationClientId,
      });
    }

    for (const pair of validatedPairs) {
      await this.repo.insertEvent({
        contractId: pair.contractId,
        organizationId: dto.organizationId,
        eventType: 'vehicle.replaced',
        message: `Vehicle ${pair.fromRegistrationNo} replaced with ${pair.toRegistrationNo}`,
        actorUserId: userId,
        metadata: {
          fromVehicleId: pair.fromVehicleId,
          toVehicleId: pair.toVehicleId,
        },
      });
    }

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'fleet_leasing.vehicle_replacement',
      resourceType: 'lease_contract',
      resourceId: validatedPairs[0]?.contractId ?? dto.organizationId,
      status: 'SUCCESS',
      metadata: {
        count: validatedPairs.length,
        pairs: validatedPairs.map((p) => ({
          contractId: p.contractId,
          fromVehicleId: p.fromVehicleId,
          toVehicleId: p.toVehicleId,
        })),
      },
    });

    return {
      replacedCount: validatedPairs.length,
      items: validatedPairs.map((p) => ({
        contractId: p.contractId,
        contractNumber: p.contractNumber,
        fromRegistrationNo: p.fromRegistrationNo,
        toRegistrationNo: p.toRegistrationNo,
      })),
    };
  }
}
