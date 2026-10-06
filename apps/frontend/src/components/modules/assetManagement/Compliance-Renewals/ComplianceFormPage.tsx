"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import {
    fetchAssetRegisterComplianceDetailApi,
    renewAssetRegisterComplianceApi,
} from "@/lib/api/asset-register/compliance";
import { formatAssetRegisterIsoDate } from "@/lib/api/asset-register/mappers";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RenewalType = "Insurance" | "Registration" | "Warranty";

function parseRenewalEndDate(value: string): string | null {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }
    return null;
}

type ComplianceVehicle = {
    id: string;
    fleetCode: string;
    assetClass: string;
    registrationNumber: string;

    insuranceExpiry: string;
    registrationExpiry: string;

    insuranceSupplier: string;
    contactPerson: string;
    phone: string;
    email: string;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function RenewCompliancePage() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const { token, organizationId, isLoading: isAuthLoading } = useAuth();

    const vehicleId =
        typeof params?.id === "string"
            ? params.id
            : "";

    const detailQuery = useQuery({
        queryKey: ["asset-register", "compliance", organizationId, vehicleId],
        queryFn: () => {
            if (!token || !organizationId || !vehicleId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterComplianceDetailApi({
                token,
                organizationId,
                vehicleId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading && !!vehicleId,
        ...dashboardListQueryOptions,
    });

    const vehicle: ComplianceVehicle | undefined = detailQuery.data
        ? {
              id: detailQuery.data.vehicleId,
              fleetCode: detailQuery.data.fleetCode,
              assetClass: detailQuery.data.assetClassName,
              registrationNumber: detailQuery.data.registrationNumber,
              insuranceExpiry: formatAssetRegisterIsoDate(
                  detailQuery.data.insuranceEndDate,
              ),
              registrationExpiry: formatAssetRegisterIsoDate(
                  detailQuery.data.registrationEndDate,
              ),
              insuranceSupplier: "—",
              contactPerson: "—",
              phone: "—",
              email: "—",
          }
        : undefined;

    const renewMutation = useMutation({
        mutationFn: async (input: {
            endDate: string;
            premium?: number;
        }) => {
            if (!token || !organizationId || !vehicleId || !detailQuery.data) {
                throw new Error("Missing auth context");
            }
            const type =
                renewalType === "Insurance"
                    ? "insurance"
                    : renewalType === "Registration"
                      ? "registration"
                      : "warranty";
            const startDate =
                renewalType === "Insurance"
                    ? detailQuery.data.insuranceStartDate
                    : renewalType === "Registration"
                      ? detailQuery.data.registrationStartDate
                      : detailQuery.data.warrantyStartDate;
            return renewAssetRegisterComplianceApi({
                token,
                organizationId,
                vehicleId,
                type,
                startDate,
                endDate: input.endDate,
                insurancePremium: input.premium,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "compliance"],
            });
            showSuccessToast("Compliance renewal saved");
            router.push("/asset-register/compliance-renewals");
        },
        onError: (error: Error) => {
            showErrorToast(error.message || "Could not save renewal");
        },
    });

    /* ---------------------------------------------------------------------- */
    /* Form State                                                             */
    /* ---------------------------------------------------------------------- */

    const [renewalType, setRenewalType] =
        useState<RenewalType>("Insurance");

    const [newExpiryDate, setNewExpiryDate] =
        useState("");

    const [premium, setPremium] =
        useState("");

    const [policyNumber, setPolicyNumber] =
        useState("");

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    /* ---------------------------------------------------------------------- */
    /* Input Classes                                                          */
    /* ---------------------------------------------------------------------- */

    const inputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const selectClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(
            "/asset-register/compliance-renewals",
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Save Renewal                                                           */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");

        if (!newExpiryDate.trim()) {
            setError("New expiry date is required.");
            return;
        }

        if (renewalType === "Insurance") {
            if (!premium.trim()) {
                setError("Premium is required.");
                return;
            }

            if (!policyNumber.trim()) {
                setError("Policy number is required.");
                return;
            }
        }

        const endDate = parseRenewalEndDate(newExpiryDate);
        if (!endDate) {
            setError("Enter new expiry as YYYY-MM-DD.");
            return;
        }

        try {
            setIsSaving(true);
            const premiumValue =
                renewalType === "Insurance"
                    ? Number(premium.replace(/[^\d.]/g, ""))
                    : undefined;
            await renewMutation.mutateAsync({
                endDate,
                premium:
                    premiumValue !== undefined && !Number.isNaN(premiumValue)
                        ? premiumValue
                        : undefined,
            });
        } catch {
            setError(
                "Failed to save renewal. Please try again.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    if (detailQuery.isError || (!detailQuery.isLoading && !vehicle)) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Compliance record not found.
            </div>
        );
    }

    if (isAuthLoading || detailQuery.isLoading || !vehicle) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Loading compliance record…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5]">

            {/* ================================================================== */}
            {/* Form Layout                                                        */}
            {/* ================================================================== */}

            <OrganizationFormLayout
                title={`Renew ${vehicle.fleetCode}`}
                description="Insurance and registration are tracked and renewed independently."
                actions={
                    <>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-10 px-5"
                        >
                            {isSaving
                                ? "Saving..."
                                : "Save renewal"}
                        </Button>
                    </>
                }
            >
                {/* ============================================================ */}
                {/* VEHICLE                                                        */}
                {/* ============================================================ */}

                <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                        Vehicle
                    </h2>

                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-2">
                        {/* Asset class */}

                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                            <span className="text-sm text-gray-500">
                                Asset class
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {vehicle.assetClass}
                            </span>
                        </div>

                        {/* Registration number */}

                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                            <span className="text-sm text-gray-500">
                                Registration number
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {
                                    vehicle.registrationNumber
                                }
                            </span>
                        </div>

                        {/* Insurance expiry */}

                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                            <span className="text-sm text-gray-500">
                                Current insurance expiry
                            </span>

                            <span
                                className={`text-sm font-semibold ${vehicle.insuranceExpiry ===
                                    "12-Aug-2026"
                                    ? "text-red-500"
                                    : "text-gray-900"
                                    }`}
                            >
                                {
                                    vehicle.insuranceExpiry
                                }
                            </span>
                        </div>

                        {/* Registration expiry */}

                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-500">
                                Current registration expiry
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {
                                    vehicle.registrationExpiry
                                }
                            </span>
                        </div>
                    </div>
                </section>

                {/* ============================================================ */}
                {/* RENEWAL                                                        */}
                {/* ============================================================ */}

                <section className="mt-4">
                    <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                        Renewal
                    </h2>

                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* Renewal type */}

                            <div>
                                <label
                                    htmlFor="renewal-type"
                                    className="mb-1 block text-xs font-semibold text-gray-700"
                                >
                                    Renewal type
                                </label>

                                <select
                                    id="renewal-type"
                                    value={renewalType}
                                    onChange={(event) => {
                                        setRenewalType(
                                            event.target.value as RenewalType,
                                        );
                                        setError("");
                                    }}
                                    className={selectClassName}
                                >
                                    <option value="Insurance">
                                        Insurance
                                    </option>

                                    <option value="Registration">
                                        Registration
                                    </option>

                                    <option value="Warranty">
                                        Warranty
                                    </option>
                                </select>
                            </div>

                            {/* New expiry date */}

                            <div>
                                <label
                                    htmlFor="new-expiry-date"
                                    className="mb-1 block text-xs font-semibold text-gray-700"
                                >
                                    New expiry date
                                </label>

                                <input
                                    id="new-expiry-date"
                                    type="text"
                                    value={
                                        newExpiryDate
                                    }
                                    onChange={(event) =>
                                        setNewExpiryDate(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="YYYY-MM-DD"
                                    className={
                                        inputClassName
                                    }
                                />
                            </div>

                            {/* Insurance-only fields */}

                            {renewalType ===
                                "Insurance" && (
                                    <>
                                        {/* Premium */}

                                        <div>
                                            <label
                                                htmlFor="premium"
                                                className="mb-1 block text-xs font-semibold text-gray-700"
                                            >
                                                Premium
                                            </label>

                                            <input
                                                id="premium"
                                                type="text"
                                                value={premium}
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setPremium(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="e.g. Rs. 3,400/yr"
                                                className={
                                                    inputClassName
                                                }
                                            />
                                        </div>

                                        {/* Policy number */}

                                        <div>
                                            <label
                                                htmlFor="policy-number"
                                                className="mb-1 block text-xs font-semibold text-gray-700"
                                            >
                                                Policy number
                                            </label>

                                            <input
                                                id="policy-number"
                                                type="text"
                                                value={
                                                    policyNumber
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setPolicyNumber(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Reference number"
                                                className={
                                                    inputClassName
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                            {/* Registration-only fields */}

                            {renewalType ===
                                "Registration" && (
                                    <>
                                        <div>
                                            <label
                                                htmlFor="registration-reference"
                                                className="mb-1 block text-xs font-semibold text-gray-700"
                                            >
                                                Registration reference
                                            </label>

                                            <input
                                                id="registration-reference"
                                                type="text"
                                                placeholder="Reference number"
                                                className={
                                                    inputClassName
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                        </div>
                    </div>
                </section>

                {/* ============================================================ */}
                {/* INSURANCE AUTHORITY CONTACT                                   */}
                {/* ============================================================ */}

                <section className="mt-4">
                    <h2 className="text-xs font-semibold uppercase text-gray-500">
                        Insurance authority contact
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                        Read-only — linked from Organisation
                        → Suppliers.
                    </p>

                    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-2">
                        {/* Organisation */}

                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                            <span className="text-sm text-gray-500">
                                Organisation
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {
                                    vehicle.insuranceSupplier
                                }
                            </span>
                        </div>

                        {/* Contact person */}

                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                            <span className="text-sm text-gray-500">
                                Contact person
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {
                                    vehicle.contactPerson
                                }
                            </span>
                        </div>

                        {/* Phone */}

                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                            <span className="text-sm text-gray-500">
                                Phone
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {vehicle.phone}
                            </span>
                        </div>

                        {/* Email */}

                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-500">
                                Email
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {vehicle.email}
                            </span>
                        </div>
                    </div>
                </section>

                {/* ============================================================ */}
                {/* ERROR                                                          */}
                {/* ============================================================ */}

                {error && (
                    <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* ============================================================ */}
                {/* INFORMATION                                                    */}
                {/* ============================================================ */}

                <div className="mt-4 flex gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                    <span className="mt-0.5 text-xs text-gray-500">
                        i
                    </span>

                    <p className="text-xs leading-5 text-gray-500">
                        Saving updates the compliance record
                        immediately — no approval step. If this
                        credential was expired, the vehicle is
                        unblocked from Asset Assignment right
                        away.
                    </p>
                </div>
            </OrganizationFormLayout>
        </div>
    );
}