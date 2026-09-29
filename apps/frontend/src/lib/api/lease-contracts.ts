import { apiFetch } from './client';

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

export interface LeaseContractSummary {
    activeContracts: number;
    awaitingAssets: number;
    pendingApproval: number;
    draft: number;
}

export type LeaseContractStatusFilter =
    | 'all'
    | 'active'
    | 'draft'
    | 'pending_approval'
    | 'awaiting_assets'
    | 'deactivated'
    | 'closed';

export interface LeaseContractListItem {
    id: string;
    contractNumber: string;
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
}

export interface ContractVehicle {
    id: string;
    registrationNo: string;
    assetClass: string;
    status: string;
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
    securityDeposit: number | null;
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

    availableActions: string[];

    lifecycleLogs: unknown[];
    logs: unknown[];

    deactivatedAt: string | null;
    reactivatedAt: string | null;
    terminatedAt: string | null;
    terminationApprovedAt: string | null;

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
        companyName: string;
        pocs?: unknown[];
    } | null;

    statusBanner?: unknown;
    statusTags?: string[];
    requiresEditReview?: boolean;
    billingPaused?: boolean;
    onHold?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export interface FleetClientListItem {
    id: string;
    companyName: string;
    clientCode?: string;
    isActive?: boolean;
}

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

export type AssetAvailabilityResponse = unknown;

// ─────────────────────────────────────────────────────────────────────────────
// Lease contract create/update
// ─────────────────────────────────────────────────────────────────────────────

export interface ContractAssetLineInput {
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: string;
}

export interface CreateLeaseContractInput {
    clientId?: string;

    startDate: string;
    endDate: string;
    termMonths: number;
    securityDeposit: string;

    billingFrequency:
    | 'monthly'
    | 'quarterly'
    | 'annual';

    additionalTerms?: string;
    amcTier?: string;
    description?: string;

    assetLines: ContractAssetLineInput[];

    vehicleIds?: string[];
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
// GET lease contract summary
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeaseContractsSummary(
    token: string,
    organizationId: string,
): Promise<LeaseContractSummary> {
    return apiFetch<LeaseContractSummary>(
        `/fleet-leasing/lease-contracts/summary?${orgQuery(
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
// GET lease contracts list
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeaseContractsList(
    token: string,
    organizationId: string,
    options: {
        page?: number;
        pageSize?: number;
        statusFilter?: LeaseContractStatusFilter;
        search?: string;
    } = {},
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
): Promise<unknown> {
    return apiFetch<unknown>(
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
): Promise<unknown> {
    return apiFetch<unknown>(
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
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'deactivate',
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
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'confirm',
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

export const requestTerminationLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'request-termination',
    );

export const approveTerminationLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'approve-termination',
    );

export const renewLeaseContract = (
    token: string,
    organizationId: string,
    contractId: string,
) =>
    contractAction(
        token,
        organizationId,
        contractId,
        'renew',
    );

// ─────────────────────────────────────────────────────────────────────────────
// POST create lease contract
// ─────────────────────────────────────────────────────────────────────────────

export async function createLeaseContract(
    token: string,
    organizationId: string,
    payload: CreateLeaseContractInput,
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
                ...payload,
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
            body: JSON.stringify(payload),
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
    options: {
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
    request: {
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