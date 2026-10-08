"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import SelectClientStep from "@/components/modules/fleet-leasing/NewContract/SelectClientStep";
import AssetLinesStep, {
    type AssetLine,
} from "@/components/modules/fleet-leasing/NewContract/AssetLinesStep";
import TermsStep, {
    type LeaseTerms,
} from "@/components/modules/fleet-leasing/NewContract/TermsStep";
import ReviewStep from "@/components/modules/fleet-leasing/NewContract/ReviewStep";
import CreateClientPage, {
    type ClientFormData,
} from "@/components/modules/organization/clients/CreateClientPage";
import {
    createOrganisationClientFromForm,
    organisationClientsQueryKey,
    requireLinkedFleetClientId,
} from "@/lib/api/organisation/clients";
import { ApiClientError } from "@/lib/api/client";
import LeaseContractStepper from "@/components/modules/fleet-leasing/NewContract/LeaseContractStepper";
import Button from "@/components/ui/GrubpacButton";
import { Plus } from "lucide-react";
import { useGrubpacAuth } from "@/lib/auth-context";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import {
    updateLeaseContract,
    updateLeaseContractAssetLines,
    updateLeaseContractTerms,
    type FleetClientDetail,
    type FleetClientListItem,
    type LeaseContractDetail,
} from "@/lib/api/lease-contracts";
import {
    showErrorToast,
    showLeaseContractUpdatedToast,
} from "@/lib/toast/show-toast";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { fleetLeaseContractDetailHref } from "@/lib/navigation/fleet-static-routes";

type Screen =
    | "select-client"
    | "register-client"
    | "asset-lines"
    | "terms"
    | "review";

const SCREEN_STEP: Record<Screen, 1 | 2 | 3 | 4> = {
    "select-client": 1,
    "register-client": 1,
    "asset-lines": 2,
    terms: 3,
    review: 4,
};

const LEASE_EDIT_BLOCKED_RAW_STATUSES = new Set([
    "deactivated",
    "billing_paused",
    "pending_termination",
    "closed",
    "concluded",
]);

function isEditAllowed(
    detail: LeaseContractDetail,
): boolean {
    if (LEASE_EDIT_BLOCKED_RAW_STATUSES.has(detail.rawStatus)) {
        return false;
    }
    const actions = detail.availableActions;
    if (!actions) return false;
    if (Array.isArray(actions)) {
        return actions.includes("edit");
    }
    return actions.editContract?.allowed === true;
}

function mapDetailToAssetLines(
    detail: LeaseContractDetail,
): AssetLine[] {
    return detail.assetLines.map((line) => ({
        id: line.id,
        assetClass: line.assetClass,
        committedQuantity: line.committedQuantity,
        ratePerVehicleMonth: String(line.ratePerVehicleMonth ?? ""),
    }));
}

function mapDetailToTerms(detail: LeaseContractDetail): LeaseTerms {
    return {
        startDate: detail.startDate ?? "",
        termMonths: detail.termMonths ?? "",
        securityDeposit:
            detail.securityDeposit != null
                ? String(detail.securityDeposit)
                : "",
        billingFrequency:
            (detail.billingFrequency as LeaseTerms["billingFrequency"]) ??
            "monthly",
    };
}

function wizardTitle(screen: Screen, clientName: string): string {
    switch (screen) {
        case "select-client":
            return "Edit — select client";
        case "register-client":
            return "Register client";
        case "asset-lines":
            return clientName || "Asset lines";
        case "terms":
            return "Contract terms";
        case "review":
            return "Review contract";
        default:
            return "Edit lease contract";
    }
}

function wizardDescription(screen: Screen): string | undefined {
    switch (screen) {
        case "select-client":
            return "Change the client linked to this contract, or continue with the current selection.";
        case "asset-lines":
            return "Update asset-class lines and quantities.";
        case "terms":
            return "Update dates, deposit, and billing frequency.";
        case "review":
            return "Review changes before submitting the draft.";
        default:
            return undefined;
    }
}

interface EditLeaseContractPageProps {
    leaseId: string;
}

export default function EditLeaseContractPage({
    leaseId,
}: EditLeaseContractPageProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useGrubpacAuth();
    const { api } = useLeaseApi();

    const canUpdate =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const detailHref = fleetLeaseContractDetailHref(leaseId);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!canUpdate) {
            router.replace(detailHref);
        }
    }, [canUpdate, detailHref, isAuthLoading, router]);

    const contractQuery = useQuery({
        queryKey: ["lease-contract", organizationId, leaseId],
        queryFn: () => api.getById(leaseId),
        ...dashboardListQueryOptions,
        enabled: Boolean(organizationId && leaseId),
    });

    const contract = contractQuery.data;
    const isDraft = contract?.rawStatus === "draft";

    const [initialized, setInitialized] = useState(false);
    const [screen, setScreen] = useState<Screen>("asset-lines");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedClientName, setSelectedClientName] = useState("");
    const [registerClientDraftName, setRegisterClientDraftName] = useState("");
    const [assetLines, setAssetLines] = useState<AssetLine[]>([]);
    const [terms, setTerms] = useState<LeaseTerms>({
        startDate: "",
        termMonths: "",
        securityDeposit: "",
        billingFrequency: "monthly",
    });
    const [wizardError, setWizardError] = useState<string | null>(null);
    const [isPersistingStep, setIsPersistingStep] = useState(false);

    useEffect(() => {
        if (!contract || initialized) return;
        if (!isEditAllowed(contract)) {
            router.replace(detailHref);
            return;
        }
        const clientId = contract.client?.id ?? "";
        setSelectedClientId(String(clientId));
        setSelectedClientName(contract.client?.companyName ?? "");
        setAssetLines(mapDetailToAssetLines(contract));
        setTerms(mapDetailToTerms(contract));
        setScreen(clientId ? "asset-lines" : "select-client");
        setInitialized(true);
    }, [contract, detailHref, initialized, router]);

    const persistClient = useCallback(
        async (clientId: string) => {
            if (!token || !organizationId) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }
            await updateLeaseContract(token, organizationId, leaseId, {
                clientId,
                ...(isDraft ? {} : { editClassification: "material" }),
            });
        },
        [isDraft, leaseId, organizationId, token],
    );

    const invalidateContract = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: ["lease-contract", organizationId, leaseId],
        });
        await queryClient.invalidateQueries({
            queryKey: ["lease-contracts-list", organizationId],
        });
    }, [leaseId, organizationId, queryClient]);

    const finishNonDraftSave = useCallback(async () => {
        await invalidateContract();
        showLeaseContractUpdatedToast();
        router.push(detailHref);
    }, [detailHref, invalidateContract, router]);

    const handleClientSelected = async (client: FleetClientListItem) => {
        setWizardError(null);
        setIsPersistingStep(true);
        try {
            await persistClient(String(client.id));
            setSelectedClientId(String(client.id));
            setSelectedClientName(client.companyName ?? "");
            setScreen("asset-lines");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not update client on contract.";
            setWizardError(message);
            showErrorToast(message);
        } finally {
            setIsPersistingStep(false);
        }
    };

    const handleClientCreated = async (customer: FleetClientDetail) => {
        if (!customer.id) {
            throw new Error("Created client is missing an id.");
        }
        setWizardError(null);
        setIsPersistingStep(true);
        try {
            await persistClient(String(customer.id));
            setSelectedClientId(String(customer.id));
            setSelectedClientName(customer.companyName ?? "");
            setRegisterClientDraftName("");
            setScreen("asset-lines");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not update client on contract.";
            setWizardError(message);
            showErrorToast(message);
            throw new Error(message);
        } finally {
            setIsPersistingStep(false);
        }
    };

    const handleRegisterClientSaved = async (data: ClientFormData) => {
        if (!token || !organizationId) {
            throw new Error(
                "Authentication or organization information is missing.",
            );
        }

        try {
            const created = await createOrganisationClientFromForm(
                token,
                organizationId,
                {
                    clientName: data.companyName,
                    address: data.address,
                    pointsOfContact: data.pointsOfContact,
                },
            );
            const fleetClientId = requireLinkedFleetClientId(created);
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: organisationClientsQueryKey(organizationId),
                }),
                queryClient.invalidateQueries({
                    queryKey: ["organization", "clients"],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["fleet-leasing-clients", organizationId],
                }),
            ]);
            await handleClientCreated({
                id: fleetClientId,
                companyName: created.clientName,
            } as FleetClientDetail);
        } catch (error) {
            const message =
                error instanceof ApiClientError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "Could not save client.";
            showErrorToast(message);
            throw error;
        }
    };

    const listBackLink = useMemo(
        () => ({
            label: "Back to contract",
            href: detailHref,
        }),
        [detailHref],
    );

    if (contractQuery.isLoading || !initialized) {
        return (
            <OrganizationFormLayout
                title="Edit lease contract"
                description="Loading contract…"
                contentVariant="plain"
                backLink={listBackLink}
            >
                <div
                    className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600"
                    aria-busy="true"
                >
                    Loading contract details…
                </div>
            </OrganizationFormLayout>
        );
    }

    if (contractQuery.isError || !contract) {
        return (
            <OrganizationFormLayout
                title="Edit lease contract"
                contentVariant="plain"
                backLink={listBackLink}
            >
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Could not load this contract. Return to the detail view and
                    try again.
                </div>
            </OrganizationFormLayout>
        );
    }

    let stepContent: ReactNode = null;

    if (screen === "select-client") {
        stepContent = (
            <>
                {wizardError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {wizardError}
                    </div>
                )}
                <SelectClientStep
                    onClientSelected={(client) => {
                        void handleClientSelected(client);
                    }}
                    onAddNewClient={(searchDraft) => {
                        setRegisterClientDraftName(searchDraft?.trim() ?? "");
                        setScreen("register-client");
                    }}
                />
                {isPersistingStep && (
                    <p className="mt-2 text-xs text-slate-500">
                        Saving client…
                    </p>
                )}
            </>
        );
    } else if (screen === "register-client") {
        stepContent = (
            <>
                {wizardError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {wizardError}
                    </div>
                )}
                <CreateClientPage
                    variant="embedded"
                    initialData={{
                        companyName: registerClientDraftName,
                    }}
                    onSaved={handleRegisterClientSaved}
                    onCancel={() => {
                        setRegisterClientDraftName("");
                        setScreen("select-client");
                    }}
                />
            </>
        );
    } else if (screen === "asset-lines") {
        stepContent = (
            <AssetLinesStep
                clientId={selectedClientId}
                clientName={selectedClientName}
                initialAssetLines={assetLines}
                onBack={() => setScreen("select-client")}
                onContinue={async (lines, options) => {
                    if (!token || !organizationId) {
                        setWizardError(
                            "Authentication or organization information is missing.",
                        );
                        return;
                    }
                    setWizardError(null);
                    setIsPersistingStep(true);
                    try {
                        await updateLeaseContractAssetLines(
                            token,
                            organizationId,
                            leaseId,
                            {
                                assetLines: lines.map((line) => ({
                                    assetClass: line.assetClass,
                                    committedQuantity: Number(
                                        line.committedQuantity,
                                    ),
                                    ratePerVehicleMonth: String(
                                        line.ratePerVehicleMonth || "0",
                                    ),
                                })),
                                confirmShortfall:
                                    options?.confirmShortfall === true,
                            },
                        );
                        setAssetLines(lines);
                        setScreen("terms");
                    } catch (err) {
                        showErrorToast(
                            err instanceof Error
                                ? err.message
                                : "Could not save asset lines.",
                        );
                        setWizardError(
                            err instanceof Error
                                ? err.message
                                : "Could not save asset lines.",
                        );
                    } finally {
                        setIsPersistingStep(false);
                    }
                }}
            />
        );
    } else if (screen === "terms") {
        stepContent = (
            <TermsStep
                assetLines={assetLines}
                initialTerms={terms}
                onBack={() => setScreen("asset-lines")}
                onContinue={async (nextTerms, linesWithRates) => {
                    if (!token || !organizationId) {
                        setWizardError(
                            "Authentication or organization information is missing.",
                        );
                        return;
                    }
                    setWizardError(null);
                    setIsPersistingStep(true);
                    try {
                        await updateLeaseContractAssetLines(
                            token,
                            organizationId,
                            leaseId,
                            {
                                assetLines: linesWithRates.map((line) => ({
                                    assetClass: line.assetClass,
                                    committedQuantity: Number(
                                        line.committedQuantity,
                                    ),
                                    ratePerVehicleMonth: String(
                                        line.ratePerVehicleMonth,
                                    ),
                                })),
                            },
                        );
                        await updateLeaseContractTerms(
                            token,
                            organizationId,
                            leaseId,
                            {
                                startDate: nextTerms.startDate,
                                termMonths: Number(nextTerms.termMonths),
                                securityDeposit: String(
                                    nextTerms.securityDeposit,
                                ),
                                billingFrequency:
                                    nextTerms.billingFrequency,
                            },
                        );
                        if (!isDraft) {
                            await updateLeaseContract(
                                token,
                                organizationId,
                                leaseId,
                                { editClassification: "material" },
                            );
                        }
                        setTerms(nextTerms);
                        setAssetLines(linesWithRates);
                        if (isDraft) {
                            setScreen("review");
                        } else {
                            await finishNonDraftSave();
                        }
                    } catch (err) {
                        showErrorToast(
                            err instanceof Error
                                ? err.message
                                : "Could not save contract terms.",
                        );
                        setWizardError(
                            err instanceof Error
                                ? err.message
                                : "Could not save contract terms.",
                        );
                    } finally {
                        setIsPersistingStep(false);
                    }
                }}
            />
        );
    } else if (screen === "review" && isDraft) {
        stepContent = (
            <>
                {wizardError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {wizardError}
                    </div>
                )}
                <ReviewStep
                    clientName={selectedClientName}
                    draftContractId={leaseId}
                    assetLines={assetLines}
                    terms={terms}
                    onBack={() => setScreen("terms")}
                />
            </>
        );
    }

    const backLink =
        screen === "register-client"
            ? {
                  label: "Back to client selection",
                  onClick: () => {
                      setRegisterClientDraftName("");
                      setScreen("select-client");
                  },
              }
            : listBackLink;

    return (
        <OrganizationFormLayout
            title={wizardTitle(screen, selectedClientName)}
            description={wizardDescription(screen)}
            contentVariant="plain"
            beforeHeader={
                <LeaseContractStepper currentStep={SCREEN_STEP[screen]} />
            }
            backLink={backLink}
            headerAction={
                screen === "select-client" ? (
                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={() => setScreen("register-client")}
                    >
                        Add new client
                    </Button>
                ) : undefined
            }
        >
            {stepContent}
            {isPersistingStep && screen !== "select-client" ? (
                <p className="mt-2 text-xs text-slate-500">Saving…</p>
            ) : null}
        </OrganizationFormLayout>
    );
}
