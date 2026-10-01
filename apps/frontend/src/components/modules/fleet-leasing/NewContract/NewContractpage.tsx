"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import SelectClientStep from "./SelectClientStep";

import AssetLinesStep, {
    type AssetLine,
} from "./AssetLinesStep";

import TermsStep, {
    type LeaseTerms,
} from "./TermsStep";

import ReviewStep from "./ReviewStep";

import CustomerRegistrationForm from "./CustomerRegistrationForm";

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
import { useGrubpacAuth } from "@/lib/auth-context";
import NewContractWizardShell from "./NewContractWizardShell";

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

export default function NewLeaseContractPage() {
    const { token, organizationId } = useGrubpacAuth();

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
            setWizardError(
                err instanceof Error
                    ? err.message
                    : "Could not start draft contract.",
            );
        } finally {
            setIsPersistingStep(false);
        }
    };

    const handleClientCreated = async (customer: FleetClientDetail) => {
        if (!customer.id) {
            return;
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
            setWizardError(
                err instanceof Error
                    ? err.message
                    : "Could not start draft contract.",
            );
        } finally {
            setIsPersistingStep(false);
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
            <CustomerRegistrationForm
                initialCompanyName={
                    registerClientDraftName
                }
                onSuccess={(customer) => {
                    void handleClientCreated(customer);
                }}
                onCancel={() => {
                    setRegisterClientDraftName("");
                    setScreen("select-client");
                }}
            />
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
                onContinue={async (lines) => {
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
                            },
                        );
                        setAssetLines(lines);
                        setScreen("terms");
                    } catch (err) {
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
                clientName={selectedClientName}
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

    return (
        <NewContractWizardShell
            currentStep={SCREEN_STEP[screen]}
        >
            {stepContent}
        </NewContractWizardShell>
    );
}
