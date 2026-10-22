import type { QueryClient } from "@tanstack/react-query";

import { invalidateLeaseContractCaches } from "./invalidate-lease-contract-caches";

/**
 * Invalidate assignment + lease allocation caches after assign, unassign, bulk,
 * 409 conflict recovery, auto-replace, or undo.
 */
export async function invalidateAssetAssignmentCaches(
    queryClient: QueryClient,
    organizationId: string | null | undefined,
    contractId?: string | null,
): Promise<void> {
    if (!organizationId) {
        return;
    }

    await invalidateLeaseContractCaches(
        queryClient,
        organizationId,
        contractId,
    );

    await Promise.all([
        queryClient.invalidateQueries({
            queryKey: ["asset-register"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "bulk-assign-catalog"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "bulk-assign-validate"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "assignable-lease-contracts"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "vehicles", "bulk-assign"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "vehicles", "assignment-available"],
        }),
    ]);
}
