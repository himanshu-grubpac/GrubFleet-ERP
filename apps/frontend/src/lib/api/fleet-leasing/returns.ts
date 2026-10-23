import { apiFetch } from '../client';
import { appendListSortSearchParams } from '@/lib/query/list-sort-params';

export type FleetReturnVehicleStatus =
    | 'available'
    | 'inbound'
    | 'reserved'
    | 'leased'
    | 'return_pending'
    | 'returned'
    | 'workshop'
    | 'sold'
    | 'retired';

export type FleetReturnInspectionStatus =
    | 'not_started'
    | 'in_progress'
    | 'ready_to_finalize'
    | 'completed';

export type FleetReturnNextStepActionKey =
    | 'remind_client'
    | 'receive'
    | 'start_inspection'
    | 'continue_inspection'
    | 'finalize_inspection'
    | 'reinspect'
    | 'view_inspection_result'
    | 'view_job'
    | 'resolve_hold';

export type FleetReturnNextStepVariant = 'primary' | 'secondary' | 'ghost';

export interface FleetReturnNextStepPresentation {
    actionKey: FleetReturnNextStepActionKey;
    label: string;
    variant: FleetReturnNextStepVariant;
    enabled: boolean;
    reasonDisabled?: string;
    workshopJobId?: string | null;
}

export type FleetReturnFuelLevel =
    | 'empty'
    | 'quarter'
    | 'half'
    | 'three_quarter'
    | 'full';

export type FleetReturnConditionAtGlance =
    | 'looks_fine'
    | 'visible_damage';

export interface FleetReturnListItem {
    id: string;
    organizationId: string;
    contractId: string;
    contractNumber: string;
    contractStatus: string;
    contractClosingReason: string | null;
    contractEndDate: string | null;
    expectedReturnDueDate: string | null;
    clientName: string;
    vehicleId: string;
    registrationNo: string;
    fleetCode: string;
    assetClass: string;
    vehicleStatus: FleetReturnVehicleStatus;
    inspectionStatus: FleetReturnInspectionStatus;
    odometerReading: number;
    registeredReturn: boolean;
    receivedAt: string | null;
    createdAt: string;
    nextSteps?: FleetReturnNextStepPresentation[];
    inspectorDisplayName?: string | null;
    workshopExpectedCompletionDate?: string | null;
}

export interface FleetReturnDocumentsChecklist {
    rcBook: boolean;
    insuranceCopy: boolean;
    pucCertificate: boolean;
    goodsPermit: boolean;
}

export interface FleetReturnGatePhoto {
    slot: 'front' | 'rear' | 'left' | 'right';
    capturedAt: string;
    label?: string;
}

export interface FleetReturnExpectedReturn {
    closingReason: string | null;
    dueDate: string | null;
    depotLabel: string | null;
    handoverOdometer: number | null;
    leaseKmAllowance: number | null;
    keysHandedOver: number | null;
}

export type FleetReturnInspectionItemRating =
    | 'unchecked'
    | 'pass'
    | 'minor'
    | 'major';

export type FleetReturnInspectionAttribution =
    | 'client_damage'
    | 'wear_tear'
    | 'pre_existing'
    | 'missing';

export type FleetReturnInspectionSectionId =
    | 'documents_keys'
    | 'glass_mirrors_lights'
    | 'exterior_body'
    | 'tyres_wheels'
    | 'interior_cabin'
    | 'cargo_box'
    | 'engine_fluids'
    | 'brakes_suspension'
    | 'electricals_battery'
    | 'branding_accessories';

export interface FleetReturnInspectionCatalogItem {
    key: string;
    label: string;
}

export interface FleetReturnInspectionSectionCatalog {
    id: FleetReturnInspectionSectionId;
    title: string;
    items: FleetReturnInspectionCatalogItem[];
}

export interface FleetReturnInspectionLineItemState {
    rating: FleetReturnInspectionItemRating;
    note?: string;
    attribution?: FleetReturnInspectionAttribution;
    repairCostMinor?: number;
    photoCount?: number;
}

export interface FleetReturnInspectionWorksheet {
    currentSectionIndex: number;
    sections: Partial<
        Record<
            FleetReturnInspectionSectionId,
            Record<string, FleetReturnInspectionLineItemState>
        >
    >;
}

export interface FleetReturnInspectionSummary {
    majorCount: number;
    minorCount: number;
    missingCount: number;
    excessKm: number;
    repairEstimateMinor: number;
}

export type FleetReturnInspectionResultOutcome =
    | 'sent_to_workshop'
    | 'ready_to_lease'
    | 'on_hold'
    | 'retired';

export type FleetReturnInspectionDisposition =
    | 'ready_to_lease'
    | 'send_to_workshop'
    | 'on_hold'
    | 'retire';

export type FleetReturnWorkshopPriority = 'normal' | 'high' | 'urgent';

export type FleetReturnInspectionFinalizeDraft = {
    disposition: FleetReturnInspectionDisposition | null;
    issueCharges: Record<string, boolean>;
    waiveAllRecovery: boolean;
    inspectorConfirmed: boolean;
    wearAndTearNote?: string;
    workshopPriority?: FleetReturnWorkshopPriority;
    workshopTargetDate?: string;
};

export type FleetReturnInspectionResultActionKey =
    | 'back_to_list'
    | 'next_to_inspect'
    | 'open_workshop'
    | 'close_workshop_repair'
    | 'assign_contract'
    | 'vehicle_history';

export interface FleetReturnContractClosingProgress {
    returnedCount: number;
    totalCount: number;
}

export interface FleetReturnAssignmentPoolBanner {
    contractsWaitingCount: number;
    assetClassName: string;
}

export interface FleetReturnInspectionResultPresentation {
    outcome: FleetReturnInspectionResultOutcome;
    generatedAt: string;
    jobCard: {
        displayNumber: string;
        status: 'open' | 'closed';
        workshopJobId: string | null;
        depotLabel: string | null;
        priority: FleetReturnWorkshopPriority;
        targetReadyDate: string | null;
        tasks: Array<{ label: string; status: 'todo' | 'done' }>;
    } | null;
    recoveryNote: {
        displayNumber: string;
        status:
            | 'none'
            | 'waiting_for_finance'
            | 'unpaid'
            | 'partially_paid'
            | 'paid'
            | 'cancelled';
        financeInvoiceId?: string | null;
        financeInvoiceStatus?:
            | 'unpaid'
            | 'partially_paid'
            | 'paid'
            | 'cancelled'
            | null;
        lines: Array<{ label: string; amountMinor: number }>;
        totalMinor: number;
        billedToClientName: string;
        contractFootnote: string;
    };
    timeline: Array<{
        key: string;
        label: string;
        detail: string;
        state: 'done' | 'active' | 'pending';
    }>;
    metrics: {
        offLeaseDays: number | null;
        repairCostMinor: number;
        recoveryTotalMinor: number;
    };
    statusBanner: { level: 'success' | 'info'; message: string } | null;
    contractClosingProgress: FleetReturnContractClosingProgress | null;
    assignmentPoolBanner: FleetReturnAssignmentPoolBanner | null;
    availableActions: Array<{
        actionKey: FleetReturnInspectionResultActionKey;
        label: string;
        variant: 'primary' | 'secondary' | 'ghost';
        enabled: boolean;
        reasonDisabled?: string;
        workshopJobId?: string | null;
        assetRegisterVehicleId?: string | null;
    }>;
}

export type FleetReturnReInspectionStatus =
    | 'not_started'
    | 'in_progress'
    | 'completed';

export type FleetReturnReInspectionItemRating = 'pass' | 'minor' | 'major';

export type FleetReturnReInspectionOutcome =
    | 'ready_to_lease'
    | 'back_to_workshop';

export interface FleetReturnReInspectionWorksheetItem {
    itemKey: string;
    sectionId: FleetReturnInspectionSectionId;
    label: string;
    priorRating: 'minor' | 'major';
    priorDetail: string;
    rating: FleetReturnReInspectionItemRating;
}

export interface FleetReturnReInspectionPoolChecklist {
    roadTestDone: boolean;
    washedCleaned: boolean;
    fuelLevelChecked: boolean;
    insuranceValidAck: boolean;
    pucValidAck: boolean;
}

export interface FleetReturnReInspectionWorksheet {
    items: FleetReturnReInspectionWorksheetItem[];
    poolChecklist: FleetReturnReInspectionPoolChecklist;
    odometerAfterRoadTest: number | null;
    selectedOutcome: FleetReturnReInspectionOutcome | null;
    workshopActualCostMinor: number | null;
}

export type FleetReturnContextBannerLevel = 'info' | 'warning';

export interface FleetReturnContextBanner {
    level: FleetReturnContextBannerLevel;
    message: string;
}

export interface FleetReturnFlowGuards {
    inspectWorksheetView: FleetReturnContextBanner | null;
    inspectResultView: FleetReturnContextBanner | null;
    reInspectView: FleetReturnContextBanner | null;
}

export interface FleetReturnReInspectionPresentation {
    status: FleetReturnReInspectionStatus;
    displayNumber: string;
    eligible: boolean;
    reasonIneligible?: string;
    statusBanner: { level: 'info' | 'warning'; message: string } | null;
    jobCardDisplayNumber: string | null;
    jobCardClosedAt: string | null;
    worksheet: FleetReturnReInspectionWorksheet | null;
    outcomeSummary: {
        workshopCostActualMinor: number | null;
        workshopCostEstimateMinor: number | null;
        recoveryNoteUnchanged: boolean;
    };
    availableActions: Array<{
        actionKey: 'save_exit' | 'mark_ready_to_lease';
        label: string;
        variant: 'primary' | 'secondary';
        enabled: boolean;
        reasonDisabled?: string;
    }>;
}

export interface SaveReInspectionPayload {
    items: Array<{
        itemKey: string;
        sectionId: FleetReturnInspectionSectionId;
        rating: FleetReturnReInspectionItemRating;
    }>;
    poolChecklist: FleetReturnReInspectionPoolChecklist;
    odometerAfterRoadTest: number;
    selectedOutcome?: FleetReturnReInspectionOutcome;
    workshopActualCostMinor?: number;
    complete?: boolean;
}

export interface FleetReturnInspectionDetail {
    id: string;
    organizationId: string;
    contractId: string;
    contractNumber: string;
    contractStatus: string;
    clientName: string;
    vehicleId: string;
    registrationNo: string;
    fleetCode: string;
    assetClass: string;
    vehicleStatus: FleetReturnVehicleStatus;
    vehicleOdometer: number;
    odometerReading: number;
    registeredReturn: boolean;
    receivedAt: string | null;
    receivedByEmployeeId: string | null;
    broughtInBy: string | null;
    fuelLevel: FleetReturnFuelLevel | null;
    keysReceived: number | null;
    keysHandedOver: number | null;
    handoverOdometer: number | null;
    leaseKmAllowance: number | null;
    documentsChecklist: FleetReturnDocumentsChecklist | null;
    gatePhotos: FleetReturnGatePhoto[] | null;
    conditionAtGlance: FleetReturnConditionAtGlance | null;
    gateNote: string | null;
    inspectImmediately: boolean | null;
    inspectionDisplayNumber: string;
    inspectionStatus: FleetReturnInspectionStatus;
    inspectionWorksheet: FleetReturnInspectionWorksheet;
    inspectionSummary: FleetReturnInspectionSummary | null;
    inspectionFinalizeDraft: FleetReturnInspectionFinalizeDraft;
    inspectionCompletedAt: string | null;
    inspectionLastSavedAt: string | null;
    inspectionSectionCatalog: FleetReturnInspectionSectionCatalog[];
    inspectionResult: FleetReturnInspectionResultPresentation | null;
    reInspection: FleetReturnReInspectionPresentation;
    reInspectionCompletedAt: string | null;
    workshopRepairClosedAt: string | null;
    expectedReturn: FleetReturnExpectedReturn;
    assetRegisterVehicleId: string | null;
    assetClassId: string | null;
    financeRecoveryInvoiceId: string | null;
    createdAt: string;
    contextBanners: FleetReturnContextBanner[];
    flowGuards: FleetReturnFlowGuards;
}

export interface SaveReturnInspectionPayload {
    currentSectionIndex: number;
    complete?: boolean;
    sections: Partial<
        Record<
            FleetReturnInspectionSectionId,
            Record<string, FleetReturnInspectionLineItemState>
        >
    >;
}

export interface FinalizeReturnInspectionIssueChargePayload {
    sectionId: FleetReturnInspectionSectionId;
    itemKey: string;
    chargeClient: boolean;
}

export interface FinalizeReturnInspectionPayload {
    disposition?: FleetReturnInspectionDisposition;
    issueCharges?: FinalizeReturnInspectionIssueChargePayload[];
    waiveAllRecovery?: boolean;
    inspectorConfirmed?: boolean;
    wearAndTearNote?: string;
    workshopPriority?: FleetReturnWorkshopPriority;
    workshopTargetDate?: string;
    complete?: boolean;
}

export interface ReceiveReturnPayload {
    receivedAt: string;
    receivedByEmployeeId?: string;
    broughtInBy: string;
    odometerReading: number;
    fuelLevel: FleetReturnFuelLevel;
    keysReceived: number;
    documentsChecklist: FleetReturnDocumentsChecklist;
    gatePhotos: FleetReturnGatePhoto[];
    conditionAtGlance: FleetReturnConditionAtGlance;
    gateNote?: string;
    inspectImmediately: boolean;
}

/** Figma Vehicle Returns hub pipeline tabs (Screen 1). */
export type FleetReturnListPipelineTab =
    | 'all_open'
    | 'expected'
    | 'overdue'
    | 'to_inspect'
    | 'in_inspection'
    | 'workshop'
    | 'closed';

export type FleetReturnListTabCounts = Record<
    FleetReturnListPipelineTab,
    number
>;

export type FleetReturnListHubMetrics = {
    releasedThisMonth: number;
};

export type FleetReturnClosingReason =
    | "completed"
    | "terminated_early"
    | "cancelled";

export interface FleetReturnDepotFilterOption {
    value: string;
    label: string;
    returnDepotLocationId: string | null;
    returnDepotLabel: string | null;
}

export interface PaginatedFleetReturns {
    items: FleetReturnListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    tabCounts?: FleetReturnListTabCounts;
    hubMetrics?: FleetReturnListHubMetrics;
    depotFilterOptions?: FleetReturnDepotFilterOption[];
}

function orgHeaders(organizationId: string): HeadersInit {
    return { 'x-organization-id': organizationId };
}

export function parseFleetReturnDepotFilterValue(value: string): {
    returnDepotLocationId?: string;
    returnDepotLabel?: string;
} {
    if (!value || value === "all") return {};
    if (value.startsWith("loc:")) {
        return { returnDepotLocationId: value.slice(4) };
    }
    if (value.startsWith("lbl:")) {
        const label = value.slice(4).trim();
        return label ? { returnDepotLabel: label } : {};
    }
    return {};
}

export async function fetchFleetReturnsListApi(params: {
    token: string;
    organizationId: string;
    page: number;
    pageSize: number;
    pipelineTab?: FleetReturnListPipelineTab;
    search?: string;
    includeTabCounts?: boolean;
    closingReason?: FleetReturnClosingReason;
    returnDepotLocationId?: string;
    returnDepotLabel?: string;
}): Promise<PaginatedFleetReturns> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
        page: String(params.page),
        pageSize: String(params.pageSize),
    });
    if (params.pipelineTab) {
        qs.set('pipelineTab', params.pipelineTab);
    }
    if (params.includeTabCounts) {
        qs.set('includeTabCounts', 'true');
    }
    const trimmedSearch = params.search?.trim();
    if (trimmedSearch) {
        qs.set('search', trimmedSearch);
    }
    if (params.closingReason) {
        qs.set('closingReason', params.closingReason);
    }
    if (params.returnDepotLocationId) {
        qs.set('returnDepotLocationId', params.returnDepotLocationId);
    }
    if (params.returnDepotLabel) {
        qs.set('returnDepotLabel', params.returnDepotLabel);
    }
    appendListSortSearchParams(qs, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    return apiFetch<PaginatedFleetReturns>(
        `/fleet-leasing/returns?${qs.toString()}`,
        {
            token: params.token,
            headers: orgHeaders(params.organizationId),
        },
    );
}

export async function fetchFleetReturnDetailApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    previewOdometer?: number;
    previewConditionAtGlance?: FleetReturnConditionAtGlance;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    if (
        params.previewOdometer != null &&
        Number.isFinite(params.previewOdometer)
    ) {
        qs.set('previewOdometer', String(Math.floor(params.previewOdometer)));
    }
    if (params.previewConditionAtGlance) {
        qs.set('previewConditionAtGlance', params.previewConditionAtGlance);
    }
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}?${qs.toString()}`,
        {
            token: params.token,
            headers: orgHeaders(params.organizationId),
        },
    );
}

export async function saveFleetReturnInspectionFinalizeApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    body: FinalizeReturnInspectionPayload;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/inspection/finalize?${qs.toString()}`,
        {
            method: 'PATCH',
            token: params.token,
            headers: orgHeaders(params.organizationId),
            body: JSON.stringify(params.body),
        },
    );
}

export async function completeFleetReturnInspectionFinalizeApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    body: Omit<FinalizeReturnInspectionPayload, 'complete'>;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/inspection/finalize?${qs.toString()}`,
        {
            method: 'POST',
            token: params.token,
            headers: orgHeaders(params.organizationId),
            body: JSON.stringify(params.body),
        },
    );
}

export async function saveFleetReturnInspectionApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    body: SaveReturnInspectionPayload;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/inspection?${qs.toString()}`,
        {
            method: 'PATCH',
            token: params.token,
            headers: orgHeaders(params.organizationId),
            body: JSON.stringify(params.body),
        },
    );
}

export async function resolveFleetReturnHoldApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    resolutionNote?: string;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    const body: { resolutionNote?: string } = {};
    const note = params.resolutionNote?.trim();
    if (note) {
        body.resolutionNote = note;
    }
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/resolve-hold?${qs.toString()}`,
        {
            method: 'POST',
            token: params.token,
            headers: orgHeaders(params.organizationId),
            body: JSON.stringify(body),
        },
    );
}

export async function closeFleetReturnWorkshopRepairApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/close-workshop-repair?${qs.toString()}`,
        {
            method: 'POST',
            token: params.token,
            headers: orgHeaders(params.organizationId),
        },
    );
}

export async function startFleetReturnReInspectionApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/re-inspection/start?${qs.toString()}`,
        {
            method: 'POST',
            token: params.token,
            headers: orgHeaders(params.organizationId),
        },
    );
}

export async function saveFleetReturnReInspectionApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    body: SaveReInspectionPayload;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/re-inspection?${qs.toString()}`,
        {
            method: 'PATCH',
            token: params.token,
            headers: orgHeaders(params.organizationId),
            body: JSON.stringify(params.body),
        },
    );
}

export async function receiveFleetReturnApi(params: {
    token: string;
    organizationId: string;
    inspectionId: string;
    body: ReceiveReturnPayload;
}): Promise<FleetReturnInspectionDetail> {
    const qs = new URLSearchParams({
        organizationId: params.organizationId,
    });
    return apiFetch<FleetReturnInspectionDetail>(
        `/fleet-leasing/returns/${params.inspectionId}/receive?${qs.toString()}`,
        {
            method: 'POST',
            token: params.token,
            headers: orgHeaders(params.organizationId),
            body: JSON.stringify(params.body),
        },
    );
}
