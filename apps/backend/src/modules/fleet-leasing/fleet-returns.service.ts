import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { resolveListSort } from '../../common/utils/list-sort.util';
import { AuditService } from '../audit/audit.service';
import {
  FLEET_RETURN_LIST_DEFAULT_SORT,
  FLEET_RETURN_LIST_SORT_FIELDS,
} from './constants/fleet-leasing-list-sort.constants';
import {
  FLEET_RETURN_INSPECTION_SECTION_CATALOG,
  FLEET_RETURN_INSPECTION_SECTION_IDS,
  computeInspectionSummary,
  mergeWorksheetWithCatalog,
  worksheetIsComplete,
  type FleetReturnInspectionSectionId,
  type FleetReturnInspectionWorksheet,
} from './constants/fleet-return-inspection-sections.constants';
import type { ListFleetReturnsQueryDto } from './dto/list-fleet-returns-query.dto';
import type { ReceiveReturnDto } from './dto/receive-return.dto';
import type { SaveReturnInspectionDto } from './dto/save-return-inspection.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { buildFleetReturnListNextSteps } from './utils/fleet-return-list-next-step.util';
import {
  buildFleetReturnInspectionResult,
  enrichFleetReturnInspectionResult,
  isFleetReturnWorkshopJobId,
  resolveFleetReturnWorkshopJobId,
} from './utils/fleet-return-inspection-result.util';
import { InvoicesService } from '../finance/invoices.service';
import { WorkOrdersService } from '../workshop/work-orders.service';
import { applyFinanceRecoveryToInspectionResult } from './utils/fleet-return-recovery-finance.util';
import { appendHoldResolvedToInspectionResult } from './utils/fleet-return-resolve-hold.util';
import type { SaveReInspectionDto } from './dto/save-re-inspection.dto';
import type { FinalizeReturnInspectionDto } from './dto/finalize-return-inspection.dto';
import type { ResolveReturnHoldDto } from './dto/resolve-return-hold.dto';
import type { FleetReturnInspectionResultPresentation } from './utils/fleet-return-inspection-result.util';
import {
  emptyFinalizeDraft,
  issueChargeKey,
  type FleetReturnInspectionFinalizeDraft,
} from './constants/fleet-return-inspection-finalize.constants';
import { resolveVehicleStatusForFinalize } from './utils/fleet-return-inspection-result.util';
import {
  buildInitialReInspectionWorksheet,
  buildReInspectionPresentation,
  mergeReInspectionIntoInspectionResult,
  reInspectionWorksheetIsComplete,
  type FleetReturnReInspectionWorksheet,
} from './utils/fleet-return-re-inspection.util';
import { buildFleetReturnDetailPresentation } from './utils/fleet-return-context-banner.util';
import { firstInspectionWorksheetValidationMessage } from './utils/fleet-return-inspection-worksheet-validation.util';
import type { GetFleetReturnDetailQueryDto } from './dto/get-fleet-return-detail-query.dto';

function resolveFleetCode(params: {
  assetRegisterFleetCode: string | null | undefined;
  registrationNo: string;
}): string {
  const fromRegister = params.assetRegisterFleetCode?.trim();
  if (fromRegister) return fromRegister;
  return params.registrationNo;
}

function formatInspectionDisplayNumber(
  createdAt: Date,
  inspectionId: string,
): string {
  const year = createdAt.getUTCFullYear();
  const suffix = inspectionId.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `INS-${year}-${suffix}`;
}

function sanitizeIncomingWorksheet(
  dto: SaveReturnInspectionDto,
  existing: FleetReturnInspectionWorksheet,
): FleetReturnInspectionWorksheet {
  const merged = mergeWorksheetWithCatalog(existing);
  for (const sectionKey of Object.keys(dto.sections)) {
    if (
      !FLEET_RETURN_INSPECTION_SECTION_IDS.includes(
        sectionKey as FleetReturnInspectionSectionId,
      )
    ) {
      throw new BadRequestException(
        `Unknown inspection section: ${sectionKey}`,
      );
    }
    const sectionId = sectionKey as FleetReturnInspectionSectionId;
    const catalog = FLEET_RETURN_INSPECTION_SECTION_CATALOG.find(
      (s) => s.id === sectionId,
    );
    if (!catalog) continue;
    const incoming = dto.sections[sectionId];
    if (!incoming || typeof incoming !== 'object') continue;
    const target = { ...merged.sections[sectionId]! };
    for (const item of catalog.items) {
      const row = incoming[item.key];
      if (!row) continue;
      target[item.key] = {
        rating: row.rating,
        note: row.note?.trim() || undefined,
        attribution: row.attribution,
        repairCostMinor: row.repairCostMinor,
        photoCount: row.photoCount,
      };
    }
    merged.sections[sectionId] = target;
  }
  merged.currentSectionIndex = dto.currentSectionIndex;
  return merged;
}

function parseFinalizeDraft(raw: unknown): FleetReturnInspectionFinalizeDraft {
  if (!raw || typeof raw !== 'object') {
    return emptyFinalizeDraft();
  }
  const o = raw as Record<string, unknown>;
  const issueCharges: Record<string, boolean> = {};
  if (o.issueCharges && typeof o.issueCharges === 'object') {
    for (const [k, v] of Object.entries(
      o.issueCharges as Record<string, unknown>,
    )) {
      if (typeof v === 'boolean') issueCharges[k] = v;
    }
  }
  return {
    disposition:
      typeof o.disposition === 'string'
        ? (o.disposition as FleetReturnInspectionFinalizeDraft['disposition'])
        : null,
    issueCharges,
    waiveAllRecovery: o.waiveAllRecovery === true,
    inspectorConfirmed: o.inspectorConfirmed === true,
    wearAndTearNote:
      typeof o.wearAndTearNote === 'string'
        ? o.wearAndTearNote.trim() || undefined
        : undefined,
    workshopPriority:
      o.workshopPriority === 'high' ||
      o.workshopPriority === 'urgent' ||
      o.workshopPriority === 'normal'
        ? o.workshopPriority
        : undefined,
    workshopTargetDate:
      typeof o.workshopTargetDate === 'string'
        ? o.workshopTargetDate.trim() || undefined
        : undefined,
  };
}

function fleetReturnListIsOnHold(row: {
  vehicleStatus: string;
  inspection: {
    inspectionStatus: string;
    inspectionResult: unknown;
  };
}): boolean {
  if (row.vehicleStatus !== 'returned') return false;
  if (row.inspection.inspectionStatus !== 'completed') return false;
  const stored = row.inspection.inspectionResult as { outcome?: string } | null;
  return stored?.outcome === 'on_hold';
}

function mergeFinalizeDtoIntoDraft(
  existing: FleetReturnInspectionFinalizeDraft,
  dto: FinalizeReturnInspectionDto,
): FleetReturnInspectionFinalizeDraft {
  const next: FleetReturnInspectionFinalizeDraft = {
    ...existing,
    issueCharges: { ...existing.issueCharges },
  };
  if (dto.disposition !== undefined) {
    next.disposition = dto.disposition;
  }
  if (dto.issueCharges?.length) {
    for (const row of dto.issueCharges) {
      next.issueCharges[issueChargeKey(row.sectionId, row.itemKey)] =
        row.chargeClient;
    }
  }
  if (dto.waiveAllRecovery !== undefined) {
    next.waiveAllRecovery = dto.waiveAllRecovery;
  }
  if (dto.inspectorConfirmed !== undefined) {
    next.inspectorConfirmed = dto.inspectorConfirmed;
  }
  if (dto.wearAndTearNote !== undefined) {
    const trimmed = dto.wearAndTearNote.trim();
    next.wearAndTearNote = trimmed || undefined;
  }
  if (dto.workshopPriority !== undefined) {
    next.workshopPriority = dto.workshopPriority;
  }
  if (dto.workshopTargetDate !== undefined) {
    next.workshopTargetDate = dto.workshopTargetDate.trim() || undefined;
  }
  return next;
}

function mapInspectionDetail(
  row: NonNullable<
    Awaited<ReturnType<FleetLeasingRepository['findReturnInspectionInOrg']>>
  >,
) {
  const { inspection } = row;
  const fleetCode = resolveFleetCode({
    assetRegisterFleetCode: row.assetRegisterFleetCode,
    registrationNo: row.registrationNo,
  });
  const worksheet = mergeWorksheetWithCatalog(
    inspection.inspectionWorksheet as FleetReturnInspectionWorksheet | null,
  );
  const inspectionResult =
    inspection.inspectionStatus === 'completed' &&
    inspection.inspectionCompletedAt
      ? buildFleetReturnInspectionResult({
          inspectionId: inspection.id,
          inspectionCreatedAt: inspection.createdAt,
          inspectionCompletedAt: inspection.inspectionCompletedAt,
          receivedAt: inspection.receivedAt,
          odometerReading: inspection.odometerReading,
          fleetCode,
          registrationNo: row.registrationNo,
          clientName: row.clientName ?? '—',
          contractNumber: row.contractNumber,
          contractStatus: row.contractStatus,
          contractClosingReason: row.contractClosingReason,
          contractEndDate: row.contractEndDate,
          contractExpectedReturnBy: row.contractExpectedReturnBy,
          depotLabel: row.contractReturnDepotLabel,
          vehicleStatus: row.vehicleStatus,
          workshopJobId: row.workshopJobId ?? null,
          worksheet,
          summary:
            (inspection.inspectionSummary as ReturnType<
              typeof computeInspectionSummary
            > | null) ??
            computeInspectionSummary(worksheet, {
              odometerReading: inspection.odometerReading,
              handoverOdometer:
                inspection.handoverOdometer ?? inspection.odometerReading,
              leaseKmAllowance: inspection.leaseKmAllowance,
            }),
          storedResult: inspection.inspectionResult,
        })
      : null;
  const repairEstimateMinor =
    (inspection.inspectionSummary as { repairEstimateMinor?: number } | null)
      ?.repairEstimateMinor ?? 0;
  const reInspectionWorksheet =
    (inspection.reInspectionWorksheet as FleetReturnReInspectionWorksheet | null) ??
    null;
  const reInspection = buildReInspectionPresentation({
    inspectionId: inspection.id,
    inspectionCreatedAt: inspection.createdAt,
    reInspectionStatus:
      (inspection.reInspectionStatus as
        'not_started' | 'in_progress' | 'completed') ?? 'not_started',
    workshopRepairClosedAt: inspection.workshopRepairClosedAt,
    inspectionResult,
    worksheet: reInspectionWorksheet,
    repairEstimateMinor,
  });
  const handoverOdometerForSummary =
    inspection.handoverOdometer ?? inspection.odometerReading;
  const inspectionSummaryComputed = computeInspectionSummary(worksheet, {
    odometerReading: inspection.odometerReading,
    handoverOdometer: handoverOdometerForSummary,
    leaseKmAllowance: inspection.leaseKmAllowance,
  });
  return {
    id: inspection.id,
    organizationId: inspection.organizationId,
    contractId: inspection.contractId,
    contractNumber: row.contractNumber,
    contractStatus: row.contractStatus,
    clientName: row.clientName ?? '—',
    vehicleId: inspection.vehicleId,
    registrationNo: row.registrationNo,
    fleetCode,
    assetClass: row.assetClass,
    vehicleStatus: row.vehicleStatus,
    vehicleOdometer: row.vehicleOdometer,
    odometerReading: inspection.odometerReading,
    conditionChecklist: inspection.conditionChecklist,
    damageRecordId: inspection.damageRecordId,
    registeredReturn: inspection.registeredReturn,
    receivedAt: inspection.receivedAt?.toISOString() ?? null,
    receivedByUserId: inspection.receivedByUserId,
    receivedByEmployeeId: inspection.receivedByEmployeeId,
    broughtInBy: inspection.broughtInBy,
    fuelLevel: inspection.fuelLevel,
    keysReceived: inspection.keysReceived,
    keysHandedOver: inspection.keysHandedOver,
    handoverOdometer: inspection.handoverOdometer,
    leaseKmAllowance: inspection.leaseKmAllowance,
    documentsChecklist: inspection.documentsChecklist,
    gatePhotos: inspection.gatePhotos,
    conditionAtGlance: inspection.conditionAtGlance,
    gateNote: inspection.gateNote,
    inspectImmediately: inspection.inspectImmediately,
    inspectionDisplayNumber: formatInspectionDisplayNumber(
      inspection.createdAt,
      inspection.id,
    ),
    inspectionStatus: inspection.inspectionStatus,
    inspectionWorksheet: worksheet,
    inspectionSummary: inspectionSummaryComputed,
    inspectionFinalizeDraft: parseFinalizeDraft(
      inspection.inspectionFinalizeDraft,
    ),
    inspectionResult,
    reInspection,
    reInspectionCompletedAt:
      inspection.reInspectionCompletedAt?.toISOString() ?? null,
    workshopRepairClosedAt:
      inspection.workshopRepairClosedAt?.toISOString() ?? null,
    inspectionCompletedAt:
      inspection.inspectionCompletedAt?.toISOString() ?? null,
    inspectionLastSavedAt:
      inspection.inspectionLastSavedAt?.toISOString() ?? null,
    inspectionSectionCatalog: FLEET_RETURN_INSPECTION_SECTION_CATALOG,
    expectedReturn: {
      closingReason: row.contractClosingReason,
      dueDate: row.contractExpectedReturnBy
        ? row.contractExpectedReturnBy.toISOString().slice(0, 10)
        : row.contractEndDate
          ? row.contractEndDate.toISOString().slice(0, 10)
          : null,
      depotLabel: row.contractReturnDepotLabel,
      handoverOdometer: inspection.handoverOdometer,
      leaseKmAllowance: inspection.leaseKmAllowance,
      keysHandedOver: inspection.keysHandedOver,
    },
    createdAt: inspection.createdAt.toISOString(),
  };
}

@Injectable()
export class FleetReturnsService {
  constructor(
    private readonly repo: FleetLeasingRepository,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => WorkOrdersService))
    private readonly workOrdersService: WorkOrdersService,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoices: InvoicesService,
    @Inject(DRIZZLE) private readonly db: AppDatabase,
  ) {}

  private buildWorkshopRepairClosedInspectionResult(
    stored: FleetReturnInspectionResultPresentation,
  ): FleetReturnInspectionResultPresentation {
    return {
      ...stored,
      jobCard: stored.jobCard
        ? { ...stored.jobCard, status: 'closed' }
        : stored.jobCard,
      timeline: stored.timeline.map((step) =>
        step.key === 'workshop' ? { ...step, state: 'done' as const } : step,
      ),
    };
  }

  private async persistWorkshopRepairClosed(params: {
    organizationId: string;
    userId: string;
    inspectionId: string;
    closedAt: Date;
    stored: FleetReturnInspectionResultPresentation;
    auditMetadata?: Record<string, unknown>;
  }): Promise<void> {
    const updatedResult = this.buildWorkshopRepairClosedInspectionResult(
      params.stored,
    );
    await this.repo.closeReturnWorkshopRepair({
      inspectionId: params.inspectionId,
      organizationId: params.organizationId,
      closedAt: params.closedAt,
      inspectionResult: updatedResult,
    });
    await this.audit.log({
      organizationId: params.organizationId,
      userId: params.userId,
      action: 'fleet_return.close_workshop_repair',
      resourceType: 'fleet_return_inspection',
      resourceId: params.inspectionId,
      status: 'SUCCESS',
      metadata: {
        closedAt: params.closedAt.toISOString(),
        ...params.auditMetadata,
      },
    });
  }

  /**
   * Called when a lease-return workshop work order is closed — idempotent.
   */
  async syncWorkshopRepairClosedFromWorkOrder(input: {
    organizationId: string;
    userId: string;
    workOrderId: string;
    closedAt: Date;
  }): Promise<void> {
    const inspectionId =
      await this.repo.findReturnInspectionIdForLeaseReturnWorkOrder(
        input.organizationId,
        input.workOrderId,
      );
    if (!inspectionId) return;

    const row = await this.repo.findReturnInspectionInOrg(
      input.organizationId,
      inspectionId,
    );
    if (!row) return;

    if (row.inspection.workshopRepairClosedAt) return;

    const stored = row.inspection
      .inspectionResult as FleetReturnInspectionResultPresentation | null;
    if (!stored || stored.outcome !== 'sent_to_workshop') return;

    await this.persistWorkshopRepairClosed({
      organizationId: input.organizationId,
      userId: input.userId,
      inspectionId,
      closedAt: input.closedAt,
      stored,
      auditMetadata: {
        source: 'workshop_work_order',
        workOrderId: input.workOrderId,
      },
    });
  }

  private async resolveWorkshopJobForReturn(params: {
    userId: string;
    organizationId: string;
    inspectionId: string;
    assetRegisterVehicleId: string | null;
    existingWorkshopJobId: string | null;
    existingWorkshopJobNumber: string | null;
    odometerReading: number;
    completedAt: Date;
    fleetCode: string;
    workshopTargetDate?: string | null;
  }): Promise<{ id: string; workOrderNumber: string } | null> {
    if (params.existingWorkshopJobId?.trim()) {
      const id = params.existingWorkshopJobId.trim();
      const workOrderNumber =
        params.existingWorkshopJobNumber?.trim() ||
        (
          await this.workOrdersService.getWorkOrderNumberInOrg(
            params.organizationId,
            id,
          )
        )?.workOrderNumber;
      if (!workOrderNumber) return null;
      return { id, workOrderNumber };
    }
    const vehicleId = params.assetRegisterVehicleId?.trim();
    if (!vehicleId) return null;

    const fromDraft = params.workshopTargetDate?.trim();
    let expectedCompletionDate: string;
    if (fromDraft && /^\d{4}-\d{2}-\d{2}$/.test(fromDraft)) {
      expectedCompletionDate = fromDraft;
    } else {
      const targetReady = new Date(params.completedAt);
      targetReady.setUTCDate(targetReady.getUTCDate() + 4);
      expectedCompletionDate = targetReady.toISOString().slice(0, 10);
    }

    return this.workOrdersService.ensureLeaseReturnWorkOrder({
      organizationId: params.organizationId,
      userId: params.userId,
      assetRegisterVehicleId: vehicleId,
      odometerReading: params.odometerReading,
      issueDescription: `Lease return repair — ${params.fleetCode.trim()}`,
      expectedCompletionDate,
      reportedBy: 'Lease return inspection',
    });
  }

  async list(query: ListFleetReturnsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      FLEET_RETURN_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      FLEET_RETURN_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.repo.listReturnInspections({
      organizationId: query.organizationId,
      page,
      pageSize,
      contractId: query.contractId,
      vehicleStatus: query.pipelineTab ? undefined : query.vehicleStatus,
      pipelineTab: query.pipelineTab,
      search: query.search,
      closingReason: query.closingReason,
      returnDepotLocationId: query.returnDepotLocationId,
      returnDepotLabel: query.returnDepotLabel,
      sort,
    });
    const items = rows.map((r) => {
      const expectedReturnDueDate =
        r.contractExpectedReturnBy ?? r.contractEndDate;
      return {
        id: r.inspection.id,
        organizationId: r.inspection.organizationId,
        contractId: r.inspection.contractId,
        contractNumber: r.contractNumber,
        contractStatus: r.contractStatus,
        contractClosingReason: r.contractClosingReason,
        contractEndDate: r.contractEndDate
          ? r.contractEndDate.toISOString().slice(0, 10)
          : null,
        expectedReturnDueDate: expectedReturnDueDate
          ? expectedReturnDueDate.toISOString().slice(0, 10)
          : null,
        clientName: r.clientName ?? '—',
        vehicleId: r.inspection.vehicleId,
        registrationNo: r.registrationNo,
        fleetCode: resolveFleetCode({
          assetRegisterFleetCode: r.assetRegisterFleetCode,
          registrationNo: r.registrationNo,
        }),
        assetClass: r.assetClass,
        vehicleStatus: r.vehicleStatus,
        inspectionStatus: r.inspection.inspectionStatus,
        odometerReading: r.inspection.odometerReading,
        registeredReturn: r.inspection.registeredReturn,
        receivedAt: r.inspection.receivedAt?.toISOString() ?? null,
        createdAt: r.inspection.createdAt.toISOString(),
        nextSteps: buildFleetReturnListNextSteps({
          vehicleStatus: r.vehicleStatus,
          inspectionStatus: r.inspection.inspectionStatus,
          expectedReturnDueDate: expectedReturnDueDate
            ? expectedReturnDueDate.toISOString().slice(0, 10)
            : null,
          registeredReturn: r.inspection.registeredReturn,
          workshopJobId: r.workshopJobId,
          workshopRepairClosed: Boolean(r.inspection.workshopRepairClosedAt),
          returnOnHold: fleetReturnListIsOnHold(r),
        }),
        inspectorDisplayName: r.inspectorDisplayName,
        workshopExpectedCompletionDate: r.workshopExpectedCompletionDate,
      };
    });
    const result = toPaginatedResult(items, page, pageSize, total);
    if (query.includeTabCounts) {
      const [tabCounts, depotFilterOptions, hubMetrics] = await Promise.all([
        this.repo.countReturnInspectionPipelineTabs({
          organizationId: query.organizationId,
          contractId: query.contractId,
          search: query.search,
          closingReason: query.closingReason,
          returnDepotLocationId: query.returnDepotLocationId,
          returnDepotLabel: query.returnDepotLabel,
        }),
        this.repo.listReturnDepotFilterOptions(query.organizationId),
        this.repo
          .countReturnReleasedThisMonth({
            organizationId: query.organizationId,
            contractId: query.contractId,
          })
          .then((releasedThisMonth): { releasedThisMonth: number } => ({
            releasedThisMonth,
          })),
      ]);
      return { ...result, tabCounts, depotFilterOptions, hubMetrics };
    }
    return result;
  }

  async getById(
    userId: string,
    organizationId: string,
    inspectionId: string,
    query?: Pick<
      GetFleetReturnDetailQueryDto,
      'previewOdometer' | 'previewConditionAtGlance'
    >,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    const detail = mapInspectionDetail(row);
    const presentation = buildFleetReturnDetailPresentation(detail, {
      previewOdometer: query?.previewOdometer,
      previewConditionAtGlance: query?.previewConditionAtGlance,
    });
    const enriched = await this.enrichInspectionDetail(
      userId,
      organizationId,
      row,
      detail,
    );
    return { ...enriched, ...presentation };
  }

  private async enrichInspectionDetail(
    userId: string,
    organizationId: string,
    row: NonNullable<
      Awaited<ReturnType<FleetLeasingRepository['findReturnInspectionInOrg']>>
    >,
    detail: ReturnType<typeof mapInspectionDetail>,
  ) {
    if (!detail.inspectionResult) {
      return {
        ...detail,
        assetRegisterVehicleId: row.assetRegisterVehicleId ?? null,
        assetClassId: row.assetClassId ?? null,
      };
    }

    let assetRegisterVehicleId = row.assetRegisterVehicleId?.trim() || null;
    let assetClassId = row.assetClassId?.trim() || null;
    const hadStoredRegisterLink = Boolean(assetRegisterVehicleId);
    if (!assetRegisterVehicleId) {
      const resolved = await this.repo.findAssetRegisterVehicleByFleetIdentity({
        organizationId,
        registrationNo: row.registrationNo,
        vin: row.vehicleVin,
        fleetCodeHint: detail.fleetCode,
      });
      if (resolved) {
        assetRegisterVehicleId = resolved.id;
        assetClassId = assetClassId ?? resolved.assetClassId;
      }
    }

    const contractId = detail.contractId;
    const [returnedCount, totalCount, contractsWaitingMap] = await Promise.all([
      this.repo.countRegisteredReturns(contractId),
      this.repo.countCommittedVehicles(contractId),
      assetClassId
        ? this.repo.countContractsWithUnallocatedDemandByAssetClassIds(
            organizationId,
            [assetClassId],
          )
        : Promise.resolve(new Map<string, number>()),
    ]);

    const contractsWaitingForAssetClass = assetClassId
      ? (contractsWaitingMap.get(assetClassId) ?? 0)
      : 0;

    const isClosing =
      row.contractClosingReason != null ||
      row.contractStatus === 'pending_termination';
    const contractClosingProgress = isClosing
      ? { returnedCount, totalCount }
      : null;

    let reInspectorDisplayName: string | null = null;
    const timelineStep = detail.inspectionResult.timeline.find(
      (s) => s.key === 'reinspect' && s.state === 'done',
    );
    if (timelineStep?.detail) {
      const parts = timelineStep.detail.split('·');
      const namePart = parts[parts.length - 1]?.trim();
      if (namePart && !namePart.match(/^\d/)) {
        reInspectorDisplayName = namePart;
      }
    }

    const storedWorkshopJobId = resolveFleetReturnWorkshopJobId(
      row.workshopJobId,
      detail.inspectionResult.jobCard?.workshopJobId,
      detail.inspectionResult.availableActions.find(
        (a) => a.actionKey === 'open_workshop',
      )?.workshopJobId,
    );
    let workshopJobId = storedWorkshopJobId;
    let workshopWorkOrderNumber = row.workshopWorkOrderNumber ?? null;
    if (
      detail.inspectionResult.outcome === 'sent_to_workshop' &&
      !isFleetReturnWorkshopJobId(workshopJobId) &&
      assetRegisterVehicleId
    ) {
      const lazyFinalizeDraft = parseFinalizeDraft(
        row.inspection.inspectionFinalizeDraft,
      );
      const linked = await this.resolveWorkshopJobForReturn({
        userId,
        organizationId,
        inspectionId: row.inspection.id,
        assetRegisterVehicleId,
        existingWorkshopJobId: null,
        existingWorkshopJobNumber: null,
        odometerReading: row.inspection.odometerReading,
        completedAt: row.inspection.inspectionCompletedAt ?? new Date(),
        fleetCode: detail.fleetCode,
        workshopTargetDate: lazyFinalizeDraft.workshopTargetDate,
      });
      if (linked) {
        workshopJobId = linked.id;
        workshopWorkOrderNumber = linked.workOrderNumber;
      }
    }

    let inspectionResult = enrichFleetReturnInspectionResult(
      detail.inspectionResult,
      {
        fleetLabel: detail.fleetCode || detail.registrationNo,
        assetClassName: row.assetClass,
        assetClassId,
        assetRegisterVehicleId,
        vehicleStatus: row.vehicleStatus,
        contractsWaitingForAssetClass,
        contractClosingProgress,
        reInspectionCompletedAt: row.inspection.reInspectionCompletedAt,
        workshopRepairClosedAt: row.inspection.workshopRepairClosedAt,
        workshopJobId,
        workshopWorkOrderNumber,
        reInspectorDisplayName,
        contractStatus: row.contractStatus,
        contractClosingReason: row.contractClosingReason,
        inspectionCompletedAt:
          row.inspection.inspectionCompletedAt ?? new Date(),
        receivedAt: row.inspection.receivedAt,
        odometerReading: row.inspection.odometerReading,
        depotLabel: row.contractReturnDepotLabel,
        contractExpectedReturnBy: row.contractExpectedReturnBy,
        contractEndDate: row.contractEndDate,
        inspectionCreatedAt: row.inspection.createdAt,
      },
    );

    if (row.inspection.financeRecoveryInvoiceId && inspectionResult) {
      const finance = await this.invoices.getRecoveryInvoiceSummaryForReturn(
        organizationId,
        row.inspection.financeRecoveryInvoiceId,
      );
      if (finance) {
        inspectionResult = applyFinanceRecoveryToInspectionResult(
          inspectionResult,
          finance,
        );
      }
    }

    const openWorkshopAfter = inspectionResult?.availableActions.find(
      (a) => a.actionKey === 'open_workshop',
    );
    const shouldPersistWorkshopLink =
      inspectionResult &&
      !storedWorkshopJobId &&
      isFleetReturnWorkshopJobId(openWorkshopAfter?.workshopJobId);
    const assignAfter = inspectionResult?.availableActions.find(
      (a) => a.actionKey === 'assign_contract',
    );
    const historyAfter = inspectionResult?.availableActions.find(
      (a) => a.actionKey === 'vehicle_history',
    );
    const shouldPersistRegisterLink =
      inspectionResult &&
      !hadStoredRegisterLink &&
      Boolean(assetRegisterVehicleId) &&
      (assignAfter?.enabled === true || historyAfter?.enabled === true);

    if (shouldPersistWorkshopLink || shouldPersistRegisterLink) {
      await this.repo.patchReturnInspectionResult({
        organizationId,
        inspectionId: row.inspection.id,
        inspectionResult,
      });
    }

    return {
      ...detail,
      assetRegisterVehicleId,
      assetClassId,
      financeRecoveryInvoiceId: row.inspection.financeRecoveryInvoiceId ?? null,
      inspectionResult,
    };
  }

  async receiveReturn(
    userId: string,
    organizationId: string,
    inspectionId: string,
    dto: ReceiveReturnDto,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    const { inspection } = row;
    if (inspection.registeredReturn) {
      throw new BadRequestException('Vehicle return was already received');
    }
    if (row.vehicleStatus !== 'return_pending') {
      throw new BadRequestException(
        'Vehicle must be in return pending status to receive at gate',
      );
    }
    const handoverOdometer =
      inspection.handoverOdometer ?? inspection.odometerReading;
    if (dto.odometerReading < handoverOdometer) {
      throw new BadRequestException(
        'Odometer reading cannot be less than handover odometer',
      );
    }
    const keysHandedOver = inspection.keysHandedOver ?? 0;
    if (dto.keysReceived > keysHandedOver) {
      throw new BadRequestException(
        'Keys received cannot exceed keys handed over at lease start',
      );
    }
    const receivedAt = new Date(dto.receivedAt);
    if (Number.isNaN(receivedAt.getTime())) {
      throw new BadRequestException('Invalid received at timestamp');
    }
    const documentConditionChecklist: Record<string, 'pass' | 'fail'> = {
      rc_book: dto.documentsChecklist.rcBook ? 'pass' : 'fail',
      insurance_copy: dto.documentsChecklist.insuranceCopy ? 'pass' : 'fail',
      puc_certificate: dto.documentsChecklist.pucCertificate ? 'pass' : 'fail',
      goods_permit: dto.documentsChecklist.goodsPermit ? 'pass' : 'fail',
    };
    await this.repo.completeReturnGateIn({
      inspectionId,
      organizationId,
      vehicleId: inspection.vehicleId,
      odometerReading: dto.odometerReading,
      values: {
        receivedAt,
        receivedByUserId: userId,
        receivedByEmployeeId: dto.receivedByEmployeeId ?? null,
        broughtInBy: dto.broughtInBy.trim(),
        fuelLevel: dto.fuelLevel,
        keysReceived: dto.keysReceived,
        documentsChecklist: dto.documentsChecklist,
        gatePhotos: dto.gatePhotos,
        conditionAtGlance: dto.conditionAtGlance,
        gateNote: dto.gateNote?.trim() || null,
        inspectImmediately: dto.inspectImmediately,
        conditionChecklist: {
          ...(typeof inspection.conditionChecklist === 'object' &&
          inspection.conditionChecklist !== null
            ? inspection.conditionChecklist
            : {}),
          ...documentConditionChecklist,
        },
      },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'fleet_return.receive',
      resourceType: 'fleet_return_inspection',
      resourceId: inspectionId,
      status: 'SUCCESS',
      metadata: {
        vehicleId: inspection.vehicleId,
        contractId: inspection.contractId,
        inspectImmediately: dto.inspectImmediately,
      },
    });
    return this.getById(userId, organizationId, inspectionId);
  }

  async saveInspectionWorksheet(
    userId: string,
    organizationId: string,
    inspectionId: string,
    dto: SaveReturnInspectionDto,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    const { inspection } = row;
    if (!inspection.registeredReturn) {
      throw new BadRequestException(
        'Vehicle must be received at gate before inspection',
      );
    }
    if (row.vehicleStatus !== 'returned') {
      throw new BadRequestException(
        'Detailed inspection applies only while vehicle status is returned',
      );
    }
    if (inspection.inspectionStatus === 'completed') {
      throw new BadRequestException('Inspection is already completed');
    }
    if (inspection.inspectionStatus === 'ready_to_finalize') {
      throw new BadRequestException(
        'Checklist is ready to finalize — use the inspection finalize screen',
      );
    }

    const existing = mergeWorksheetWithCatalog(
      inspection.inspectionWorksheet as FleetReturnInspectionWorksheet | null,
    );
    const worksheet = sanitizeIncomingWorksheet(dto, existing);
    const handoverOdometer =
      inspection.handoverOdometer ?? inspection.odometerReading;
    const summary = computeInspectionSummary(worksheet, {
      odometerReading: inspection.odometerReading,
      handoverOdometer,
      leaseKmAllowance: inspection.leaseKmAllowance,
    });

    const damageLineMessage =
      firstInspectionWorksheetValidationMessage(worksheet);
    if (damageLineMessage) {
      throw new BadRequestException(damageLineMessage);
    }

    const complete = dto.complete === true;
    if (complete && !worksheetIsComplete(worksheet)) {
      throw new BadRequestException(
        'All checklist items must be rated before completing inspection',
      );
    }

    const now = new Date();
    if (complete) {
      await this.repo.saveReturnInspectionWorksheet({
        inspectionId,
        organizationId,
        worksheet,
        summary,
        inspectionStatus: 'ready_to_finalize',
        lastSavedAt: now,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'fleet_return.ready_to_finalize_inspection',
        resourceType: 'fleet_return_inspection',
        resourceId: inspectionId,
        status: 'SUCCESS',
        metadata: {
          majorCount: summary.majorCount,
          minorCount: summary.minorCount,
        },
      });
    } else {
      await this.repo.saveReturnInspectionWorksheet({
        inspectionId,
        organizationId,
        worksheet,
        summary,
        inspectionStatus: 'in_progress',
        lastSavedAt: now,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'fleet_return.save_inspection',
        resourceType: 'fleet_return_inspection',
        resourceId: inspectionId,
        status: 'SUCCESS',
        metadata: { currentSectionIndex: worksheet.currentSectionIndex },
      });
    }

    return this.getById(userId, organizationId, inspectionId);
  }

  async finalizeReturnInspection(
    userId: string,
    organizationId: string,
    inspectionId: string,
    dto: FinalizeReturnInspectionDto,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    const { inspection } = row;
    if (!inspection.registeredReturn) {
      throw new BadRequestException(
        'Vehicle must be received at gate before inspection',
      );
    }
    if (inspection.inspectionStatus !== 'ready_to_finalize') {
      throw new BadRequestException(
        'Complete the inspection checklist before finalizing',
      );
    }
    if (row.vehicleStatus !== 'returned') {
      throw new BadRequestException(
        'Finalize applies only while vehicle status is returned',
      );
    }

    const worksheet = mergeWorksheetWithCatalog(
      inspection.inspectionWorksheet as FleetReturnInspectionWorksheet | null,
    );
    if (!worksheetIsComplete(worksheet)) {
      throw new BadRequestException(
        'Inspection checklist is incomplete — return to the worksheet',
      );
    }

    const handoverOdometer =
      inspection.handoverOdometer ?? inspection.odometerReading;
    const summary = computeInspectionSummary(worksheet, {
      odometerReading: inspection.odometerReading,
      handoverOdometer,
      leaseKmAllowance: inspection.leaseKmAllowance,
    });

    const existingDraft = parseFinalizeDraft(
      inspection.inspectionFinalizeDraft,
    );
    const finalizeDraft = mergeFinalizeDtoIntoDraft(existingDraft, dto);
    const complete = dto.complete === true;
    const now = new Date();

    if (complete) {
      if (!finalizeDraft.disposition) {
        throw new BadRequestException('Select a disposition before completing');
      }
      if (!finalizeDraft.inspectorConfirmed) {
        throw new BadRequestException(
          'Confirm you have reviewed charges and disposition',
        );
      }
      if (
        finalizeDraft.disposition === 'send_to_workshop' &&
        finalizeDraft.workshopTargetDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(finalizeDraft.workshopTargetDate)
      ) {
        throw new BadRequestException(
          'Workshop target date must be YYYY-MM-DD',
        );
      }

      const vehicleStatus = resolveVehicleStatusForFinalize(
        finalizeDraft.disposition,
      );
      const fleetCode = resolveFleetCode({
        assetRegisterFleetCode: row.assetRegisterFleetCode,
        registrationNo: row.registrationNo,
      });
      let workshopJobId: string | null = row.workshopJobId ?? null;
      let workshopJobDisplayNumber: string | null =
        row.workshopWorkOrderNumber ?? null;
      if (finalizeDraft.disposition === 'send_to_workshop') {
        const linked = await this.resolveWorkshopJobForReturn({
          userId,
          organizationId,
          inspectionId,
          assetRegisterVehicleId: row.assetRegisterVehicleId ?? null,
          existingWorkshopJobId: workshopJobId,
          existingWorkshopJobNumber: workshopJobDisplayNumber,
          odometerReading: inspection.odometerReading,
          completedAt: now,
          fleetCode,
          workshopTargetDate: finalizeDraft.workshopTargetDate,
        });
        if (linked) {
          workshopJobId = linked.id;
          workshopJobDisplayNumber = linked.workOrderNumber;
        }
      }

      let inspectionResult = buildFleetReturnInspectionResult({
        inspectionId,
        inspectionCreatedAt: inspection.createdAt,
        inspectionCompletedAt: now,
        receivedAt: inspection.receivedAt,
        odometerReading: inspection.odometerReading,
        fleetCode,
        registrationNo: row.registrationNo,
        clientName: row.clientName ?? '—',
        contractNumber: row.contractNumber,
        contractStatus: row.contractStatus,
        contractClosingReason: row.contractClosingReason,
        contractExpectedReturnBy: row.contractExpectedReturnBy,
        contractEndDate: row.contractEndDate,
        depotLabel: row.contractReturnDepotLabel,
        vehicleStatus,
        workshopJobId,
        workshopJobDisplayNumber,
        worksheet,
        summary,
        finalize: finalizeDraft,
      });

      const recoveryTotalMinor = inspectionResult.recoveryNote.totalMinor;
      let financeRecoveryInvoiceId: string | null = null;

      await this.db.transaction(async (tx) => {
        if (recoveryTotalMinor > 0) {
          const financeInvoice =
            await this.invoices.createFleetReturnRecoveryInvoice(
              {
                organizationId,
                fleetReturnInspectionId: inspectionId,
                leaseContractId: row.contractId,
                contractNumber: row.contractNumber,
                fleetCode,
                partyName: row.clientName ?? '—',
                organisationClientId:
                  (await this.resolveOrganisationClientIdForRecoveryBilling(
                    organizationId,
                    row.organisationClientId ?? null,
                    row.contractId,
                  )) ?? null,
                invoiceDate: now.toISOString().slice(0, 10),
                recoveryLines: inspectionResult.recoveryNote.lines,
                totalAmountMinor: recoveryTotalMinor,
              },
              userId,
              tx,
            );
          financeRecoveryInvoiceId = financeInvoice.id;
          inspectionResult = applyFinanceRecoveryToInspectionResult(
            inspectionResult,
            {
              invoiceId: financeInvoice.id,
              invoiceNumber: financeInvoice.invoiceNumber,
              status: financeInvoice.status,
            },
          );
        }

        await this.repo.completeReturnInspection({
          inspectionId,
          organizationId,
          vehicleId: inspection.vehicleId,
          worksheet,
          summary,
          inspectionResult,
          finalizeDraft,
          inspectedByUserId: userId,
          completedAt: now,
          vehicleStatus,
          financeRecoveryInvoiceId,
          tx,
        });
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'fleet_return.complete_inspection',
        resourceType: 'fleet_return_inspection',
        resourceId: inspectionId,
        status: 'SUCCESS',
        metadata: {
          disposition: finalizeDraft.disposition,
          majorCount: summary.majorCount,
          minorCount: summary.minorCount,
          vehicleStatus,
          recoveryWaived: finalizeDraft.waiveAllRecovery,
          financeRecoveryInvoiceId,
          recoveryTotalMinor,
        },
      });
    } else {
      await this.repo.saveReturnInspectionFinalizeDraft({
        inspectionId,
        organizationId,
        finalizeDraft,
        lastSavedAt: now,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'fleet_return.save_inspection_finalize',
        resourceType: 'fleet_return_inspection',
        resourceId: inspectionId,
        status: 'SUCCESS',
        metadata: { disposition: finalizeDraft.disposition ?? null },
      });
    }

    return this.getById(userId, organizationId, inspectionId);
  }

  async closeWorkshopRepair(
    userId: string,
    organizationId: string,
    inspectionId: string,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    if (row.vehicleStatus !== 'workshop') {
      throw new BadRequestException(
        'Workshop repair can only be closed while vehicle is in workshop',
      );
    }
    if (row.inspection.inspectionStatus !== 'completed') {
      throw new BadRequestException(
        'Initial return inspection must be completed first',
      );
    }
    const stored = row.inspection
      .inspectionResult as FleetReturnInspectionResultPresentation | null;
    if (!stored || stored.outcome !== 'sent_to_workshop') {
      throw new BadRequestException(
        'Workshop repair close applies only to workshop send-off outcomes',
      );
    }
    if (row.inspection.workshopRepairClosedAt) {
      return this.getById(userId, organizationId, inspectionId);
    }
    const closedAt = new Date();
    await this.persistWorkshopRepairClosed({
      organizationId,
      userId,
      inspectionId,
      closedAt,
      stored,
      auditMetadata: { source: 'manual_api' },
    });
    return this.getById(userId, organizationId, inspectionId);
  }

  async startReInspection(
    userId: string,
    organizationId: string,
    inspectionId: string,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    const detail = mapInspectionDetail(row);
    if (!detail.reInspection.eligible) {
      throw new BadRequestException(
        detail.reInspection.reasonIneligible ??
          'Re-inspection is not available for this return',
      );
    }
    if (detail.reInspection.status === 'completed') {
      throw new BadRequestException('Re-inspection is already completed');
    }
    if (
      detail.reInspection.status === 'in_progress' &&
      detail.reInspection.worksheet
    ) {
      return detail;
    }
    const summary = (row.inspection.inspectionSummary as {
      repairEstimateMinor?: number;
    } | null) ?? { repairEstimateMinor: 0 };
    const worksheet = buildInitialReInspectionWorksheet(
      detail.inspectionWorksheet,
      detail.odometerReading,
      summary.repairEstimateMinor ?? 0,
    );
    const startedAt = new Date();
    await this.repo.startReturnReInspection({
      inspectionId,
      organizationId,
      worksheet,
      startedAt,
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'fleet_return.start_re_inspection',
      resourceType: 'fleet_return_inspection',
      resourceId: inspectionId,
      status: 'SUCCESS',
    });
    return this.getById(userId, organizationId, inspectionId);
  }

  private mergeReInspectionDto(
    existing: FleetReturnReInspectionWorksheet,
    dto: SaveReInspectionDto,
  ): FleetReturnReInspectionWorksheet {
    const byKey = new Map(dto.items.map((i) => [i.itemKey, i.rating]));
    return {
      ...existing,
      items: existing.items.map((item) => ({
        ...item,
        rating: byKey.get(item.itemKey) ?? item.rating,
      })),
      poolChecklist: { ...dto.poolChecklist },
      odometerAfterRoadTest: dto.odometerAfterRoadTest,
      selectedOutcome: dto.selectedOutcome ?? existing.selectedOutcome,
      workshopActualCostMinor:
        dto.workshopActualCostMinor ?? existing.workshopActualCostMinor,
    };
  }

  async saveReInspection(
    userId: string,
    organizationId: string,
    inspectionId: string,
    dto: SaveReInspectionDto,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    const detail = mapInspectionDetail(row);
    if (
      !detail.reInspection.eligible &&
      detail.reInspection.status !== 'in_progress'
    ) {
      throw new BadRequestException(
        detail.reInspection.reasonIneligible ??
          'Re-inspection is not available for this return',
      );
    }
    const baseWorksheet =
      (row.inspection
        .reInspectionWorksheet as FleetReturnReInspectionWorksheet | null) ??
      buildInitialReInspectionWorksheet(
        detail.inspectionWorksheet,
        detail.odometerReading,
        detail.reInspection.outcomeSummary.workshopCostEstimateMinor ?? 0,
      );
    const worksheet = this.mergeReInspectionDto(baseWorksheet, dto);
    const complete = dto.complete === true;
    if (complete) {
      if (dto.selectedOutcome === 'back_to_workshop') {
        throw new BadRequestException(
          'Send back to workshop from re-inspection is not wired yet',
        );
      }
      if (!reInspectionWorksheetIsComplete(worksheet)) {
        throw new BadRequestException(
          'All repaired items must pass and pool checklist must be complete',
        );
      }
      const stored = row.inspection
        .inspectionResult as FleetReturnInspectionResultPresentation | null;
      if (!stored) {
        throw new BadRequestException('Missing inspection result snapshot');
      }
      const completedAt = new Date();
      const actualMinor =
        worksheet.workshopActualCostMinor ?? stored.metrics.repairCostMinor;
      const labelMap = await this.repo.findUserDisplayLabels([userId]);
      const mergedResult = mergeReInspectionIntoInspectionResult(
        stored,
        completedAt,
        actualMinor,
        {
          reInspectorDisplayName: labelMap.get(userId) ?? 'Fleet inspector',
        },
      );
      await this.repo.saveReturnReInspection({
        inspectionId,
        organizationId,
        worksheet,
        status: 'completed',
        completedAt,
        odometerReading: worksheet.odometerAfterRoadTest ?? undefined,
        inspectionResult: mergedResult,
        vehicleId: row.inspection.vehicleId,
        vehicleStatus: 'available',
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'fleet_return.complete_re_inspection',
        resourceType: 'fleet_return_inspection',
        resourceId: inspectionId,
        status: 'SUCCESS',
        metadata: { odometerAfterRoadTest: worksheet.odometerAfterRoadTest },
      });
    } else {
      await this.repo.saveReturnReInspection({
        inspectionId,
        organizationId,
        worksheet,
        status: 'in_progress',
        completedAt: null,
        odometerReading: worksheet.odometerAfterRoadTest ?? undefined,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'fleet_return.save_re_inspection',
        resourceType: 'fleet_return_inspection',
        resourceId: inspectionId,
        status: 'SUCCESS',
      });
    }
    return this.getById(userId, organizationId, inspectionId);
  }

  /**
   * Resolve return hold — reopens finalize (ready_to_finalize) while vehicle stays returned.
   * Worksheet and charge draft are kept; disposition and inspector confirmation are cleared.
   */
  async resolveReturnHold(
    userId: string,
    organizationId: string,
    inspectionId: string,
    dto: ResolveReturnHoldDto,
  ) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    if (row.vehicleStatus !== 'returned') {
      throw new BadRequestException(
        'Hold resolution applies only while vehicle status is returned',
      );
    }
    if (row.inspection.inspectionStatus !== 'completed') {
      throw new BadRequestException(
        'Return is not on hold — inspection is not completed with on_hold disposition',
      );
    }
    const stored = row.inspection
      .inspectionResult as FleetReturnInspectionResultPresentation | null;
    if (!stored || stored.outcome !== 'on_hold') {
      throw new BadRequestException(
        'Return is not on hold — only on_hold dispositions can be resolved here',
      );
    }

    const existingDraft = parseFinalizeDraft(
      row.inspection.inspectionFinalizeDraft,
    );
    if (existingDraft.disposition !== 'on_hold') {
      throw new BadRequestException(
        'Finalize draft does not match on_hold disposition',
      );
    }

    const now = new Date();
    const resultBeforeClear = appendHoldResolvedToInspectionResult(stored, now);
    const reopenedDraft: FleetReturnInspectionFinalizeDraft = {
      ...existingDraft,
      disposition: null,
      inspectorConfirmed: false,
    };

    await this.repo.reopenReturnInspectionAfterHoldResolved({
      inspectionId,
      organizationId,
      finalizeDraft: reopenedDraft,
      reopenedAt: now,
    });

    const note = dto.resolutionNote?.trim();
    await this.audit.log({
      organizationId,
      userId,
      action: 'fleet_return.resolve_hold',
      resourceType: 'fleet_return_inspection',
      resourceId: inspectionId,
      status: 'SUCCESS',
      metadata: {
        priorOutcome: stored.outcome,
        timelineKeys: resultBeforeClear.timeline.map((s) => s.key),
        ...(note ? { resolutionNote: note } : {}),
      },
    });

    return this.getById(userId, organizationId, inspectionId);
  }

  private async resolveOrganisationClientIdForRecoveryBilling(
    organizationId: string,
    organisationClientIdFromJoin: string | null,
    leaseContractId: string,
  ): Promise<string | null> {
    if (organisationClientIdFromJoin) {
      return organisationClientIdFromJoin;
    }
    const contract = await this.repo.findContractInOrg(
      organizationId,
      leaseContractId,
    );
    if (!contract?.clientId) {
      return null;
    }
    const fleetClient = await this.repo.getClientInOrg(
      organizationId,
      contract.clientId,
    );
    return fleetClient?.organisationClientId ?? null;
  }
}
