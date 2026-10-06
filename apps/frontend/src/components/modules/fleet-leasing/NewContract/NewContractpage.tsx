"use client";

import { useState } from "react";

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

type Screen =
    | "select-client"
    | "register-client"
    | "asset-lines"
    | "terms"
    | "review";

export default function NewLeaseContractPage() {
    // ============================================================
    // CURRENT SCREEN
    // ============================================================

    const [screen, setScreen] =
        useState<Screen>("select-client");

    // ============================================================
    // SELECTED CLIENT
    // ============================================================

    const [selectedClientId, setSelectedClientId] =
        useState("");

    const [selectedClientName, setSelectedClientName] =
        useState("");

    // ============================================================
    // ASSET LINES
    // ============================================================

    const [assetLines, setAssetLines] =
        useState<AssetLine[]>([]);

    // ============================================================
    // LEASE TERMS
    // ============================================================

    const [terms, setTerms] =
        useState<LeaseTerms>({
            startDate: "",
            termMonths: "",
            securityDeposit: "",
            billingFrequency: "monthly",
        });

    // ============================================================
    // EXISTING CLIENT SELECTED
    // ============================================================

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

    // ============================================================
    // NEW CLIENT CREATED
    // ============================================================

    const handleClientCreated = (
        customer: unknown,
    ) => {
        /*
         * Keep the response extraction defensive until
         * the exact POST /clients response is confirmed.
         */

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

        // Newly created client becomes the selected client.
        // Continue directly to Asset Lines.
        setScreen("asset-lines");
    };

    // ============================================================
    // SELECT CLIENT
    // ============================================================

    if (screen === "select-client") {
        return (
            <div className="min-h-full w-full bg-[#f7f7f7]">
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
            </div>
        );
    }

    // ============================================================
    // REGISTER NEW CLIENT
    // ============================================================

    if (screen === "register-client") {
        return (
            <div className="min-h-full w-full bg-[#f7f7f7]">
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
            </div>
        );
    }

    // ============================================================
    // ASSET LINES
    // ============================================================

    if (screen === "asset-lines") {
        return (
            <div className="min-h-full w-full bg-[#f7f7f7]">
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
            </div>
        );
    }

    // ============================================================
    // TERMS
    // ============================================================

    if (screen === "terms") {
        return (
            <div className="min-h-full w-full bg-[#f7f7f7]">
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
            </div>
        );
    }

    // ============================================================
    // REVIEW
    // ============================================================

    return (
        <div className="min-h-full w-full bg-[#f7f7f7]">
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
        </div>
    );
}