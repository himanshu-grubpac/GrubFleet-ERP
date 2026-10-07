"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import SelectClientStep from "./SelectClientStep";

import AssetLinesStep, {
    type AssetLine,
} from "./AssetLinesStep";

import TermsStep, {
    type LeaseTerms,
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

import type {
    FleetClientDetail,
    FleetClientListItem,
} from "@/lib/api/lease-contracts";
import {
    createLeaseContract,
    updateLeaseContract,
    updateLeaseContractAssetLines,
    updateLeaseContractTerms,
} from "@/lib/api/lease-contracts";
import { Plus } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { useGrubpacAuth } from "@/lib/auth-context";
import { showErrorToast } from "@/lib/toast/show-toast";
import LeaseContractStepper from "./LeaseContractStepper";

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

    const ensureDraftWithClient = useCallback(
        async (clientId: string): Promise<string> => {
            if (!token || !organizationId) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }

            if (draftContractId) {
                await updateLeaseContract(token, organizationId, draftContractId, {
                    clientId,
                });
                return draftContractId;
            }

            const created = await createLeaseContract(token, organizationId, {
                clientId,
            });
            setDraftContractId(created.id);
            return created.id;
        },
        [draftContractId, organizationId, token],
    );

    const handleClientSelected = async (client: FleetClientListItem) => {
        setWizardError(null);
        setIsPersistingStep(true);
        try {
            await ensureDraftWithClient(String(client.id));
            setSelectedClientId(String(client.id));
            setSelectedClientName(client.companyName ?? "");
            setScreen("asset-lines");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not start draft contract.";
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
            await ensureDraftWithClient(String(customer.id));
            setSelectedClientId(String(customer.id));
            setSelectedClientName(customer.companyName ?? "");
            setRegisterClientDraftName("");
            setScreen("asset-lines");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not start draft contract.";
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
                {isPersistingStep && (
                    <p className="mt-2 text-xs text-slate-500">
                        Preparing draft contract…
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
                clientId={
                    selectedClientId
                }
                clientName={
                    selectedClientName
                }
                initialAssetLines={
                    assetLines
                }
                onBack={() =>
                    setScreen(
                        "select-client",
                    )
                }
                onContinue={async (lines, options) => {
                    if (!token || !organizationId || !draftContractId) {
                        setWizardError(
                            "Draft contract is missing. Select a client again.",
                        );
                        return;
                    }
                    setWizardError(null);
                    setIsPersistingStep(true);
                    try {
                        await updateLeaseContractAssetLines(
                            token,
                            organizationId,
                            draftContractId,
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
                onBack={() => setScreen("asset-lines")}
                onContinue={async (nextTerms, linesWithRates) => {
                    if (!token || !organizationId || !draftContractId) {
                        setWizardError(
                            "Draft contract is missing. Select a client again.",
                        );
                        return;
                    }
                    setWizardError(null);
                    setIsPersistingStep(true);
                    try {
                        await updateLeaseContractAssetLines(
                            token,
                            organizationId,
                            draftContractId,
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
                            draftContractId,
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
                        setTerms(nextTerms);
                        setAssetLines(linesWithRates);
                        setScreen("review");
                    } catch (err) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : "Could not save contract terms.";
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

    const listBackLink = {
        label: "Back to lease contracts",
        href: "/fleet-leasing/lease-contracts",
    } as const;

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
