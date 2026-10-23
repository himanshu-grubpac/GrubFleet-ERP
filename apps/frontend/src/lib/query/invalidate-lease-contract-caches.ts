import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate lease + asset-register queries after contract or assignment mutations.
 * Uses prefix keys where detail views use inconsistent id/order in queryKey tuples.
 */
export async function invalidateLeaseContractCaches(
    queryClient: QueryClient,
    organizationId: string | null | undefined,
    contractId?: string | null,
): Promise<void> {
    if (!organizationId) {
        return;
    }

    const tasks: Promise<void>[] = [
        queryClient.invalidateQueries({
            queryKey: ["lease-contracts-list", organizationId],
        }),
        queryClient.invalidateQueries({
            queryKey: ["lease-contracts"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["renewals-extensions-list", organizationId],
        }),
        queryClient.invalidateQueries({
            queryKey: ["fleet-leasing-availability-batch"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "vehicles"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "wizard-vehicles"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "bulk-assign-catalog"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["asset-register", "assignable-lease-contracts"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["lease-contract"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["finance-billing-contracts"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["finance-client-statements"],
        }),
        queryClient.invalidateQueries({
            queryKey: ["finance-client-statement-detail"],
        }),
    ];

    if (contractId) {
        tasks.push(
            queryClient.invalidateQueries({
                queryKey: ["lease-contract", organizationId, contractId],
            }),
            queryClient.invalidateQueries({
                queryKey: ["lease-contract", contractId, organizationId],
            }),
            queryClient.invalidateQueries({
                queryKey: ["lease-contract-detail", organizationId, contractId],
            }),
            queryClient.invalidateQueries({
                queryKey: ["lease-contract-review", organizationId, contractId],
            }),
            queryClient.invalidateQueries({
                queryKey: ["lease-contract-confirmation", contractId, organizationId],
            }),
        );
    }

    await Promise.all(tasks);
}
