"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import SelectClientStep from "@/components/modules/fleet-leasing/NewContract/SelectClientStep";
import AssetLinesStep, {
    type AssetLine,
    type AssetLineEditConstraints,
} from "@/components/modules/fleet-leasing/NewContract/AssetLinesStep";
import TermsStep, {
    type LeaseTerms,
    type TermsDraftSnapshot,
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
    previewAssetAvailabilityBatch,
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
    showSuccessToast,
} from "@/lib/toast/show-toast";
import {
    buildCompleteTermsApiPayload,
    buildPartialTermsPatch,
    computeLeaseEndDateIso,
    inferDraftWizardResumeScreen,
    mapDetailToWizardAssetLines,
    termsAreComplete,
} from "@/lib/lease-contract/lease-contract-wizard.util";
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

function mapDetailToTerms(detail: LeaseContractDetail): LeaseTerms {
    const startDate = detail.startDate ?? "";
    const termMonths = detail.termMonths ?? "";
    const endDate =
        detail.endDate?.trim() ||
        computeLeaseEndDateIso(startDate, termMonths);

    return {
        startDate,
        endDate,
        termMonths,
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

    const activeEditLineConstraints = useMemo(() => {
        if (isDraft || !contract) {
            return undefined;
        }
        const map: Record<string, AssetLineEditConstraints> = {};
        for (const line of contract.assetLines) {
            const allocated = line.allocatedCount ?? 0;
            map[line.id] = {
                lockAssetClass: true,
                lockRemove: true,
                minCommittedQuantity: Math.max(1, allocated),
            };
        }
        return map;
    }, [contract, isDraft]);

    const [initialized, setInitialized] = useState(false);
    const [screen, setScreen] = useState<Screen>("asset-lines");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedClientName, setSelectedClientName] = useState("");
    const [registerClientDraftName, setRegisterClientDraftName] = useState("");
    const registerClientInitialData = useMemo(
        () => ({
            companyName: registerClientDraftName,
        }),
        [registerClientDraftName],
    );
    const [assetLines, setAssetLines] = useState<AssetLine[]>([]);
    const [terms, setTerms] = useState<LeaseTerms>({
        startDate: "",
        endDate: "",
        termMonths: "",
        securityDeposit: "",
        billingFrequency: "monthly",
    });
    const [wizardError, setWizardError] = useState<string | null>(null);
    const [isPersistingStep, setIsPersistingStep] = useState(false);
    const [assetLinesAvailabilityRefreshKey, setAssetLinesAvailabilityRefreshKey] =
        useState(0);

    useEffect(() => {
        if (screen === "asset-lines") {
            setAssetLinesAvailabilityRefreshKey((previous) => previous + 1);
        }
    }, [screen]);

    useEffect(() => {
        if (!contract || initialized) return;
        if (!isEditAllowed(contract)) {
            router.replace(detailHref);
            return;
        }
        const clientId = contract.client?.id ?? "";
        setSelectedClientId(String(clientId));
        setSelectedClientName(contract.client?.companyName ?? "");
        setAssetLines(mapDetailToWizardAssetLines(contract));
        setTerms(mapDetailToTerms(contract));
        setScreen(
            isDraft
                ? inferDraftWizardResumeScreen(contract)
                : clientId
                    ? "asset-lines"
                    : "select-client",
        );
        setInitialized(true);
    }, [contract, detailHref, initialized, isDraft, router]);

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

    const resolveDraftAssetLines = useCallback(
        async (
            lines: AssetLine[],
        ): Promise<{
            lines: AssetLine[];
            skippedDueToShortfall: boolean;
        }> => {
            if (lines.length === 0) {
                return { lines: [], skippedDueToShortfall: false };
            }

            const linesReady = lines.every(
                (line) =>
                    line.assetClass.trim().length > 0 &&
                    line.committedQuantity >= 1,
            );
            if (!linesReady) {
                return { lines: [], skippedDueToShortfall: true };
            }

            if (!token || !organizationId) {
                return { lines: [], skippedDueToShortfall: false };
            }

            const preview = await previewAssetAvailabilityBatch(
                token,
                organizationId,
                lines.map((line) => ({
                    assetClass: line.assetClass,
                    committedQuantity: line.committedQuantity,
                })),
            );

            if (!preview.mvpAllLinesCovered) {
                return { lines: [], skippedDueToShortfall: true };
            }

            return { lines, skippedDueToShortfall: false };
        },
        [organizationId, token],
    );

    const persistDraftWizardState = useCallback(
        async (options: {
            lines: AssetLine[];
            nextTerms: LeaseTerms;
            requireFullLines?: boolean;
        }) => {
            if (!token || !organizationId) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }
            if (!selectedClientId) {
                throw new Error("Select a client before saving a draft.");
            }

            let linesToPersist = options.lines;
            if (!options.requireFullLines && linesToPersist.length > 0) {
                const resolved = await resolveDraftAssetLines(linesToPersist);
                linesToPersist = resolved.lines;
            }

            await updateLeaseContract(token, organizationId, leaseId, {
                clientId: selectedClientId,
                ...buildPartialTermsPatch(options.nextTerms),
            });

            if (linesToPersist.length > 0) {
                await updateLeaseContractAssetLines(
                    token,
                    organizationId,
                    leaseId,
                    {
                        assetLines: linesToPersist.map((line) => ({
                            assetClass: line.assetClass,
                            committedQuantity: Number(line.committedQuantity),
                            ratePerVehicleMonth: String(
                                line.ratePerVehicleMonth || "0",
                            ),
                        })),
                    },
                );
            }

            if (termsAreComplete(options.nextTerms)) {
                const termsPayload = buildCompleteTermsApiPayload(
                    options.nextTerms,
                );
                if (termsPayload) {
                    await updateLeaseContractTerms(
                        token,
                        organizationId,
                        leaseId,
                        termsPayload,
                    );
                }
            }

            await invalidateContract();
        },
        [
            invalidateContract,
            leaseId,
            organizationId,
            resolveDraftAssetLines,
            selectedClientId,
            token,
        ],
    );


    const handleSaveDraft = async (
        linesOverride?: AssetLine[],
        termsOverride?: LeaseTerms,
    ) => {
        if (isPersistingStep) return;

        setWizardError(null);
        setIsPersistingStep(true);

        const draftLines = linesOverride ?? assetLines;
        const draftTerms = termsOverride ?? terms;

        try {
            const { lines, skippedDueToShortfall } =
                await resolveDraftAssetLines(draftLines);

            // Save changes using the existing edit-page API.
            await persistDraftWizardState({
                lines,
                nextTerms: draftTerms,
                requireFullLines: true,
            });

            if (lines.length > 0) {
                setAssetLines(lines);
            }

            setTerms(draftTerms);

            if (skippedDueToShortfall) {
                showErrorToast(
                    "Fix asset line quantities before saving lines",
                );
            }

            showSuccessToast("Lease contract draft saved");

            // Return to the lease contracts dashboard after a successful save.
            router.replace("/fleet-leasing/lease-contracts");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not save draft contract.";

            setWizardError(message);
            showErrorToast(message);
        } finally {
            setIsPersistingStep(false);
        }
    };



    const handleSaveDraftFromTerms = async (snapshot: TermsDraftSnapshot) => {
        setTerms(snapshot.terms);
        setAssetLines(snapshot.assetLinesWithRates);
        await handleSaveDraft(
            snapshot.assetLinesWithRates,
            snapshot.terms,
        );
    };

    const canSaveDraft =
        isDraft &&
        canUpdate &&
        Boolean(selectedClientId) &&
        screen !== "select-client" &&
        screen !== "register-client";

    const saveDraftFooterProps = {
        showSaveDraft: canSaveDraft,
        isSaveDraftPending: isPersistingStep,
        onSaveDraft: () => {
            void handleSaveDraft();
        },
    };

    const handleClientSelected = async (client: FleetClientListItem) => {
        setWizardError(null);
        if (isDraft) {
            setSelectedClientId(String(client.id));
            setSelectedClientName(client.companyName ?? "");
            setScreen("asset-lines");
            return;
        }
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
        if (isDraft) {
            setSelectedClientId(String(customer.id));
            setSelectedClientName(customer.companyName ?? "");
            setRegisterClientDraftName("");
            setScreen("asset-lines");
            return;
        }
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



    if (contractQuery.isLoading || !initialized) {
        return (
            <OrganizationFormLayout
                title="Edit lease contract"
                description="Loading contract…"
                contentVariant="plain"

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
                    initialData={registerClientInitialData}
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
                availabilityRefreshKey={assetLinesAvailabilityRefreshKey}
                draftContractId={leaseId}
                lineConstraintsById={activeEditLineConstraints}
                shortfallProceedMode={isDraft ? "block" : "confirm"}
                showSaveDraft={saveDraftFooterProps.showSaveDraft}
                isSaveDraftPending={saveDraftFooterProps.isSaveDraftPending}
                onSaveDraft={(lines) => {
                    void handleSaveDraft(lines);
                }}
                onBack={() => setScreen("select-client")}
                onContinue={async (lines, continueOptions) => {
                    setWizardError(null);
                    setAssetLines(lines);
                    if (isDraft) {
                        setScreen("terms");
                        return;
                    }
                    if (!token || !organizationId) {
                        setWizardError(
                            "Authentication or organization information is missing.",
                        );
                        return;
                    }
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
                                ...(continueOptions?.confirmShortfall
                                    ? { confirmShortfall: true }
                                    : {}),
                            },
                        );
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
                showSaveDraft={saveDraftFooterProps.showSaveDraft}
                isSaveDraftPending={saveDraftFooterProps.isSaveDraftPending}
                onSaveDraft={(snapshot) => {
                    void handleSaveDraftFromTerms(snapshot);
                }}
                onBack={() => setScreen("asset-lines")}
                onContinue={async (nextTerms, linesWithRates) => {
                    setWizardError(null);
                    setTerms(nextTerms);
                    setAssetLines(linesWithRates);
                    if (isDraft) {
                        setScreen("review");
                        return;
                    }
                    if (!token || !organizationId) {
                        setWizardError(
                            "Authentication or organization information is missing.",
                        );
                        return;
                    }
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
                        await updateLeaseContract(
                            token,
                            organizationId,
                            leaseId,
                            {
                                startDate: nextTerms.startDate,
                                endDate:
                                    nextTerms.endDate.trim() ||
                                    computeLeaseEndDateIso(
                                        nextTerms.startDate,
                                        nextTerms.termMonths,
                                    ),
                                termMonths: Number(nextTerms.termMonths),
                                securityDeposit: String(
                                    nextTerms.securityDeposit,
                                ),
                                billingFrequency: nextTerms.billingFrequency,
                                editClassification: "material",
                            },
                        );
                        await finishNonDraftSave();
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
                    {...saveDraftFooterProps}
                    onBack={() => setScreen("terms")}
                />
            </>
        );
    }


    return (
        <OrganizationFormLayout
            title={wizardTitle(screen, selectedClientName)}
            description={wizardDescription(screen)}
            contentVariant="plain"
            beforeHeader={
                <LeaseContractStepper currentStep={SCREEN_STEP[screen]} />
            }

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
