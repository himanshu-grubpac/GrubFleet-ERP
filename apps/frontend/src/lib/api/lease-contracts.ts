import { apiFetch } from './client';
import {
    DEFAULT_API_CATALOG_PAGE_SIZE,
    fetchAllPaginatedItems,
} from './fetch-all-paginated';
import type { ListSortParams } from '@/lib/query/list-sort-params';
import { appendListSortSearchParams } from '@/lib/query/list-sort-params';
import { normalizeDecimalMoneyForLeaseApi } from '@/lib/format/money-format';

// ─────────────────────────────────────────────────────────────────────────────
// Shared query helpers
// ─────────────────────────────────────────────────────────────────────────────

function orgQuery(organizationId: string) {
    return new URLSearchParams({
        organizationId,
    }).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LeaseContractStatusFilter =
    | 'all'
    | 'active'
    | 'draft'
    | 'pending_approval'
    | 'awaiting_assets'
    | 'deactivated'
    | 'completed'
    | 'billing_paused'
    | 'pending_termination';

export interface LeaseContractListItem {
    id: string;
    contractNumber: string;
    clientId: string | null;
    clientName: string;
    assetClasses: string;
    startDate: string | null;
    endDate: string | null;
    termMonths: number | null;
    status: string;
    rawStatus: string;
    billingPaused: boolean;
    onHold: boolean;
    statusTags: string[];
}

export interface PaginatedLeaseContracts {
    items: LeaseContractListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface AssetLine {
    id: string;
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: number;
    availabilityCovered: boolean;
    availabilityStatus: string;
    availableNowCount: number;
    inboundCount: number;
    shortfallCount: number;
    awaitingAssetsLine: boolean;
    allocatedCount?: number;
    lineAllocationStatus?: 'allocated' | 'partially_allocated' | 'awaiting_assets';
    lineStatusLabel?: string;
}

export interface ContractVehicle {
    id: string;
    registrationNo: string;
    assetClass: string;
    status: string;
    odometer?: number;
}

export type LeaseClosingReason =
    | 'completed'
    | 'terminated_early'
    | 'cancelled';

export type LeaseReturnMethod = 'client_depot' | 'collect_from_site';

export interface LeaseContractClosingSummary {
    reason: string;
    leaseEndDate: string | null;
    returnMethod: string | null;
    returnDepotLocationId: string | null;
    returnDepotLabel: string | null;
    expectedReturnBy: string | null;
    notes: string | null;
}

export interface LeaseContractDetail {
    id: string;
    contractNumber: string;
    status: string;
    rawStatus: string;
    subtitle: string;
    startDate: string | null;
    endDate: string | null;
    termMonths: number | null;
    securityDeposit: string | number | null;
    billingFrequency: string;
    additionalTerms: string | null;
    amcTier: string | null;
    description: string | null;

    assetLines: AssetLine[];

    vehicleIds: string[];

    vehicles: ContractVehicle[];

    returnProgress: {
        returnedRegisteredCount: number;
        committedVehicleCount: number;
        canPauseBilling: boolean;
    };

    availableActions: LeaseContractAvailableActions | string[];

    lifecycleLogs: unknown[];
    logs: unknown[];

    deactivatedAt: string | null;
    reactivatedAt: string | null;
    terminatedAt: string | null;
    terminationApprovedAt: string | null;

    lastRenewOutcome?: 'renewal' | 'extension' | null;
    lastRenewOutcomeLabel?: string | null;

    createdAt: string;
    updatedAt: string;

    createdBy: {
        userId: string;
        displayLabel: string;
    } | null;

    updatedBy: {
        userId: string;
        displayLabel: string;
    } | null;

    client?: {
        id: string;
        organisationClientId?: string | null;
        companyName: string;
        pocs?: unknown[];
    } | null;

    closing?: LeaseContractClosingSummary | null;

    statusBanner?: {
        level: 'success' | 'info' | 'warning';
        text: string;
        occurredAt: string | null;
        actorLabel: string | null;
    } | null;
    statusTags?: string[];
    requiresEditReview?: boolean;
    billingPaused?: boolean;
    onHold?: boolean;
    contractFullyAllocated?: boolean;
    hasFieldChangeHistory?: boolean;
}

export type LeaseContractAvailableActions = {
    editContract?: { allowed: boolean; disabledReason?: string };
    deactivate?: { allowed: boolean; disabledReason?: string };
    reactivate?: { allowed: boolean; disabledReason?: string };
    pauseBilling?: { allowed: boolean; disabledReason?: string };
    terminate?: { allowed: boolean; disabledReason?: string };
};

export interface ConfirmLeaseContractResponse {
    contract: LeaseContractDetail;
    activatedStatus: string;
    confirmation?: LeaseContractConfirmationSummary | null;
}

export interface LeaseContractConfirmationLine {
    assetClass: string;
    committedQuantity: number;
    allocatedCount: number;
    lineStatus: 'allocated' | 'partially_allocated' | 'awaiting_assets';
    lineStatusLabel: string;
}

export interface LeaseContractConfirmationSummary {
    contractId: string;
    contractNumber: string;
    clientCompanyName: string;
    publicStatus: string;
    rawStatus: string;
    headline: string;
    infoMessages: string[];
    allocationByLine: LeaseContractConfirmationLine[];
    contractFullyAllocated: boolean;
}

export interface LeaseContractReviewAssetLine {
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: string | number;
    availability: {
        status: string;
        availableNow: number;
        inbound: number;
        shortfallCount: number;
        shortfallConfirmed: boolean;
        displayMessage?: string;
    };
}

export interface LeaseContractChangeHistoryItem {
    id: string;
    field: string;
    fieldLabel: string;
    fromValue: string;
    toValue: string;
    changedBy: string;
    changedAt: string;
}

export interface LeaseContractChangeHistoryResponse {
    contractId: string;
    contractNumber: string;
    items: LeaseContractChangeHistoryItem[];
}

export interface LeaseContractReviewResponse {
    contractId: string;
    contractNumber: string;
    rawStatus: string;
    status: string;
    reviewAction: string;
    canSubmit: boolean;
    assetLines: LeaseContractReviewAssetLine[];
    terms: {
        termMonths: number | null;
        securityDeposit: string | number | null;
        billingFrequency: string;
        startDate: string | null;
        endDate?: string | null;
    };
    client: {
        companyName: string;
        primaryPoc: {
            name: string;
            contactNumber: string;
            email: string;
        } | null;
    } | null;
    messages: Array<{ level: string; text: string; code?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export interface FleetClientPrimaryPoc {
    id: string;
    name: string;
    email: string;
    contactNumber: string;
}

export interface FleetClientListItem {
    id: string;
    companyName: string;
    clientCode?: string;
    taxId?: string | null;
    isActive?: boolean;
    primaryPoc?: FleetClientPrimaryPoc | null;
    contractCount?: number;
}

export interface FleetClientDetail extends FleetClientListItem {
    address?: string | null;
    pointsOfContact?: Array<
        FleetClientPrimaryPoc & { isPrimary: boolean }
    >;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateFleetClientPayload = {
    organizationId: string;
    companyName: string;
    taxId?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressCountry?: string;
    addressState?: string;
    addressDistrict?: string;
    addressPincode?: string;
    pointsOfContact: Array<{
        name: string;
        contactNumber: string;
        email: string;
        isPrimary: boolean;
    }>;
};

export interface PaginatedFleetClients {
    items: FleetClientListItem[];
    total: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle
//
// The Swagger screenshot gives us the request parameters:
//
// organizationId
// page
// pageSize
// status
// assetClass
//
// The exact response schema was not shown, so fields are intentionally optional.
// ─────────────────────────────────────────────────────────────────────────────

export interface FleetVehicle {
    id: string;

    registrationNo?: string;
    registrationNumber?: string;

    vin?: string;

    assetClass?: string;

    status?: string;

    location?: string;

    [key: string]: unknown;
}

export interface FleetVehicleListResponse {
    items?: FleetVehicle[];
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;

    [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset availability
//
// Swagger:
//
// GET /fleet-leasing/asset-classes/availability
//
// Required query params:
//
// organizationId
// assetClass
// committedQuantity
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetAvailabilityRequest {
    organizationId: string;
    assetClass: string;
    committedQuantity: string;
}

export interface AssetClassAvailabilitySnapshot {
    assetClass: string;
    committedQuantity: number;
    availableNow: number;
    inbound: number;
    totalCover: number;
    shortfallCount: number;
    mvpAvailableNowCovers: boolean;
    mvpShortByCount: number;
    status: 'covered' | 'partial_today' | 'shortfall';
    availabilityCovered: boolean;
    awaitingAssetsLine: boolean;
    message: string;
}

export interface AssetAvailabilityBatchPreviewResponse {
    lines: AssetClassAvailabilitySnapshot[];
    mvpAllLinesCovered: boolean;
}

export type AssetAvailabilityResponse =
    AssetClassAvailabilitySnapshot;

export interface FleetAssetClassListResponse {
    items: string[];
    catalog?: Array<{ id: string; name: string; specLabel?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lease contract create/update
// ─────────────────────────────────────────────────────────────────────────────

export interface ContractAssetLineInput {
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: string;
}

export function normalizeContractAssetLineForApi(
    line: ContractAssetLineInput,
): ContractAssetLineInput {
    return {
        ...line,
        committedQuantity: Number(line.committedQuantity),
        ratePerVehicleMonth: normalizeDecimalMoneyForLeaseApi(
            String(line.ratePerVehicleMonth ?? ""),
        ),
    };
}

export function normalizeContractAssetLinesForApi(
    lines: ContractAssetLineInput[],
): ContractAssetLineInput[] {
    return lines.map(normalizeContractAssetLineForApi);
}

function normalizeLeaseContractWritePayload<
    T extends {
        securityDeposit?: string;
        assetLines?: ContractAssetLineInput[];
    },
>(payload: T): T {
    const next = { ...payload };
    if (next.securityDeposit !== undefined) {
        next.securityDeposit = normalizeDecimalMoneyForLeaseApi(
            String(next.securityDeposit),
        );
    }
    if (next.assetLines) {
        next.assetLines = normalizeContractAssetLinesForApi(next.assetLines);
    }
    return next;
}

/** Wizard draft — only `organizationId` (+ optional client) required on POST. */
export type CreateLeaseContractDraftPayload = {
    clientId?: string;
    startDate?: string;
    endDate?: string;
    termMonths?: number;
    securityDeposit?: string;
    billingFrequency?: 'monthly' | 'quarterly' | 'annual';
    additionalTerms?: string;
    amcTier?: string;
    description?: string;
    assetLines?: ContractAssetLineInput[];
    confirmShortfall?: boolean;
    vehicleIds?: string[];
};

export interface CreateLeaseContractInput extends CreateLeaseContractDraftPayload {
    startDate: string;
    endDate: string;
    termMonths: number;
    securityDeposit: string;
    billingFrequency: 'monthly' | 'quarterly' | 'annual';
    assetLines: ContractAssetLineInput[];
}

export interface UpdateContractAssetLinesPayload {
    assetLines: ContractAssetLineInput[];
    confirmShortfall?: boolean;
}

export interface UpdateContractTermsPayload {
    startDate: string;
    endDate?: string;
    termMonths: number;
    securityDeposit: string;
    billingFrequency: 'monthly' | 'quarterly' | 'annual';
    additionalTerms?: string;
    amcTier?: string;
}

export interface UpdateLeaseContractInput {
    editClassification?:
    | 'clerical'
    | 'material';

    clientId?: string;
    startDate?: string;
    endDate?: string;
    termMonths?: number;
    securityDeposit?: string;

    billingFrequency?:
    | 'monthly'
    | 'quarterly'
    | 'annual';

    additionalTerms?: string;
    amcTier?: string;
    description?: string;

    assetLines?: ContractAssetLineInput[];

    vehicleIds?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle allocation
// ─────────────────────────────────────────────────────────────────────────────

export interface AllocateVehicleInput {
    vehicleId: string;
    reassignmentConfirmation?: string;
    notifiedStakeholders?: string[];
}

export type VehicleAllocationResponse =
    LeaseContractDetail | unknown;

// ─────────────────────────────────────────────────────────────────────────────
// GET lease contracts list
// ─────────────────────────────────────────────────────────────────────────────

export type LeaseContractsListOptions = ListSortParams & {
    page?: number;
    pageSize?: number;
    statusFilter?: LeaseContractStatusFilter;
    search?: string;
};

export async function fetchLeaseContractsList(
    token: string,
    organizationId: string,
    options: LeaseContractsListOptions = {},
): Promise<PaginatedLeaseContracts> {
    const params = new URLSearchParams({
        organizationId,
    });

    if (options.page) {
        params.set(
            'page',
            String(options.page),
        );
    }

    if (options.pageSize) {
        params.set(
            'pageSize',
            String(options.pageSize),
        );
    }

    if (options.statusFilter) {
        params.set(
            'statusFilter',
            options.statusFilter,
        );
    }

    if (options.search) {
        params.set(
            'search',
            options.search,
        );
    }

    appendListSortSearchParams(params, options);

    return apiFetch<PaginatedLeaseContracts>(
        `/fleet-leasing/lease-contracts?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

export async function fetchAllLeaseContractsList(
    token: string,
    organizationId: string,
    options: Omit<LeaseContractsListOptions, 'page' | 'pageSize'> = {},
): Promise<LeaseContractListItem[]> {
    return fetchAllPaginatedItems(
        (page, pageSize) =>
            fetchLeaseContractsList(token, organizationId, {
                ...options,
                page,
                pageSize,
            }),
        DEFAULT_API_CATALOG_PAGE_SIZE,
    );
}

export interface RenewLeaseContractInput {
    newTermMonths: number;
    newStartDate: string;
}

export interface RenewLeaseContractResponse {
    outcomeKind: 'renewal' | 'extension';
    outcomeLabel: string;
    contract: LeaseContractDetail;
}

export async function fetchRenewalsExtensionsList(
    token: string,
    organizationId: string,
    options: ListSortParams & {
        page?: number;
        pageSize?: number;
        search?: string;
    } = {},
): Promise<PaginatedLeaseContracts> {
    const params = new URLSearchParams({
        organizationId,
    });

    if (options.page) {
        params.set('page', String(options.page));
    }
    if (options.pageSize) {
        params.set('pageSize', String(options.pageSize));
    }
    if (options.search) {
        params.set('search', options.search);
    }

    appendListSortSearchParams(params, options);

    return apiFetch<PaginatedLeaseContracts>(
        `/fleet-leasing/renewals-extensions?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
        },
    );
}

export async function renewLeaseContract(
    token: string,
    organizationId: string,
    contractId: string,
    payload: RenewLeaseContractInput,
): Promise<RenewLeaseContractResponse> {
    return apiFetch<RenewLeaseContractResponse>(
        `/fleet-leasing/lease-contracts/${contractId}/renew?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
            body: JSON.stringify(payload),
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET lease contract detail
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeaseContractById(
    token: string,
    organizationId: string,
    contractId: string,
): Promise<LeaseContractDetail> {
    return apiFetch<LeaseContractDetail>(
        `/fleet-leasing/lease-contracts/${contractId}?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET review
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeaseContractReview(
    token: string,
    organizationId: string,
    contractId: string,
): Promise<LeaseContractReviewResponse> {
    return apiFetch<LeaseContractReviewResponse>(
        `/fleet-leasing/lease-contracts/${contractId}/review?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET confirmation
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeaseContractConfirmation(
    token: string,
    organizationId: string,
    contractId: string,
): Promise<LeaseContractConfirmationSummary> {
    return apiFetch<LeaseContractConfirmationSummary>(
        `/fleet-leasing/lease-contracts/${contractId}/confirmation?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET terms evaluation
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeaseContractTermsEvaluation(
    token: string,
    organizationId: string,
    contractId: string,
): Promise<unknown> {
    return apiFetch<unknown>(
        `/fleet-leasing/lease-contracts/${contractId}/terms/evaluation?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic contract action
// ─────────────────────────────────────────────────────────────────────────────

function contractAction(
    token: string,
    organizationId: string,
    contractId: string,
    action: string,
): Promise<LeaseContractDetail> {
    return apiFetch<LeaseContractDetail>(
        `/fleet-leasing/lease-contracts/${contractId}/${action}?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract actions
// ─────────────────────────────────────────────────────────────────────────────

export const activateLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'activate',
    );

export const reactivateLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'reactivate',
    );

export const deactivateLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
    reason: string,
) =>
    apiFetch<LeaseContractDetail>(
        `/fleet-leasing/lease-contracts/${contractId}/deactivate?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
            body: JSON.stringify({ reason: reason.trim() }),
        },
    );

export const submitLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'submit',
    );

export const confirmLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
): Promise<ConfirmLeaseContractResponse> =>
    apiFetch<ConfirmLeaseContractResponse>(
        `/fleet-leasing/lease-contracts/${contractId}/confirm?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
        },
    );

export const fetchLeaseContractChangeHistory = (
    token: string,
    organizationId: string,
    contractId: string,
): Promise<LeaseContractChangeHistoryResponse> =>
    apiFetch<LeaseContractChangeHistoryResponse>(
        `/fleet-leasing/lease-contracts/${contractId}/change-history?${orgQuery(
            organizationId,
        )}`,
        {
            token,
            headers: {
                'x-organization-id': organizationId,
            },
        },
    );

export const approveLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'approve',
    );

export const pauseBillingLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'pause-billing',
    );

export const terminateLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'terminate',
    );

export interface InitiateLeaseReturnsPayload {
    closingReason: LeaseClosingReason;
    leaseEndDate: string;
    vehicleIds: string[];
    returnMethod: LeaseReturnMethod;
    returnDepotLocationId?: string;
    returnDepotLabel?: string;
    expectedReturnBy: string;
    notes?: string;
}

export async function initiateLeaseContractReturns(
    token: string,
    organizationId: string,
    contractId: string,
    payload: InitiateLeaseReturnsPayload,
): Promise<LeaseContractDetail> {
    return apiFetch<LeaseContractDetail>(
        `/fleet-leasing/lease-contracts/${contractId}/initiate-returns?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
            body: JSON.stringify(payload),
        },
    );
}

export interface ContractVehicleAllocationRow {
    id: string;
    vehicleId: string;
    fleetCode: string;
    registrationNo: string;
    assetClass: string;
    vehicleStatus: string;
    odometer: number;
    createdAt: string;
}

export interface PaginatedContractVehicleAllocations {
    items: ContractVehicleAllocationRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function fetchContractVehicleAllocations(
    token: string,
    organizationId: string,
    contractId: string,
    page = 1,
    pageSize = 50,
): Promise<PaginatedContractVehicleAllocations> {
    const params = new URLSearchParams({
        organizationId,
        page: String(page),
        pageSize: String(pageSize),
    });
    return apiFetch<PaginatedContractVehicleAllocations>(
        `/fleet-leasing/lease-contracts/${contractId}/vehicle-allocations?${params.toString()}`,
        {
            token,
            headers: {
                'x-organization-id': organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST create lease contract
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLeaseContractAssetLines(
    token: string,
    organizationId: string,
    contractId: string,
    payload: UpdateContractAssetLinesPayload,
): Promise<unknown> {
    return apiFetch<unknown>(
        `/fleet-leasing/lease-contracts/${contractId}/asset-lines?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'PUT',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
            body: JSON.stringify({
                ...payload,
                assetLines: normalizeContractAssetLinesForApi(
                    payload.assetLines,
                ),
            }),
        },
    );
}

export async function updateLeaseContractTerms(
    token: string,
    organizationId: string,
    contractId: string,
    payload: UpdateContractTermsPayload,
): Promise<unknown> {
    return apiFetch<unknown>(
        `/fleet-leasing/lease-contracts/${contractId}/terms?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'PUT',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
            body: JSON.stringify(
                normalizeLeaseContractWritePayload(payload),
            ),
        },
    );
}

export async function createLeaseContract(
    token: string,
    organizationId: string,
    payload: CreateLeaseContractDraftPayload,
): Promise<LeaseContractDetail> {
    return apiFetch<LeaseContractDetail>(
        `/fleet-leasing/lease-contracts?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
            body: JSON.stringify({
                organizationId,
                ...normalizeLeaseContractWritePayload(payload),
            }),
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH update lease contract
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLeaseContract(
    token: string,
    organizationId: string,
    contractId: string,
    payload: UpdateLeaseContractInput,
): Promise<LeaseContractDetail> {
    return apiFetch<LeaseContractDetail>(
        `/fleet-leasing/lease-contracts/${contractId}?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'PATCH',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
            body: JSON.stringify(
                normalizeLeaseContractWritePayload(payload),
            ),
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET clients
// ─────────────────────────────────────────────────────────────────────────────
//
// Swagger:
//
// GET /api/v1/fleet-leasing/clients
//
// Query params:
//
// page
// pageSize
// organizationId
// search
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFleetClients(
    token: string,
    organizationId: string,
    options: ListSortParams & {
        page?: number;
        pageSize?: number;
        search?: string;
    } = {},
): Promise<PaginatedFleetClients> {
    const params = new URLSearchParams({
        organizationId,
        page: String(
            options.page ?? 1,
        ),
        pageSize: String(
            options.pageSize ?? 50,
        ),
    });

    if (options.search) {
        params.set(
            'search',
            options.search,
        );
    }
    appendListSortSearchParams(params, options);

    return apiFetch<PaginatedFleetClients>(
        `/fleet-leasing/clients?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
        },
    );
}

export async function fetchAllFleetClients(
    token: string,
    organizationId: string,
    search?: string,
): Promise<FleetClientListItem[]> {
    return fetchAllPaginatedItems(
        async (page, pageSize) => {
            const response = await fetchFleetClients(token, organizationId, {
                page,
                pageSize,
                search,
            });
            const items = response.items ?? [];
            const total = response.total;
            return {
                items,
                page: response.page ?? page,
                pageSize: response.pageSize ?? pageSize,
                total,
                totalPages:
                    response.totalPages ??
                    (pageSize > 0 ? Math.ceil(total / pageSize) : 1),
            };
        },
        DEFAULT_API_CATALOG_PAGE_SIZE,
    );
}

export async function createFleetClient(
    token: string,
    organizationId: string,
    payload: Omit<CreateFleetClientPayload, 'organizationId'>,
): Promise<FleetClientDetail> {
    return apiFetch<FleetClientDetail>(`/fleet-leasing/clients`, {
        method: 'POST',
        token,
        headers: {
            'x-organization-id': organizationId,
        },
        body: JSON.stringify({
            organizationId,
            ...payload,
        }),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET asset availability
// ─────────────────────────────────────────────────────────────────────────────
//
// Swagger:
//
// GET /api/v1/fleet-leasing/asset-classes/availability
//
// Required:
//
// organizationId
// assetClass
// committedQuantity
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFleetAssetClasses(
    token: string,
    organizationId: string,
): Promise<FleetAssetClassListResponse> {
    return apiFetch<FleetAssetClassListResponse>(
        `/fleet-leasing/asset-classes?${orgQuery(organizationId)}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
        },
    );
}

export async function previewAssetAvailabilityBatch(
    token: string,
    organizationId: string,
    lines: Array<{ assetClass: string; committedQuantity: number }>,
    options?: { excludeContractId?: string | null },
): Promise<AssetAvailabilityBatchPreviewResponse> {
    return apiFetch<AssetAvailabilityBatchPreviewResponse>(
        `/fleet-leasing/asset-classes/availability/preview`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id': organizationId,
            },
            body: JSON.stringify({
                organizationId,
                lines,
                ...(options?.excludeContractId
                    ? { excludeContractId: options.excludeContractId }
                    : {}),
            }),
        },
    );
}

export async function fetchAssetAvailability(
    token: string,
    request: AssetAvailabilityRequest,
): Promise<AssetAvailabilityResponse> {
    const params = new URLSearchParams({
        organizationId:
            request.organizationId,

        assetClass:
            request.assetClass,

        committedQuantity:
            request.committedQuantity,
    });

    return apiFetch<AssetAvailabilityResponse>(
        `/fleet-leasing/asset-classes/availability?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    request.organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET vehicles
// ─────────────────────────────────────────────────────────────────────────────
//
// Swagger:
//
// GET /api/v1/fleet-leasing/vehicles
//
// Required:
//
// organizationId
// status
// assetClass
//
// Optional:
//
// page
// pageSize
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFleetVehicles(
    token: string,
    request: ListSortParams & {
        organizationId: string;
        page?: number;
        pageSize?: number;
        status: string;
        assetClass: string;
    },
): Promise<FleetVehicleListResponse> {
    const params = new URLSearchParams({
        organizationId:
            request.organizationId,

        page: String(
            request.page ?? 1,
        ),

        pageSize: String(
            request.pageSize ?? 20,
        ),

        status:
            request.status,

        assetClass:
            request.assetClass,
    });
    appendListSortSearchParams(params, request);

    return apiFetch<FleetVehicleListResponse>(
        `/fleet-leasing/vehicles?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: {
                'x-organization-id':
                    request.organizationId,
            },
        },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST vehicle allocation
// ─────────────────────────────────────────────────────────────────────────────
//
// POST
// /fleet-leasing/lease-contracts/{contractId}/vehicle-allocations
//
// organizationId -> query
// contractId     -> path
//
// body:
//
// {
//   vehicleId: string,
//   reassignmentConfirmation?: string,
//   notifiedStakeholders?: string[]
// }
// ─────────────────────────────────────────────────────────────────────────────

export async function allocateVehicleToLeaseContract(
    token: string,
    organizationId: string,
    contractId: string,
    payload: AllocateVehicleInput,
): Promise<VehicleAllocationResponse> {
    return apiFetch<VehicleAllocationResponse>(
        `/fleet-leasing/lease-contracts/${contractId}/vehicle-allocations?${orgQuery(
            organizationId,
        )}`,
        {
            method: 'POST',
            token,
            headers: {
                'x-organization-id':
                    organizationId,
            },
            body: JSON.stringify(
                payload,
            ),
        },
    );
}