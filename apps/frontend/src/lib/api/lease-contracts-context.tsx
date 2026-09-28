"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import {
    fetchLeaseContractsSummary,
    fetchLeaseContractsList,
    fetchLeaseContractById,
    fetchLeaseContractReview,
    fetchLeaseContractConfirmation,
    fetchLeaseContractTermsEvaluation,
    activateLeaseContract,
    reactivateLeaseContract,
    deactivateLeaseContract,
    submitLeaseContract,
    confirmLeaseContract,
    approveLeaseContract,
    pauseBillingLeaseContract,
    requestTerminationLeaseContract,
    approveTerminationLeaseContract,
    renewLeaseContract,
    createLeaseContract,
    updateLeaseContract,
    fetchFleetClients,
    type LeaseContractStatusFilter,
    type CreateLeaseContractInput,
    type UpdateLeaseContractInput,
} from "./lease-contracts";

// ─── Context type ─────────────────────────────────────────────────────────────

interface LeaseContractsContextValue {
    /** The current organizationId — use as part of React Query keys */
    organizationId: string | null | undefined;

    /** Pre-bound API functions — token + orgId already injected */
    api: {
        getSummary: () => ReturnType<typeof fetchLeaseContractsSummary>;
        getList: (options?: {
            page?: number;
            pageSize?: number;
            statusFilter?: LeaseContractStatusFilter;
            search?: string;
        }) => ReturnType<typeof fetchLeaseContractsList>;
        getById: (contractId: string) => ReturnType<typeof fetchLeaseContractById>;
        getReview: (contractId: string) => ReturnType<typeof fetchLeaseContractReview>;
        getConfirmation: (contractId: string) => ReturnType<typeof fetchLeaseContractConfirmation>;
        getTermsEvaluation: (contractId: string) => ReturnType<typeof fetchLeaseContractTermsEvaluation>;
        getClients: () => ReturnType<typeof fetchFleetClients>;

        // ── Mutations ──────────────────────────────────────────────────────────
        create: (payload: CreateLeaseContractInput) => ReturnType<typeof createLeaseContract>;
        update: (contractId: string, payload: UpdateLeaseContractInput) => ReturnType<typeof updateLeaseContract>;

        // ── Actions ────────────────────────────────────────────────────────────
        activate: (contractId: string) => ReturnType<typeof activateLeaseContract>;
        reactivate: (contractId: string) => ReturnType<typeof reactivateLeaseContract>;
        deactivate: (contractId: string) => ReturnType<typeof deactivateLeaseContract>;
        submit: (contractId: string) => ReturnType<typeof submitLeaseContract>;
        confirm: (contractId: string) => ReturnType<typeof confirmLeaseContract>;
        approve: (contractId: string) => ReturnType<typeof approveLeaseContract>;
        pauseBilling: (contractId: string) => ReturnType<typeof pauseBillingLeaseContract>;
        requestTermination: (contractId: string) => ReturnType<typeof requestTerminationLeaseContract>;
        approveTermination: (contractId: string) => ReturnType<typeof approveTerminationLeaseContract>;
        renew: (contractId: string) => ReturnType<typeof renewLeaseContract>;
    };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LeaseContractsContext = createContext<LeaseContractsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap any subtree that needs lease-contract API access.
 * Reads useAuth() once here so individual components never touch it.
 */
export function LeaseContractsProvider({ children }: { children: React.ReactNode }) {
    const { token, organizationId } = useAuth();

    const value = useMemo<LeaseContractsContextValue>(() => {
        // Require auth — functions throw naturally if token/orgId are missing
        const t = token ?? "";
        const o = organizationId ?? "";

        return {
            organizationId,
            api: {
                getSummary: () => fetchLeaseContractsSummary(t, o),
                getList: (opts) => fetchLeaseContractsList(t, o, opts),
                getById: (id) => fetchLeaseContractById(t, o, id),
                getReview: (id) => fetchLeaseContractReview(t, o, id),
                getConfirmation: (id) => fetchLeaseContractConfirmation(t, o, id),
                getTermsEvaluation: (id) => fetchLeaseContractTermsEvaluation(t, o, id),
                getClients: () => fetchFleetClients(t, o),

                create: (payload) => createLeaseContract(t, o, payload),
                update: (id, payload) => updateLeaseContract(t, o, id, payload),

                activate: (id) => activateLeaseContract(t, o, id),
                reactivate: (id) => reactivateLeaseContract(t, o, id),
                deactivate: (id) => deactivateLeaseContract(t, o, id),
                submit: (id) => submitLeaseContract(t, o, id),
                confirm: (id) => confirmLeaseContract(t, o, id),
                approve: (id) => approveLeaseContract(t, o, id),
                pauseBilling: (id) => pauseBillingLeaseContract(t, o, id),
                requestTermination: (id) => requestTerminationLeaseContract(t, o, id),
                approveTermination: (id) => approveTerminationLeaseContract(t, o, id),
                renew: (id) => renewLeaseContract(t, o, id),
            },
        };
    }, [token, organizationId]);

    return (
        <LeaseContractsContext.Provider value={value}>
            {children}
        </LeaseContractsContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access pre-bound lease contract API functions.
 * Must be used inside a <LeaseContractsProvider>.
 */
export function useLeaseApi(): LeaseContractsContextValue {
    const ctx = useContext(LeaseContractsContext);
    if (!ctx) {
        throw new Error("useLeaseApi must be used within a <LeaseContractsProvider>");
    }
    return ctx;
}
