"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import {
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
    terminateLeaseContract,
    fetchRenewalsExtensionsList,
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
        getList: (options?: {
            page?: number;
            pageSize?: number;
            statusFilter?: LeaseContractStatusFilter;
            search?: string;
        }) => ReturnType<typeof fetchLeaseContractsList>;
        getRenewalEligibleList: (options?: {
            page?: number;
            pageSize?: number;
            search?: string;
        }) => ReturnType<typeof fetchRenewalsExtensionsList>;
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
        deactivate: (
            contractId: string,
            reason: string,
        ) => ReturnType<typeof deactivateLeaseContract>;
        submit: (contractId: string) => ReturnType<typeof submitLeaseContract>;
        confirm: (contractId: string) => ReturnType<typeof confirmLeaseContract>;
        approve: (contractId: string) => ReturnType<typeof approveLeaseContract>;
        pauseBilling: (contractId: string) => ReturnType<typeof pauseBillingLeaseContract>;
        terminate: (contractId: string) => ReturnType<typeof terminateLeaseContract>;
        renew: (
            contractId: string,
            payload: Parameters<typeof renewLeaseContract>[3],
        ) => ReturnType<typeof renewLeaseContract>;
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
                getList: (opts) => fetchLeaseContractsList(t, o, opts),
                getRenewalEligibleList: (opts) =>
                    fetchRenewalsExtensionsList(t, o, opts),
                getById: (id) => fetchLeaseContractById(t, o, id),
                getReview: (id) => fetchLeaseContractReview(t, o, id),
                getConfirmation: (id) => fetchLeaseContractConfirmation(t, o, id),
                getTermsEvaluation: (id) => fetchLeaseContractTermsEvaluation(t, o, id),
                getClients: () => fetchFleetClients(t, o),

                create: (payload) => createLeaseContract(t, o, payload),
                update: (id, payload) => updateLeaseContract(t, o, id, payload),

                activate: (id) => activateLeaseContract(t, o, id),
                reactivate: (id) => reactivateLeaseContract(t, o, id),
                deactivate: (id, reason) =>
                    deactivateLeaseContract(t, o, id, reason),
                submit: (id) => submitLeaseContract(t, o, id),
                confirm: (id) => confirmLeaseContract(t, o, id),
                approve: (id) => approveLeaseContract(t, o, id),
                pauseBilling: (id) => pauseBillingLeaseContract(t, o, id),
                terminate: (id) => terminateLeaseContract(t, o, id),
                renew: (id, payload) => renewLeaseContract(t, o, id, payload),
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
