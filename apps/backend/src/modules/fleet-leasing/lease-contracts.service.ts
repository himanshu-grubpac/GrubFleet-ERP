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
import { AMC_TIER_STUB_VALUES } from './constants/amc-tier-stub';
import { normalizeEditClassification } from './constants/contract-edit-classification';
import {
  LIST_STATUS_FILTER,
  RENEWABLE_CONTRACT_STATUSES,
  type LeaseContractStatus,
} from './constants/lease-contract-status';
import {
  computeContractFieldDiff,
  contractRowToSnapshot,
} from './utils/contract-field-diff.util';
import { computeAssetLineAvailability } from './utils/asset-class-availability.util';
import {
  buildContractReviewMessages,
  computeCanSubmitReview,
  resolveReviewAction,
} from './utils/contract-review.util';
import {
  evaluateContractPricing,
  type ContractPricingEvaluation,
} from './utils/contract-pricing-engine.util';
import {
  buildContractConfirmationInfoMessages,
  buildContractLineAllocationRow,
} from './utils/contract-line-allocation.util';
import type { UpdateContractTermsDto } from './dto/update-contract-terms.dto';
import type { UpdateContractAssetLinesDto } from './dto/update-contract-asset-lines.dto';
import type { CreateLeaseContractDto } from './dto/create-lease-contract.dto';
import type { ListLeaseContractsQueryDto } from './dto/list-lease-contracts-query.dto';
import type { UpdateLeaseContractDto } from './dto/update-lease-contract.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import {
  buildAvailableActions,
  buildDetailSubtitle,
  buildStatusBanner,
  buildStatusTags,
  findLatestEventByType,
  mapAllLogs,
  mapLifecycleLogs,
} from './utils/contract-detail.presentation.util';
import { getContractEditBlockReason } from './utils/contract-edit.util';

@Injectable()
export class LeaseContractsService {
  constructor(
    private readonly repo: FleetLeasingRepository,
    private readonly audit: AuditService,
  ) {}

  async getSummary(organizationId: string) {
    const [activeContracts, awaitingAssets, pendingApproval, draft] =
      await Promise.all([
        this.repo.countContractsByStatuses(organizationId, ['active']),
        this.repo.countContractsByStatuses(organizationId, ['awaiting_assets']),
        this.repo.countContractsByStatuses(organizationId, ['pending_approval']),
        this.repo.countContractsByStatuses(organizationId, ['draft']),
      ]);
    return { activeContracts, awaitingAssets, pendingApproval, draft };
  }

  async list(query: ListLeaseContractsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const filterKey = query.statusFilter ?? 'all';
    const statusFilter = LIST_STATUS_FILTER[filterKey];
    const { rows, total } = await this.repo.listContracts({
      organizationId: query.organizationId,
      page,
      pageSize,
      statusFilter,
      search: query.search,
    });
    const items = await Promise.all(
      rows.map(async (r) =>
        this.toListItem(r.contract, r.clientCompanyName ?? null),
      ),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, contractId: string) {
    const contract = await this.repo.findContractInOrg(organizationId, contractId);
    if (!contract) throw new NotFoundException('Lease contract not found');
    return this.toDetail(organizationId, contract);
  }

  /** Post-wizard success screen — allocation table + info blocks (Figma confirmation). */
  async getConfirmation(organizationId: string, contractId: string) {
    const contract = await this.repo.findContractInOrg(organizationId, contractId);
    if (!contract) throw new NotFoundException('Lease contract not found');
    const eligible: LeaseContractStatus[] = [
      'active',
      'awaiting_assets',
      'approved',
    ];
    if (!eligible.includes(contract.status as LeaseContractStatus)) {
      throw new BadRequestException(
        'Confirmation summary is available after confirm or activate (active, awaiting assets, or approved)',
      );
    }
    return this.buildConfirmationSummary(organizationId, contract);
  }

  async create(userId: string, dto: CreateLeaseContractDto) {
    this.validateAmcTierOptional(dto.amcTier);
    const contractNumber = await this.repo.nextContractNumber(dto.organizationId);
    const row = await this.repo.insertContract({
      organizationId: dto.organizationId,
      contractNumber,
      clientId: dto.clientId ?? null,
      status: 'draft',
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      termMonths: dto.termMonths ?? null,
      securityDeposit: dto.securityDeposit ?? null,
      billingFrequency: dto.billingFrequency ?? 'monthly',
      additionalTerms: dto.additionalTerms ?? null,
      amcTier: dto.amcTier ?? null,
      description: dto.description ?? null,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
    if (dto.assetLines?.length) {
      await this.applyAssetLines(dto.organizationId, row.id, dto.assetLines, {
        confirmShortfall: false,
      });
    }
    if (dto.vehicleIds?.length) {
      await this.applyVehicles(dto.organizationId, row.id, dto.vehicleIds);
    }
    await this.logEvent(
      row.id,
      dto.organizationId,
      userId,
      'contract.created',
      `Draft contract ${row.contractNumber} created`,
    );
    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'lease_contract.create',
      resourceType: 'lease_contract',
      resourceId: row.id,
      status: 'SUCCESS',
    });
    return this.getById(dto.organizationId, row.id);
  }

  async updateAssetLines(
    userId: string,
    organizationId: string,
    contractId: string,
    dto: UpdateContractAssetLinesDto,
  ) {
    const contract = await this.requireContract(organizationId, contractId);
    if (!['draft', 'pending_approval', 'approved'].includes(contract.status)) {
      throw new ConflictException(
        'Asset lines can only be edited on draft or pre-active contracts',
      );
    }
    const snapshots = await this.applyAssetLines(
      organizationId,
      contractId,
      dto.assetLines,
      { confirmShortfall: dto.confirmShortfall === true },
    );
    const hasAwaitingLine = snapshots.some((s) => s.awaitingAssetsLine);
    await this.repo.updateContract(contractId, organizationId, {
      awaitingFutureAssets: hasAwaitingLine,
      updatedByUserId: userId,
    });
    return {
      contract: await this.getById(organizationId, contractId),
      lineAvailability: snapshots,
    };
  }

  async previewAssetLineAvailability(
    organizationId: string,
    assetClass: string,
    committedQuantity: number,
  ) {
    const { availableNow, inbound } = await this.repo.getAssetClassInventory(
      organizationId,
      assetClass,
    );
    return computeAssetLineAvailability(
      assetClass,
      committedQuantity,
      availableNow,
      inbound,
      false,
    );
  }

  async getTermsEvaluation(organizationId: string, contractId: string) {
    await this.requireContract(organizationId, contractId);
    return this.buildPricingEvaluation(organizationId, contractId);
  }

  async getReview(organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    const [lines, clientBundle, pricingEvaluation] = await Promise.all([
      this.repo.listAssetLines(contractId),
      contract.clientId
        ? this.repo.getClientWithPocs(organizationId, contract.clientId)
        : Promise.resolve(null),
      this.buildPricingEvaluation(organizationId, contractId),
    ]);
    const primaryPoc =
      clientBundle?.pocs.find((p) => p.isPrimary) ?? clientBundle?.pocs[0] ?? null;
    const assetLines = lines.map((l) => {
      const snapshot = computeAssetLineAvailability(
        l.assetClass,
        l.committedQuantity,
        l.availableNowCount,
        l.inboundCount,
        l.awaitingAssetsLine,
      );
      return {
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
        availability: {
          status: snapshot.status,
          availableNow: snapshot.availableNow,
          inbound: snapshot.inbound,
          shortfallCount: snapshot.shortfallCount,
          shortfallConfirmed: l.awaitingAssetsLine,
          displayMessage: snapshot.message,
        },
      };
    });
    const reviewAssetLineInputs = lines.map((l) => {
      const snapshot = computeAssetLineAvailability(
        l.assetClass,
        l.committedQuantity,
        l.availableNowCount,
        l.inboundCount,
        l.awaitingAssetsLine,
      );
      return {
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
        availabilityStatus: snapshot.status,
        availableNowCount: snapshot.availableNow,
        inboundCount: snapshot.inbound,
        shortfallCount: snapshot.shortfallCount,
        awaitingAssetsLine: l.awaitingAssetsLine,
        availabilityMessage: snapshot.message,
      };
    });
    const reviewAction = resolveReviewAction(pricingEvaluation);
    const messages = buildContractReviewMessages({
      pricing: pricingEvaluation,
      assetLines: reviewAssetLineInputs,
    });
    const canSubmit = computeCanSubmitReview({
      status: contract.status,
      clientId: contract.clientId,
      pricing: pricingEvaluation,
    });
    return {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      rawStatus: contract.status,
      status: this.toPublicStatus(contract.status as LeaseContractStatus),
      client: clientBundle
        ? {
            companyName: clientBundle.client.companyName,
            primaryPoc: primaryPoc
              ? {
                  name: primaryPoc.name,
                  contactNumber: primaryPoc.contactNumber,
                  email: primaryPoc.email,
                }
              : null,
          }
        : null,
      assetLines,
      terms: {
        termMonths: contract.termMonths,
        securityDeposit: contract.securityDeposit,
        billingFrequency: contract.billingFrequency,
        startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
      },
      pricingEvaluation,
      reviewAction,
      messages,
      canSubmit,
    };
  }

  async confirmContract(
    userId: string,
    organizationId: string,
    contractId: string,
  ) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'draft') {
      throw new BadRequestException('Only draft contracts can be confirmed');
    }
    await this.validateReadyForSubmission(organizationId, contractId, contract);
    const pricing = await this.buildPricingEvaluation(organizationId, contractId);
    if (!pricing.canProceedToReview) {
      throw new BadRequestException({
        code: 'TERMS_INCOMPLETE',
        message: 'Complete client, asset lines, and terms before confirm',
        pricingEvaluation: pricing,
      });
    }
    if (pricing.requiresApproval) {
      throw new BadRequestException({
        code: 'PRICING_REQUIRES_APPROVAL',
        message:
          'Rates or deposit require approval — use Submit for approval instead of Confirm',
        pricingEvaluation: pricing,
        reviewAction: 'submit_for_approval' as const,
      });
    }
    const lines = await this.repo.listAssetLines(contractId);
    const allCovered = lines.every((l) => l.availabilityCovered);
    const hasAwaitingLine = lines.some((l) => l.awaitingAssetsLine);
    const nextStatus: LeaseContractStatus =
      allCovered && !hasAwaitingLine ? 'active' : 'awaiting_assets';
    await this.repo.updateContract(contractId, organizationId, {
      status: nextStatus,
      rateRequiresApproval: false,
      onHold: false,
      billingPaused: false,
      awaitingFutureAssets: nextStatus === 'awaiting_assets' || hasAwaitingLine,
      updatedByUserId: userId,
    });
    await this.markLinkedVehiclesLeased(contractId);
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.confirmed',
      nextStatus === 'active'
        ? 'Contract confirmed and activated (standard rates)'
        : 'Contract confirmed — awaiting assets for one or more lines',
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.confirm',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
    });
    const detail = await this.getById(organizationId, contractId);
    const review = await this.getReview(organizationId, contractId);
    const confirmed = await this.repo.findContractInOrg(
      organizationId,
      contractId,
    );
    const confirmation = confirmed
      ? await this.buildConfirmationSummary(organizationId, confirmed)
      : null;
    return {
      contract: detail,
      pricingEvaluation: pricing,
      reviewAction: 'confirm_contract' as const,
      messages: review.messages,
      activatedStatus: nextStatus,
      confirmation,
      confirmationUrl: `/api/v1/fleet-leasing/lease-contracts/${contractId}/confirmation`,
    };
  }

  async updateContractTerms(
    userId: string,
    organizationId: string,
    contractId: string,
    dto: UpdateContractTermsDto,
  ) {
    const contract = await this.requireContract(organizationId, contractId);
    if (!['draft', 'pending_approval', 'approved'].includes(contract.status)) {
      throw new ConflictException(
        'Terms can only be edited on draft or pre-active contracts',
      );
    }
    this.validateAmcTierOptional(dto.amcTier);
    const startDate = new Date(dto.startDate);
    const endDate = addMonthsUtc(startDate, dto.termMonths);
    await this.repo.updateContract(contractId, organizationId, {
      startDate,
      endDate,
      termMonths: dto.termMonths,
      securityDeposit: dto.securityDeposit,
      billingFrequency: dto.billingFrequency,
      additionalTerms: dto.additionalTerms ?? null,
      amcTier: dto.amcTier ?? null,
      updatedByUserId: userId,
    });
    const pricingEvaluation = await this.buildPricingEvaluation(
      organizationId,
      contractId,
    );
    await this.repo.updateContract(contractId, organizationId, {
      rateRequiresApproval: pricingEvaluation.requiresApproval,
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.terms_updated',
      'Contract terms updated (wizard step 3)',
    );
    return {
      contract: await this.getById(organizationId, contractId),
      pricingEvaluation,
    };
  }

  async update(
    userId: string,
    organizationId: string,
    contractId: string,
    dto: UpdateLeaseContractDto,
  ) {
    const existing = await this.repo.findContractInOrg(organizationId, contractId);
    if (!existing) throw new NotFoundException('Lease contract not found');
    const rawStatus = existing.status as LeaseContractStatus;
    const editBlockReason = getContractEditBlockReason(rawStatus);
    if (editBlockReason) {
      throw new ConflictException(editBlockReason);
    }
    if (dto.amcTier !== undefined) {
      this.validateAmcTierOptional(dto.amcTier);
    }
    const classification = normalizeEditClassification(dto.editClassification);
    const [beforeLines, beforeVehicleIds] = await Promise.all([
      this.repo.listAssetLines(contractId),
      this.repo.listContractVehicleIds(contractId),
    ]);
    const beforeSnapshot = contractRowToSnapshot({
      clientId: existing.clientId,
      startDate: existing.startDate,
      endDate: existing.endDate,
      termMonths: existing.termMonths,
      securityDeposit: existing.securityDeposit,
      billingFrequency: existing.billingFrequency,
      additionalTerms: existing.additionalTerms,
      amcTier: existing.amcTier,
      description: existing.description,
      assetLines: beforeLines.map((l) => ({
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
      })),
      vehicleIds: beforeVehicleIds,
    });
    if (dto.clientId) {
      const client = await this.repo.getClientInOrg(organizationId, dto.clientId);
      if (!client) throw new BadRequestException('Invalid client for organization');
    }

    const nextStartDate =
      dto.startDate !== undefined
        ? new Date(dto.startDate)
        : existing.startDate;
    const nextTermMonths =
      dto.termMonths !== undefined ? dto.termMonths : existing.termMonths;
    const recomputeEndDate =
      (dto.startDate !== undefined || dto.termMonths !== undefined) &&
      nextStartDate !== null &&
      nextTermMonths !== null &&
      nextTermMonths > 0;

    const contractPatch: Parameters<
      FleetLeasingRepository['updateContract']
    >[2] = {
      updatedByUserId: userId,
    };
    if (dto.clientId !== undefined) contractPatch.clientId = dto.clientId;
    if (dto.startDate !== undefined) contractPatch.startDate = nextStartDate;
    if (dto.termMonths !== undefined) contractPatch.termMonths = dto.termMonths;
    if (recomputeEndDate) {
      contractPatch.endDate = addMonthsUtc(nextStartDate!, nextTermMonths!);
    } else if (dto.endDate !== undefined) {
      contractPatch.endDate = new Date(dto.endDate);
    }
    if (dto.securityDeposit !== undefined) {
      contractPatch.securityDeposit = dto.securityDeposit;
    }
    if (dto.billingFrequency !== undefined) {
      contractPatch.billingFrequency = dto.billingFrequency;
    }
    if (dto.additionalTerms !== undefined) {
      contractPatch.additionalTerms = dto.additionalTerms;
    }
    if (dto.amcTier !== undefined) contractPatch.amcTier = dto.amcTier;
    if (dto.description !== undefined) contractPatch.description = dto.description;

    await this.repo.updateContract(contractId, organizationId, contractPatch);

    const pricingTouched =
      dto.clientId !== undefined ||
      dto.startDate !== undefined ||
      dto.termMonths !== undefined ||
      dto.securityDeposit !== undefined ||
      dto.billingFrequency !== undefined ||
      dto.additionalTerms !== undefined ||
      dto.amcTier !== undefined ||
      dto.assetLines !== undefined;

    if (dto.assetLines) {
      const snapshots = await this.applyAssetLines(
        organizationId,
        contractId,
        dto.assetLines,
        { confirmShortfall: false },
      );
      const hasAwaitingLine = snapshots.some((s) => s.awaitingAssetsLine);
      await this.repo.updateContract(contractId, organizationId, {
        awaitingFutureAssets: hasAwaitingLine,
        updatedByUserId: userId,
      });
    }
    if (dto.vehicleIds) {
      await this.applyVehicles(organizationId, contractId, dto.vehicleIds);
    }

    let pricingEvaluation: ContractPricingEvaluation | undefined;
    if (pricingTouched) {
      pricingEvaluation = await this.buildPricingEvaluation(
        organizationId,
        contractId,
      );
      await this.repo.updateContract(contractId, organizationId, {
        rateRequiresApproval: pricingEvaluation.requiresApproval,
        updatedByUserId: userId,
      });
    }

    const updatedRow = await this.repo.findContractInOrg(
      organizationId,
      contractId,
    );
    const [afterLines, afterVehicleIds] = await Promise.all([
      this.repo.listAssetLines(contractId),
      this.repo.listContractVehicleIds(contractId),
    ]);
    const afterSnapshot = contractRowToSnapshot({
      clientId: updatedRow?.clientId ?? existing.clientId,
      startDate: updatedRow?.startDate ?? existing.startDate,
      endDate: updatedRow?.endDate ?? existing.endDate,
      termMonths: updatedRow?.termMonths ?? existing.termMonths,
      securityDeposit: updatedRow?.securityDeposit ?? existing.securityDeposit,
      billingFrequency:
        updatedRow?.billingFrequency ?? existing.billingFrequency,
      additionalTerms: updatedRow?.additionalTerms ?? existing.additionalTerms,
      amcTier: updatedRow?.amcTier ?? existing.amcTier,
      description: updatedRow?.description ?? existing.description,
      assetLines: afterLines.map((l) => ({
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
      })),
      vehicleIds: afterVehicleIds,
    });
    const changedFields = computeContractFieldDiff(
      beforeSnapshot,
      afterSnapshot,
    );
    if (changedFields.length > 0) {
      await this.repo.insertEditLog({
        organizationId,
        contractId,
        actorUserId: userId,
        classification,
        changedFields,
      });
      if (classification === 'material') {
        await this.repo.updateContract(contractId, organizationId, {
          requiresEditReview: true,
          updatedByUserId: userId,
        });
      }
    }

    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.edited',
      `Contract ${existing.contractNumber} edited`,
      {
        classification,
        changedFields,
      },
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.update',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
      metadata: { classification, fieldCount: changedFields.length },
    });

    const detail = await this.getById(organizationId, contractId);
    if (pricingEvaluation) {
      return { ...detail, pricingEvaluation };
    }
    return detail;
  }

  async submitForApproval(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'draft') {
      throw new BadRequestException('Only draft contracts can be submitted');
    }
    await this.validateReadyForSubmission(organizationId, contractId, contract);
    const pricing = await this.buildPricingEvaluation(organizationId, contractId);
    if (!pricing.canProceedToReview) {
      throw new BadRequestException({
        code: 'TERMS_INCOMPLETE',
        message: 'Complete client, asset lines, and terms before submit',
        pricingEvaluation: pricing,
      });
    }
    const rateException = pricing.requiresApproval;
    const nextStatus: LeaseContractStatus = rateException
      ? 'pending_approval'
      : 'approved';
    await this.repo.updateContract(contractId, organizationId, {
      status: nextStatus,
      rateRequiresApproval: rateException,
      updatedByUserId: userId,
    });
    if (rateException) {
      await this.repo.insertApproval({
        organizationId,
        contractId,
        sourceType: 'contract_rate_exception',
        requestedByUserId: userId,
      });
      await this.logEvent(
        contractId,
        organizationId,
        userId,
        'contract.submitted',
        'Submitted for approval (rate exception)',
      );
    } else {
      await this.logEvent(
        contractId,
        organizationId,
        userId,
        'contract.submitted',
        'Submitted and auto-approved (standard rates)',
      );
    }
    const contractDetail = await this.getById(organizationId, contractId);
    const lines = await this.repo.listAssetLines(contractId);
    const reviewAssetLineInputs = lines.map((l) => {
      const snapshot = computeAssetLineAvailability(
        l.assetClass,
        l.committedQuantity,
        l.availableNowCount,
        l.inboundCount,
        l.awaitingAssetsLine,
      );
      return {
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
        availabilityStatus: snapshot.status,
        availableNowCount: snapshot.availableNow,
        inboundCount: snapshot.inbound,
        shortfallCount: snapshot.shortfallCount,
        awaitingAssetsLine: l.awaitingAssetsLine,
        availabilityMessage: snapshot.message,
      };
    });
    const reviewAction = resolveReviewAction(pricing);
    const messages = buildContractReviewMessages({
      pricing,
      assetLines: reviewAssetLineInputs,
    });
    return {
      contract: contractDetail,
      pricingEvaluation: pricing,
      reviewAction,
      messages,
      pendingApproval: rateException,
    };
  }

  async approveContract(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'pending_approval') {
      throw new BadRequestException('Contract is not pending approval');
    }
    const pending = await this.repo.findPendingApproval(
      contractId,
      'contract_rate_exception',
    );
    if (pending) {
      await this.repo.resolveApproval(pending.id, 'approved', userId);
    }
    await this.repo.updateContract(contractId, organizationId, {
      status: 'approved',
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.approved',
      'Contract approved',
    );
    return this.getById(organizationId, contractId);
  }

  async activate(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (!['approved', 'awaiting_assets'].includes(contract.status)) {
      throw new BadRequestException('Contract cannot be activated from current status');
    }
    const lines = await this.repo.listAssetLines(contractId);
    const allCovered = lines.every((l) => l.availabilityCovered);
    const status: LeaseContractStatus = allCovered ? 'active' : 'awaiting_assets';
    await this.repo.updateContract(contractId, organizationId, {
      status,
      onHold: false,
      billingPaused: false,
      awaitingFutureAssets: status === 'awaiting_assets',
      updatedByUserId: userId,
    });
    await this.markLinkedVehiclesLeased(contractId);
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.activated',
      status === 'active'
        ? 'Contract activated'
        : 'Contract awaiting assets',
    );
    const updated = await this.repo.findContractInOrg(organizationId, contractId);
    const confirmation = updated
      ? await this.buildConfirmationSummary(organizationId, updated)
      : null;
    return {
      contract: await this.getById(organizationId, contractId),
      confirmation,
      confirmationUrl: `/api/v1/fleet-leasing/lease-contracts/${contractId}/confirmation`,
    };
  }

  /** Figma: direct reactivate — no approval workflow. */
  async reactivate(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status === 'closed' || contract.status === 'concluded') {
      throw new BadRequestException('Terminated contracts cannot be reactivated');
    }
    if (contract.status === 'pending_termination') {
      throw new BadRequestException(
        'Reactivation is not available while termination is pending',
      );
    }
    if (contract.status !== 'deactivated' && contract.status !== 'billing_paused') {
      throw new BadRequestException('Only deactivated contracts can be reactivated');
    }
    const lines = await this.repo.listAssetLines(contractId);
    const allCovered = lines.every((l) => l.availabilityCovered);
    const status: LeaseContractStatus = allCovered ? 'active' : 'awaiting_assets';
    await this.repo.updateContract(contractId, organizationId, {
      status,
      onHold: false,
      billingPaused: false,
      awaitingFutureAssets: status === 'awaiting_assets',
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.reactivated',
      status === 'active'
        ? 'Contract reactivated successfully'
        : 'Contract reactivated — awaiting assets for one or more lines',
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.reactivate',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
    });
    return this.getById(organizationId, contractId);
  }

  async deactivate(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'active') {
      throw new BadRequestException('Only active contracts can be deactivated');
    }
    await this.repo.updateContract(contractId, organizationId, {
      status: 'deactivated',
      onHold: true,
      billingPaused: false,
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.deactivated',
      'Contract deactivated — billing continues until all vehicles returned & registered',
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.deactivate',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
    });
    return this.getById(organizationId, contractId);
  }

  async pauseBilling(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'deactivated') {
      throw new BadRequestException('Pause billing only applies to deactivated contracts');
    }
    const returned = await this.repo.countRegisteredReturns(contractId);
    const committed = await this.repo.countCommittedVehicles(contractId);
    if (committed > 0 && returned < committed) {
      throw new BadRequestException(
        'All vehicles must be returned and registered before pausing billing',
      );
    }
    await this.repo.updateContract(contractId, organizationId, {
      billingPaused: true,
      status: 'billing_paused',
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.billing_paused',
      'Billing paused successfully',
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.pause_billing',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
    });
    return this.getById(organizationId, contractId);
  }

  async requestTermination(
    userId: string,
    organizationId: string,
    contractId: string,
  ) {
    const contract = await this.requireContract(organizationId, contractId);
    if (!['deactivated', 'billing_paused'].includes(contract.status)) {
      throw new BadRequestException(
        'Terminate from deactivated/on-hold state only',
      );
    }
    if (await this.repo.findPendingApproval(contractId, 'contract_termination')) {
      throw new ConflictException('Termination already pending approval');
    }
    await this.repo.insertApproval({
      organizationId,
      contractId,
      sourceType: 'contract_termination',
      requestedByUserId: userId,
    });
    await this.repo.updateContract(contractId, organizationId, {
      status: 'pending_termination',
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.termination_requested',
      'Termination requested — pending Contract Admin approval',
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.request_termination',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
    });
    return this.getById(organizationId, contractId);
  }

  async registerReturn(
    userId: string,
    organizationId: string,
    contractId: string,
    dto: {
      vehicleId: string;
      odometerReading: number;
      conditionChecklist: Record<string, 'pass' | 'fail'>;
      damageRecordId?: string;
    },
  ) {
    await this.requireContract(organizationId, contractId);
    const vehicle = await this.repo.getVehicleInOrg(organizationId, dto.vehicleId);
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    const linked = await this.repo.listContractVehicleIds(contractId);
    if (!linked.includes(dto.vehicleId)) {
      throw new BadRequestException('Vehicle is not on this contract');
    }
    if (dto.damageRecordId) {
      const damage = await this.repo.findDamageRecordInOrg(
        organizationId,
        dto.damageRecordId,
      );
      if (!damage) {
        throw new NotFoundException('Damage record not found');
      }
    }
    await this.repo.insertReturnInspection({
      organizationId,
      contractId,
      vehicleId: dto.vehicleId,
      odometerReading: dto.odometerReading,
      conditionChecklist: dto.conditionChecklist,
      damageRecordId: dto.damageRecordId ?? null,
      registeredReturn: true,
    });
    await this.repo.updateVehicleStatus(dto.vehicleId, 'returned');
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'return.registered',
      `Vehicle ${vehicle.registrationNo} registered as returned`,
    );
    return this.getById(organizationId, contractId);
  }

  async renewContract(
    userId: string,
    organizationId: string,
    contractId: string,
  ) {
    const source = await this.requireContract(organizationId, contractId);
    const rawStatus = source.status as LeaseContractStatus;
    if (!RENEWABLE_CONTRACT_STATUSES.includes(rawStatus)) {
      throw new BadRequestException(
        'Renewal is available for active, awaiting assets, or completed contracts',
      );
    }
    const lines = await this.repo.listAssetLines(contractId);
    const contractNumber = await this.repo.nextContractNumber(organizationId);
    const draft = await this.repo.insertContract({
      organizationId,
      contractNumber,
      clientId: source.clientId,
      status: 'draft',
      startDate: null,
      endDate: null,
      termMonths: null,
      securityDeposit: source.securityDeposit,
      billingFrequency: source.billingFrequency,
      additionalTerms: source.additionalTerms,
      amcTier: source.amcTier,
      description: source.description,
      renewedFromContractId: source.id,
      awaitingFutureAssets: false,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
    if (lines.length > 0) {
      await this.repo.replaceAssetLines(
        draft.id,
        lines.map((l) => ({
          assetClass: l.assetClass,
          committedQuantity: l.committedQuantity,
          ratePerVehicleMonth: l.ratePerVehicleMonth,
          availabilityCovered: l.availabilityCovered,
          availabilityStatus: l.availabilityStatus,
          availableNowCount: l.availableNowCount,
          inboundCount: l.inboundCount,
          shortfallCount: l.shortfallCount,
          awaitingAssetsLine: l.awaitingAssetsLine,
          sortOrder: l.sortOrder,
        })),
      );
    }
    await this.logEvent(
      source.id,
      organizationId,
      userId,
      'contract.renewal_started',
      `Renewal draft ${draft.contractNumber} created from ${source.contractNumber}`,
      { renewalDraftId: draft.id },
    );
    await this.logEvent(
      draft.id,
      organizationId,
      userId,
      'contract.created',
      `Renewal draft created from ${source.contractNumber} — set terms to compute end date`,
      { renewedFromContractId: source.id },
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.renew',
      resourceType: 'lease_contract',
      resourceId: draft.id,
      status: 'SUCCESS',
      metadata: { sourceContractId: source.id },
    });
    return this.getById(organizationId, draft.id);
  }

  async approveTermination(
    userId: string,
    organizationId: string,
    contractId: string,
  ) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'pending_termination') {
      throw new BadRequestException('Contract is not pending termination');
    }
    const pending = await this.repo.findPendingApproval(
      contractId,
      'contract_termination',
    );
    if (!pending) throw new NotFoundException('Pending termination approval not found');
    await this.repo.resolveApproval(pending.id, 'approved', userId);
    await this.repo.updateContract(contractId, organizationId, {
      status: 'closed',
      billingPaused: true,
      onHold: true,
      updatedByUserId: userId,
    });
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.termination_approved',
      'Termination completed successfully — security deposit settled immediately. Contract closed.',
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'lease_contract.approve_termination',
      resourceType: 'lease_contract',
      resourceId: contractId,
      status: 'SUCCESS',
    });
    return this.getById(organizationId, contractId);
  }

  private async requireContract(organizationId: string, contractId: string) {
    const contract = await this.repo.findContractInOrg(organizationId, contractId);
    if (!contract) throw new NotFoundException('Lease contract not found');
    return contract;
  }

  private async validateReadyForSubmission(
    organizationId: string,
    contractId: string,
    contract: {
      clientId: string | null;
      startDate: Date | null;
      termMonths: number | null;
      securityDeposit: string | null;
    },
  ) {
    if (!contract.clientId) {
      throw new BadRequestException('Client is required before submission');
    }
    if (!contract.startDate) {
      throw new BadRequestException('Start date is required before submission');
    }
    if (contract.termMonths == null) {
      throw new BadRequestException('Time period (term months) is required');
    }
    if (!contract.securityDeposit) {
      throw new BadRequestException(
        'Security deposit is required before this contract can proceed',
      );
    }
    const lines = await this.repo.listAssetLines(contractId);
    if (lines.length === 0) {
      throw new BadRequestException('At least one asset-class line is required');
    }
    const client = await this.repo.getClientInOrg(
      organizationId,
      contract.clientId,
    );
    if (!client?.isActive) {
      throw new BadRequestException('Selected client is inactive');
    }
  }

  private async buildPricingEvaluation(
    organizationId: string,
    contractId: string,
  ) {
    await this.requireContract(organizationId, contractId);
    const contract = await this.repo.findContractInOrg(organizationId, contractId);
    const lines = await this.repo.listAssetLines(contractId);
    return evaluateContractPricing({
      securityDeposit: contract?.securityDeposit ?? null,
      assetLines: lines.map((l) => ({
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
      })),
    });
  }

  private async applyAssetLines(
    organizationId: string,
    contractId: string,
    lines: { assetClass: string; committedQuantity: number; ratePerVehicleMonth: string }[],
    options: { confirmShortfall: boolean },
  ) {
    const snapshots = await Promise.all(
      lines.map(async (l) => {
        const { availableNow, inbound } = await this.repo.getAssetClassInventory(
          organizationId,
          l.assetClass,
        );
        return computeAssetLineAvailability(
          l.assetClass,
          l.committedQuantity,
          availableNow,
          inbound,
          options.confirmShortfall,
        );
      }),
    );
    const shortfalls = snapshots.filter((s) => s.status === 'shortfall');
    if (shortfalls.length > 0 && !options.confirmShortfall) {
      throw new ConflictException({
        code: 'ASSET_SHORTFALL',
        message: 'Available assets are not enough',
        shortfalls: shortfalls.map((s) => ({
          assetClass: s.assetClass,
          committedQuantity: s.committedQuantity,
          availableNow: s.availableNow,
          inbound: s.inbound,
          shortfallCount: s.shortfallCount,
          message: s.message,
        })),
      });
    }
    const enriched = lines.map((l, i) => {
      const s = snapshots[i]!;
      return {
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
        availabilityCovered: s.availabilityCovered,
        availabilityStatus: s.status,
        availableNowCount: s.availableNow,
        inboundCount: s.inbound,
        shortfallCount: s.shortfallCount,
        awaitingAssetsLine: s.awaitingAssetsLine,
      };
    });
    await this.repo.replaceAssetLines(contractId, enriched);
    return snapshots;
  }

  private async applyVehicles(
    organizationId: string,
    contractId: string,
    vehicleIds: string[],
  ) {
    const now = new Date();
    for (const vehicleId of vehicleIds) {
      const vehicle = await this.repo.getVehicleInOrg(organizationId, vehicleId);
      if (!vehicle) throw new BadRequestException(`Vehicle ${vehicleId} not found`);
      if (vehicle.status !== 'available') {
        throw new BadRequestException(
          `Vehicle ${vehicle.registrationNo} is not available`,
        );
      }
      if (vehicle.registrationExpiry < now || vehicle.insuranceExpiry < now) {
        throw new BadRequestException(
          `Vehicle ${vehicle.registrationNo} has expired compliance`,
        );
      }
    }
    await this.repo.replaceContractVehicles(contractId, vehicleIds);
  }

  private async logEvent(
    contractId: string,
    organizationId: string,
    userId: string,
    eventType: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.repo.insertEvent({
      contractId,
      organizationId,
      eventType,
      message,
      actorUserId: userId,
      metadata: metadata ?? null,
    });
  }

  private validateAmcTierOptional(tier: string | null | undefined) {
    if (tier == null || tier === '') return;
    if (!(AMC_TIER_STUB_VALUES as readonly string[]).includes(tier)) {
      throw new BadRequestException(
        `AMC tier must be one of: ${AMC_TIER_STUB_VALUES.join(', ')}`,
      );
    }
  }

  private async markLinkedVehiclesLeased(contractId: string) {
    const ids = await this.repo.listContractVehicleIds(contractId);
    await this.repo.markVehiclesLeased(ids);
  }

  private async toListItem(
    contract: {
      id: string;
      contractNumber: string;
      clientId: string | null;
      status: string;
      startDate: Date | null;
      endDate: Date | null;
      termMonths: number | null;
      billingPaused: boolean;
      onHold: boolean;
    },
    clientCompanyName: string | null,
  ) {
    const lines = await this.repo.listAssetLines(contract.id);
    const assetClasses = lines.map((l) => l.assetClass).join(', ') || null;
    const rawStatus = contract.status as LeaseContractStatus;
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      clientName: clientCompanyName ?? 'Not yet selected',
      assetClasses: assetClasses ?? '--',
      startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
      termMonths: contract.termMonths,
      status: this.toPublicStatus(rawStatus),
      rawStatus: contract.status,
      billingPaused: contract.billingPaused,
      onHold: contract.onHold,
      statusTags: buildStatusTags({
        rawStatus,
        billingPaused: contract.billingPaused,
        onHold: contract.onHold,
      }),
    };
  }

  private async toDetail(
    organizationId: string,
    contract: Awaited<ReturnType<FleetLeasingRepository['findContractInOrg']>> & {},
  ) {
    if (!contract) throw new NotFoundException();
    const rawStatus = contract.status as LeaseContractStatus;
    const [
      lines,
      vehicleIds,
      events,
      client,
      returned,
      committed,
      pendingTermination,
      editLogs,
    ] = await Promise.all([
      this.repo.listAssetLines(contract.id),
      this.repo.listContractVehicleIds(contract.id),
      this.repo.listEvents(contract.id, 100),
      contract.clientId
        ? this.repo.getClientWithPocs(organizationId, contract.clientId)
        : Promise.resolve(null),
      this.repo.countRegisteredReturns(contract.id),
      this.repo.countCommittedVehicles(contract.id),
      this.repo.findPendingApproval(contract.id, 'contract_termination'),
      this.repo.listEditLogs(contract.id, 50),
    ]);
    const vehicles = (
      await this.repo.getVehiclesByIds(organizationId, vehicleIds)
    ).map((v) => ({
      id: v.id,
      registrationNo: v.registrationNo,
      assetClass: v.assetClass,
      status: v.status,
    }));
    const actorIds = events
      .map((e) => e.actorUserId)
      .filter((id): id is string => Boolean(id));
    const labelsByUserId = await this.repo.findUserDisplayLabels(actorIds);
    const canPauseBilling = committed > 0 && returned >= committed;
    const returnProgress = {
      returnedRegisteredCount: returned,
      committedVehicleCount: committed,
      canPauseBilling,
    };
    const lifecycleLogs = mapLifecycleLogs(events, labelsByUserId);
    const logs = mapAllLogs(events, labelsByUserId);
    const statusTags = buildStatusTags({
      rawStatus,
      billingPaused: contract.billingPaused,
      onHold: contract.onHold,
    });
    const subtitle = buildDetailSubtitle({
      rawStatus,
      clientCompanyName: client?.client.companyName ?? null,
      billingPaused: contract.billingPaused,
      onHold: contract.onHold,
    });
    const statusBanner = buildStatusBanner({
      rawStatus,
      events,
      labelsByUserId,
    });
    const availableActions = buildAvailableActions({
      rawStatus,
      canPauseBilling,
      hasPendingTerminationApproval: Boolean(pendingTermination),
    });
    const deactivatedEvent = findLatestEventByType(events, 'contract.deactivated');
    const terminationApprovedEvent = findLatestEventByType(
      events,
      'contract.termination_approved',
    );
    const reactivatedEvent = findLatestEventByType(events, 'contract.reactivated');
    const auditUserIds = [
      contract.createdByUserId,
      contract.updatedByUserId,
    ].filter((id): id is string => Boolean(id));
    const auditLabels = await this.repo.findUserDisplayLabels(auditUserIds);
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: this.toPublicStatus(rawStatus),
      rawStatus: contract.status,
      subtitle,
      statusTags,
      statusBanner,
      client: client
        ? {
            id: client.client.id,
            companyName: client.client.companyName,
            address: client.client.address,
            pointsOfContact: client.pocs.map((p) => ({
              id: p.id,
              name: p.name,
              contactNumber: p.contactNumber,
              email: p.email,
              isPrimary: p.isPrimary,
            })),
            primaryPoc: client.pocs.find((p) => p.isPrimary) ?? null,
          }
        : null,
      startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
      termMonths: contract.termMonths,
      securityDeposit: contract.securityDeposit,
      billingFrequency: contract.billingFrequency,
      additionalTerms: contract.additionalTerms,
      amcTier: contract.amcTier,
      awaitingFutureAssets: contract.awaitingFutureAssets,
      billingPaused: contract.billingPaused,
      onHold: contract.onHold,
      rateRequiresApproval: contract.rateRequiresApproval,
      description: contract.description,
      assetLines: lines.map((l) => ({
        id: l.id,
        assetClass: l.assetClass,
        committedQuantity: l.committedQuantity,
        ratePerVehicleMonth: l.ratePerVehicleMonth,
        availabilityCovered: l.availabilityCovered,
        availabilityStatus: l.availabilityStatus,
        availableNowCount: l.availableNowCount,
        inboundCount: l.inboundCount,
        shortfallCount: l.shortfallCount,
        awaitingAssetsLine: l.awaitingAssetsLine,
      })),
      vehicleIds,
      vehicles,
      renewedFromContractId: contract.renewedFromContractId ?? null,
      requiresEditReview: contract.requiresEditReview,
      editLogs: editLogs.map((log) => ({
        id: log.id,
        classification: log.classification,
        changedFields: log.changedFields,
        actorUserId: log.actorUserId,
        createdAt: log.createdAt.toISOString(),
      })),
      returnProgress,
      availableActions,
      lifecycleLogs,
      logs,
      deactivatedAt: deactivatedEvent?.createdAt.toISOString() ?? null,
      reactivatedAt: reactivatedEvent?.createdAt.toISOString() ?? null,
      terminatedAt: terminationApprovedEvent?.createdAt.toISOString() ?? null,
      terminationApprovedAt: terminationApprovedEvent?.createdAt.toISOString() ?? null,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
      createdBy: contract.createdByUserId
        ? {
            userId: contract.createdByUserId,
            displayLabel:
              auditLabels.get(contract.createdByUserId) ?? 'Unknown user',
          }
        : null,
      updatedBy: contract.updatedByUserId
        ? {
            userId: contract.updatedByUserId,
            displayLabel:
              auditLabels.get(contract.updatedByUserId) ?? 'Unknown user',
          }
        : null,
    };
  }

  private async buildConfirmationSummary(
    organizationId: string,
    contract: NonNullable<
      Awaited<ReturnType<FleetLeasingRepository['findContractInOrg']>>
    >,
  ) {
    const [lines, allocatedByClass, client] = await Promise.all([
      this.repo.listAssetLines(contract.id),
      this.repo.countAllocatedVehiclesByAssetClass(contract.id),
      contract.clientId
        ? this.repo.getClientInOrg(organizationId, contract.clientId)
        : Promise.resolve(null),
    ]);
    const rawStatus = contract.status as LeaseContractStatus;
    const publicStatus = this.toPublicStatus(rawStatus);
    const allocationByLine = lines.map((line) =>
      buildContractLineAllocationRow({
        assetClass: line.assetClass,
        committedQuantity: line.committedQuantity,
        allocatedCount: allocatedByClass[line.assetClass] ?? 0,
        inboundCount: line.inboundCount,
        shortfallCount: line.shortfallCount,
        awaitingAssetsLine: line.awaitingAssetsLine,
        availabilityStatus: line.availabilityStatus,
      }),
    );
    const contractFullyAllocated =
      allocationByLine.length > 0 &&
      allocationByLine.every((l) => l.lineStatus === 'allocated');
    const hasAwaitingLines = allocationByLine.some(
      (l) => l.lineStatus === 'awaiting_assets',
    );
    const hasPartialLines = allocationByLine.some(
      (l) => l.lineStatus === 'partially_allocated',
    );
    const infoMessages = buildContractConfirmationInfoMessages({
      rawStatus,
      publicStatus,
      contractFullyAllocated,
      hasAwaitingLines,
      hasPartialLines,
    });
    return {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      clientCompanyName: client?.companyName ?? 'Not yet selected',
      publicStatus,
      rawStatus,
      headline: 'Contract confirmed',
      infoMessages,
      allocationByLine,
      contractFullyAllocated,
    };
  }

  private toPublicStatus(status: LeaseContractStatus): string {
    const map: Record<LeaseContractStatus, string> = {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      active: 'Active',
      awaiting_assets: 'Awaiting Assets',
      deactivated: 'Deactivated',
      billing_paused: 'Billing Paused',
      pending_termination: 'Pending Termination',
      closed: 'Closed',
      concluded: 'Closed',
    };
    return map[status] ?? status;
  }
}

function addMonthsUtc(start: Date, months: number): Date {
  const d = new Date(start.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
