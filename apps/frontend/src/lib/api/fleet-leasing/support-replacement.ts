import type { ListSortParams } from '@/lib/query/list-sort-params';
import { appendListSortSearchParams } from '@/lib/query/list-sort-params';
import { apiFetch } from '../client';

export type SupportReplacementVehicleStore = 'legacy' | 'register';

export interface OnLeaseVehicleLookupResult {
    vehicle: {
        id: string;
        registrationNo: string;
        vin: string;
        assetClass: string;
        status: string;
        vehicleStore: SupportReplacementVehicleStore;
    };
    contract: {
        id: string;
        contractNumber: string;
        status: string;
        startDate: string | null;
        endDate: string | null;
        termMonths: number | null;
    };
    clientName: string;
}

export interface SupportReplacementCandidate {
    id: string;
    registrationNo: string;
    vin: string;
    assetClass: string;
    status: string;
    vehicleStore: SupportReplacementVehicleStore;
}

export type ReplacementVehicleType = '2W' | '3W' | '4W';

export interface AvailableReplacementLookupResult {
    vehicle: {
        id: string;
        registrationNo: string;
        vin: string;
        assetClass: string;
        brand: string | null;
        modelName: string | null;
        vehicleType: ReplacementVehicleType | null;
        status: string;
        vehicleStore: SupportReplacementVehicleStore;
    };
}

export interface PaginatedReplacementCandidates {
    items: SupportReplacementCandidate[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface SupportAllocatedVehicle {
    id: string;
    registrationNo: string;
    vin: string;
    assetClass: string;
    status: string;
    vehicleStore: SupportReplacementVehicleStore;
}

export interface SupportActiveContract {
    id: string;
    contractNumber: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
}

export interface VehicleReplacementPairInput {
    contractId: string;
    fromVehicleId: string;
    toVehicleId: string;
}

export interface ExecuteVehicleReplacementsResult {
    replacedCount: number;
    items: Array<{
        contractId: string;
        contractNumber: string;
        fromRegistrationNo: string;
        toRegistrationNo: string;
    }>;
}

function orgHeaders(organizationId: string) {
    return { 'x-organization-id': organizationId };
}

export async function lookupOnLeaseVehicle(
    token: string,
    organizationId: string,
    q: string,
): Promise<OnLeaseVehicleLookupResult> {
    const params = new URLSearchParams({ organizationId, q: q.trim() });
    return apiFetch<OnLeaseVehicleLookupResult>(
        `/fleet-leasing/support/on-lease-vehicle-lookup?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function fetchReplacementCandidates(
    token: string,
    organizationId: string,
    options: {
        page?: number;
        pageSize?: number;
        assetClass?: string;
        vehicleType?: ReplacementVehicleType;
        brand?: string;
        modelName?: string;
        excludeVehicleIds?: string[];
        sourceKind?: SupportReplacementVehicleStore;
    } & ListSortParams = {},
): Promise<PaginatedReplacementCandidates> {
    const params = new URLSearchParams({
        organizationId,
        page: String(options.page ?? 1),
        pageSize: String(options.pageSize ?? 50),
    });
    if (options.assetClass) {
        params.set('assetClass', options.assetClass);
    }
    if (options.vehicleType) {
        params.set('vehicleType', options.vehicleType);
    }
    if (options.brand) {
        params.set('brand', options.brand);
    }
    if (options.modelName) {
        params.set('modelName', options.modelName);
    }
    if (options.excludeVehicleIds?.length) {
        params.set('excludeVehicleIds', options.excludeVehicleIds.join(','));
    }
    if (options.sourceKind) {
        params.set('sourceKind', options.sourceKind);
    }
    appendListSortSearchParams(params, options);
    return apiFetch<PaginatedReplacementCandidates>(
        `/fleet-leasing/support/replacement-candidates?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function fetchReplacementFilterBrands(
    token: string,
    organizationId: string,
    vehicleType: ReplacementVehicleType,
): Promise<{ brands: string[] }> {
    const params = new URLSearchParams({
        organizationId,
        vehicleType,
    });
    return apiFetch<{ brands: string[] }>(
        `/fleet-leasing/support/replacement-filter-options?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function fetchReplacementFilterModels(
    token: string,
    organizationId: string,
    vehicleType: ReplacementVehicleType,
    brand: string,
): Promise<{ models: string[] }> {
    const params = new URLSearchParams({
        organizationId,
        vehicleType,
        brand,
    });
    return apiFetch<{ models: string[] }>(
        `/fleet-leasing/support/replacement-filter-options?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function lookupAvailableReplacement(
    token: string,
    organizationId: string,
    q: string,
    sourceKind?: SupportReplacementVehicleStore,
): Promise<AvailableReplacementLookupResult> {
    const params = new URLSearchParams({ organizationId, q: q.trim() });
    if (sourceKind) {
        params.set('sourceKind', sourceKind);
    }
    return apiFetch<AvailableReplacementLookupResult>(
        `/fleet-leasing/support/available-replacement-lookup?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function fetchSupportActiveContractsForClient(
    token: string,
    organizationId: string,
    clientId: string,
): Promise<{ items: SupportActiveContract[] }> {
    const params = new URLSearchParams({ organizationId });
    return apiFetch<{ items: SupportActiveContract[] }>(
        `/fleet-leasing/support/clients/${clientId}/active-contracts?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function fetchSupportAllocatedVehicles(
    token: string,
    organizationId: string,
    contractId: string,
): Promise<{ items: SupportAllocatedVehicle[] }> {
    const params = new URLSearchParams({ organizationId });
    return apiFetch<{ items: SupportAllocatedVehicle[] }>(
        `/fleet-leasing/support/lease-contracts/${contractId}/allocated-vehicles?${params.toString()}`,
        {
            method: 'GET',
            token,
            headers: orgHeaders(organizationId),
        },
    );
}

export async function executeVehicleReplacements(
    token: string,
    organizationId: string,
    replacements: VehicleReplacementPairInput[],
): Promise<ExecuteVehicleReplacementsResult> {
    return apiFetch<ExecuteVehicleReplacementsResult>(
        '/fleet-leasing/support/vehicle-replacements',
        {
            method: 'POST',
            token,
            headers: orgHeaders(organizationId),
            body: JSON.stringify({ organizationId, replacements }),
        },
    );
}
