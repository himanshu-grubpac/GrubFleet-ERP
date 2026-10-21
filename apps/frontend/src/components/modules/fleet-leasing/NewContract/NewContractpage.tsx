"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import SelectClientStep from "./SelectClientStep";

import AssetLinesStep, {
    type AssetLine,
} from "./AssetLinesStep";

import TermsStep, {
    type LeaseTerms,
    type TermsDraftSnapshot,
} from "./TermsStep";

import ReviewStep from "./ReviewStep";

import CreateClientPage, {
    type ClientFormData,
} from "@/components/modules/organization/clients/CreateClientPage";
import {
    createOrganisationClientFromForm,
    organisationClientsQueryKey,
    requireLinkedFleetClientId,
} from "@/lib/api/organisation/clients";
import { ApiClientError } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";

import {
    createLeaseContract,
    previewAssetAvailabilityBatch,
    updateLeaseContract,
    updateLeaseContractAssetLines,
    updateLeaseContractTerms,
    type CreateLeaseContractDraftPayload,
    type FleetClientDetail,
    type FleetClientListItem,
} from "@/lib/api/lease-contracts";
import { Plus } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { useGrubpacAuth } from "@/lib/auth-context";
import {
    showErrorToast,
    showSuccessToast,
} from "@/lib/toast/show-toast";
import LeaseContractStepper from "./LeaseContractStepper";
import { fleetLeaseContractEditHref } from "@/lib/navigation/fleet-static-routes";
import {
    buildPartialTermsPatch,
    termsAreComplete,
} from "@/lib/lease-contract/lease-contract-wizard.util";

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

function wizardTitle(screen: Screen, clientName: string): string {
    switch (screen) {
        case "select-client":
            return "Select client";
        case "register-client":
            return "Register client";
        case "asset-lines":
            return clientName || "Asset lines";
        case "terms":
            return "Contract terms";
        case "review":
            return "Review contract";
        default:
            return "New lease contract";
    }
}

function mapAssetLinesToApi(lines: AssetLine[]) {
    return lines.map((line) => ({
        assetClass: line.assetClass,
        committedQuantity: Number(line.committedQuantity),
        ratePerVehicleMonth: String(line.ratePerVehicleMonth || "0"),
    }));
}

function wizardDescription(screen: Screen): string | undefined {
    switch (screen) {
        case "select-client":
            return "Search by name, or pick from the list below.";
        case "register-client":
            return "Add a client to the register, then continue the lease wizard.";
        case "asset-lines":
            return "Set asset-class lines and requested quantities for this contract.";
        case "terms":
            return "Standard rate card only for this MVP — no exception pricing path.";
        case "review":
            return "Final review before the contract goes live.";
        default:
            return undefined;
    }
}

export default function NewLeaseContractPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useGrubpacAuth();

    const canCreate =
        permissions.has("fleet_leasing.create") ||
        permissions.has("fleet_leasing.manage");

    useEffect(() => {
        if (isAuthLoading) return;
        if (!canCreate) {
            router.replace("/fleet-leasing/lease-contracts");
        }
    }, [canCreate, isAuthLoading, router]);

    const [screen, setScreen] =
        useState<Screen>("select-client");

    const [draftContractId, setDraftContractId] = useState<string | null>(
        null,
    );

    const [selectedClientId, setSelectedClientId] =
        useState("");

    const [selectedClientName, setSelectedClientName] =
        useState("");

    const [registerClientDraftName, setRegisterClientDraftName] =
        useState("");

    const [assetLines, setAssetLines] =
        useState<AssetLine[]>([]);

    const [terms, setTerms] =
        useState<LeaseTerms>({
            startDate: "",
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

    const registerClientInitialData = useMemo(
        () => ({
            companyName: registerClientDraftName,
        }),
        [registerClientDraftName],
    );

    const buildDraftPayload = useCallback(
        (
            lines: AssetLine[],
            nextTerms: LeaseTerms,
        ): CreateLeaseContractDraftPayload => {
            const payload: CreateLeaseContractDraftPayload = {
                clientId: selectedClientId,
            };
            if (lines.length > 0) {
                payload.assetLines = mapAssetLinesToApi(lines);
            }
            if (termsAreComplete(nextTerms)) {
                payload.startDate = nextTerms.startDate;
                payload.termMonths = Number(nextTerms.termMonths);
                payload.securityDeposit = String(nextTerms.securityDeposit);
                payload.billingFrequency = nextTerms.billingFrequency;
            }
            return payload;
        },
        [selectedClientId],
    );

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

    const invalidateLeaseQueries = useCallback(
        async (contractId: string) => {
            await queryClient.invalidateQueries({
                queryKey: ["lease-contracts-list", organizationId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["lease-contract", organizationId, contractId],
            });
        },
        [organizationId, queryClient],
    );

    const persistWizardDraft = useCallback(
        async (options: {
            lines: AssetLine[];
            nextTerms: LeaseTerms;
            /** Skip availability shortfall filter (Continue from asset lines). */
            requireFullLines?: boolean;
        }): Promise<string> => {
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

            const payload = buildDraftPayload(
                linesToPersist,
                options.nextTerms,
            );

            let contractId = draftContractId;

            if (contractId) {
                await updateLeaseContract(token, organizationId, contractId, {
                    clientId: selectedClientId,
                    ...buildPartialTermsPatch(options.nextTerms),
                });
            } else {
                const created = await createLeaseContract(
                    token,
                    organizationId,
                    {
                        ...payload,
                        ...buildPartialTermsPatch(options.nextTerms),
                    },
                );
                contractId = created.id;
                setDraftContractId(created.id);
            }

            if (linesToPersist.length > 0) {
                await updateLeaseContractAssetLines(
                    token,
                    organizationId,
                    contractId,
                    {
                        assetLines: mapAssetLinesToApi(linesToPersist),
                    },
                );
            }

            if (termsAreComplete(options.nextTerms)) {
                await updateLeaseContractTerms(
                    token,
                    organizationId,
                    contractId,
                    {
                        startDate: options.nextTerms.startDate,
                        termMonths: Number(options.nextTerms.termMonths),
                        securityDeposit: String(
                            options.nextTerms.securityDeposit,
                        ),
                        billingFrequency: options.nextTerms.billingFrequency,
                    },
                );
            }

            await invalidateLeaseQueries(contractId);
            return contractId;
        },
        [
            buildDraftPayload,
            draftContractId,
            invalidateLeaseQueries,
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
        setWizardError(null);
        setIsPersistingStep(true);
        const draftLines = linesOverride ?? assetLines;
        const draftTerms = termsOverride ?? terms;
        try {
            const { lines, skippedDueToShortfall } =
                await resolveDraftAssetLines(draftLines);
            const wasNewDraft = !draftContractId;
            const contractId = await persistWizardDraft({
                lines,
                nextTerms: draftTerms,
            });
            if (lines.length > 0) {
                setAssetLines(lines);
            }
            setTerms(draftTerms);
            showSuccessToast("Lease contract draft saved");
            if (skippedDueToShortfall) {
                showErrorToast(
                    "Fix asset line quantities before saving lines",
                );
            }
            if (wasNewDraft) {
                router.replace(fleetLeaseContractEditHref(contractId));
            }
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

    const handleClientSelected = (client: FleetClientListItem) => {
        setWizardError(null);
        setSelectedClientId(String(client.id));
        setSelectedClientName(client.companyName ?? "");
        setScreen("asset-lines");
    };

    const handleClientCreated = async (customer: FleetClientDetail) => {
        if (!customer.id) {
            throw new Error("Created client is missing an id.");
        }

        setWizardError(null);
        setSelectedClientId(String(customer.id));
        setSelectedClientName(customer.companyName ?? "");
        setRegisterClientDraftName("");
        setScreen("asset-lines");
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

    const canSaveDraft =
        canCreate &&
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
                        setRegisterClientDraftName(
                            searchDraft?.trim() ?? "",
                        );
                        setScreen("register-client");
                    }}
                />
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
                showSaveDraft={saveDraftFooterProps.showSaveDraft}
                isSaveDraftPending={saveDraftFooterProps.isSaveDraftPending}
                onSaveDraft={(lines) => {
                    void handleSaveDraft(lines);
                }}
                onBack={() => setScreen("select-client")}
                onContinue={async (lines) => {
                    setWizardError(null);
                    setAssetLines(lines);

                    if (!token || !organizationId) {
                        setWizardError(
                            "Authentication or organization information is missing.",
                        );
                        return;
                    }

                    setIsPersistingStep(true);
                    try {
                        // Explicit Continue creates/updates draft with client + lines
                        // (no auto-draft on client selection alone).
                        await persistWizardDraft({
                            lines,
                            nextTerms: terms,
                            requireFullLines: true,
                        });
                        setScreen("terms");
                    } catch (err) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : "Could not save asset lines.";
                        setWizardError(message);
                        showErrorToast(message);
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
                    setIsPersistingStep(true);
                    try {
                        await persistWizardDraft({
                            lines: linesWithRates,
                            nextTerms,
                        });
                        setScreen("review");
                    } catch (err) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : "Could not save contract before review.";
                        setWizardError(message);
                        showErrorToast(message);
                    } finally {
                        setIsPersistingStep(false);
                    }
                }}
            />
        );
    } else if (screen === "review") {
        stepContent = draftContractId ? (
            <>
                {wizardError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {wizardError}
                    </div>
                )}
                <ReviewStep
                    clientName={selectedClientName}
                    draftContractId={draftContractId}
                    assetLines={assetLines}
                    terms={terms}
                    {...saveDraftFooterProps}
                    onBack={() => setScreen("terms")}
                />
            </>
        ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Draft contract was not created. Go back to client selection and
                try again.
            </div>
        );
    }


    return (
        <OrganizationFormLayout
            title={wizardTitle(screen, selectedClientName)}
            description={wizardDescription(screen)}
            contentVariant="plain"
            backLink={{
                label: "Back to lease contracts",
                href: "/fleet-leasing/lease-contracts/",
            }}
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
                        onClick={() =>
                            setScreen("register-client")
                        }
                    >
                        Add new client
                    </Button>
                ) : undefined
            }
        >
            {stepContent}
        </OrganizationFormLayout>
    );
}
