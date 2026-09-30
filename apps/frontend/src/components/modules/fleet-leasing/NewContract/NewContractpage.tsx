"use client";

import { useState } from "react";
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
    FleetClientListItem,
} from "@/lib/api/lease-contracts";
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
    const [screen, setScreen] =
        useState<Screen>("select-client");

    const [selectedClientId, setSelectedClientId] =
        useState("");

    const [selectedClientName, setSelectedClientName] =
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

    const handleClientSelected = (
        client: FleetClientListItem,
    ) => {
        setSelectedClientId(
            String(client.id),
        );

        setSelectedClientName(
            client.companyName ?? "",
        );

        setScreen("asset-lines");
    };

    const handleClientCreated = (
        customer: unknown,
    ) => {
        const response =
            customer as {
                id?: string;
                clientId?: string;
                customerId?: string;
                companyName?: string;

                data?: {
                    id?: string;
                    clientId?: string;
                    customerId?: string;
                    companyName?: string;
                };
            };

        const createdClientId =
            response?.id ??
            response?.clientId ??
            response?.customerId ??
            response?.data?.id ??
            response?.data?.clientId ??
            response?.data?.customerId;

        const createdClientName =
            response?.companyName ??
            response?.data?.companyName ??
            "";

        if (!createdClientId) {
            console.error(
                "Customer was created, but no client ID was returned:",
                customer,
            );

            return;
        }

        setSelectedClientId(
            String(createdClientId),
        );

        setSelectedClientName(
            createdClientName,
        );

        setScreen("asset-lines");
    };

    let stepContent: ReactNode = null;

    if (screen === "select-client") {
        stepContent = (
            <SelectClientStep
                onClientSelected={
                    handleClientSelected
                }
                onAddNewClient={() =>
                    setScreen(
                        "register-client",
                    )
                }
            />
        );
    } else if (screen === "register-client") {
        stepContent = (
            <CustomerRegistrationForm
                onSuccess={
                    handleClientCreated
                }
                onCancel={() =>
                    setScreen(
                        "select-client",
                    )
                }
                redirectOnSuccess={false}
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
                onContinue={(lines) => {
                    setAssetLines(
                        lines,
                    );

                    setScreen(
                        "terms",
                    );
                }}
            />
        );
    } else if (screen === "terms") {
        stepContent = (
            <TermsStep
                clientName={
                    selectedClientName
                }
                initialTerms={terms}
                onBack={() =>
                    setScreen(
                        "asset-lines",
                    )
                }
                onContinue={(
                    nextTerms,
                ) => {
                    setTerms(
                        nextTerms,
                    );

                    setScreen(
                        "review",
                    );
                }}
            />
        );
    } else {
        stepContent = (
            <ReviewStep
                clientId={
                    selectedClientId
                }
                clientName={
                    selectedClientName
                }
                assetLines={
                    assetLines
                }
                terms={terms}
                onBack={() =>
                    setScreen(
                        "terms",
                    )
                }
            />
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
