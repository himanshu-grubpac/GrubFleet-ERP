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
import {
  LIST_STATUS_FILTER,
  TERMINAL_STATUSES,
  type LeaseContractStatus,
} from './constants/lease-contract-status';
import { computeAssetLineAvailability } from './utils/asset-class-availability.util';
import {
  buildContractReviewMessages,
  computeCanSubmitReview,
  resolveReviewAction,
} from './utils/contract-review.util';
import { evaluateContractPricing } from './utils/contract-pricing-engine.util';
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
      rows.map(async (r) => this.toListItem(r.contract, r.clientCompanyName)),
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
    if (TERMINAL_STATUSES.includes(existing.status as LeaseContractStatus)) {
      throw new ConflictException('Cannot update a closed contract');
    }
    if (!['draft', 'pending_approval', 'approved', 'active'].includes(existing.status)) {
      throw new ConflictException('Contract cannot be edited in current status');
    }
    if (dto.clientId) {
      const client = await this.repo.getClientInOrg(organizationId, dto.clientId);
      if (!client) throw new BadRequestException('Invalid client for organization');
    }
    await this.repo.updateContract(contractId, organizationId, {
      clientId: dto.clientId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      termMonths: dto.termMonths,
      securityDeposit: dto.securityDeposit,
      billingFrequency: dto.billingFrequency,
      additionalTerms: dto.additionalTerms,
      amcTier: dto.amcTier,
      updatedByUserId: userId,
    });
    if (dto.assetLines) {
      await this.applyAssetLines(organizationId, contractId, dto.assetLines, {
        confirmShortfall: false,
      });
    }
    if (dto.vehicleIds) {
      await this.applyVehicles(organizationId, contractId, dto.vehicleIds);
    }
    await this.logEvent(
      contractId,
      organizationId,
      userId,
      'contract.updated',
      `Contract ${existing.contractNumber} updated`,
    );
    return this.getById(organizationId, contractId);
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
    if (!['approved', 'deactivated', 'awaiting_assets'].includes(contract.status)) {
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

  /** Figma: direct reactivate — no approval. */
  async reactivate(userId: string, organizationId: string, contractId: string) {
    const contract = await this.requireContract(organizationId, contractId);
    if (contract.status !== 'deactivated' && contract.status !== 'billing_paused') {
      throw new BadRequestException('Only deactivated contracts can be reactivated');
    }
    return this.activate(userId, organizationId, contractId);
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
      'Billing paused',
    );
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
      'Termination approved — security deposit settled immediately. Contract closed.',
    );
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
  ) {
    await this.repo.insertEvent({
      contractId,
      organizationId,
      eventType,
      message,
      actorUserId: userId,
    });
  }

  private async toListItem(
    contract: {
      id: string;
      contractNumber: string;
      clientId: string | null;
      status: string;
      startDate: Date | null;
    },
    clientCompanyName: string | null,
  ) {
    const lines = await this.repo.listAssetLines(contract.id);
    const assetClasses = lines.map((l) => l.assetClass).join(', ') || null;
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      clientName: clientCompanyName ?? 'Not yet selected',
      assetClasses: assetClasses ?? '--',
      startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
      status: this.toPublicStatus(contract.status as LeaseContractStatus),
    };
  }

  private async toDetail(
    organizationId: string,
    contract: Awaited<ReturnType<FleetLeasingRepository['findContractInOrg']>> & {},
  ) {
    if (!contract) throw new NotFoundException();
    const [lines, vehicleIds, events, client, returned, committed] =
      await Promise.all([
        this.repo.listAssetLines(contract.id),
        this.repo.listContractVehicleIds(contract.id),
        this.repo.listEvents(contract.id),
        contract.clientId
          ? this.repo.getClientWithPocs(organizationId, contract.clientId)
          : Promise.resolve(null),
        this.repo.countRegisteredReturns(contract.id),
        this.repo.countCommittedVehicles(contract.id),
      ]);
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: this.toPublicStatus(contract.status as LeaseContractStatus),
      rawStatus: contract.status,
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
      returnProgress: {
        returnedRegisteredCount: returned,
        committedVehicleCount: committed,
        canPauseBilling: committed > 0 && returned >= committed,
      },
      logs: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        message: e.message,
        actorUserId: e.actorUserId,
        createdAt: e.createdAt.toISOString(),
      })),
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
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
      closed: 'Completed',
      concluded: 'Completed',
    };
    return map[status] ?? status;
  }
}

function addMonthsUtc(start: Date, months: number): Date {
  const d = new Date(start.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
