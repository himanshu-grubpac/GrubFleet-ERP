"use client";

import { useRouter } from "next/navigation";
import { useAssetRegisterEntityId } from "@/lib/navigation/use-asset-register-entity-id";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateVehicleCaches } from "@/lib/query/invalidate-domain-caches";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { useAuth } from "@/providers/auth-provider";
import { ASSET_REGISTER_COMPLIANCE_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { localTodayIsoDate } from "@/lib/format/date-format";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
    COMPLIANCE_RENEWAL_SAVE_ERROR,
    showComplianceRenewalSavedToast,
    showErrorToast,
} from "@/lib/toast/show-toast";
import {
    fetchAssetRegisterComplianceDetailApi,
    renewAssetRegisterComplianceApi,
} from "@/lib/api/asset-register/compliance";
import {
    formatAssetRegisterIsoDate,
    toRenewAssetRegisterCompliancePayload,
    validateComplianceRenewFormFields,
    validateComplianceRenewFormForSubmit,
    type ComplianceRenewalTypeUi,
} from "@/lib/api/asset-register/mappers";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canRenew =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const vehicleId = useAssetRegisterEntityId("vehicleId");

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

            registrationExpiry: formatAssetRegisterIsoDate(
                detailQuery.data.registration?.endDate,
            ),

            insuranceExpiry: formatAssetRegisterIsoDate(
                detailQuery.data.insurance?.endDate,
            ),

            // Keep your other existing fields unchanged.
            insuranceSupplier: "-",
            contactPerson: "-",
            phone: "-",
            email: "-",
        }
        : undefined;
    const renewMutation = useMutation({
        mutationFn: async (input: ReturnType<
            typeof toRenewAssetRegisterCompliancePayload
        >) => {
            if (!token || !organizationId || !vehicleId) {
                throw new Error("Missing auth context");
            }

            return renewAssetRegisterComplianceApi({
                token,
                organizationId,
                vehicleId,
                type: input.type,
                startDate: input.startDate,
                endDate: input.endDate,
                insurancePremium: input.insurancePremium,
                policyNumber: input.policyNumber,
                registrationReference: input.registrationReference,
            });
        },
        onSuccess: () => {
            void invalidateVehicleCaches(queryClient);
            showComplianceRenewalSavedToast();
            router.push("/asset-register/compliance-renewals");
        },
        onError: (error: Error) => {
            showErrorToast(error.message || COMPLIANCE_RENEWAL_SAVE_ERROR);
        },
    });

    /* ---------------------------------------------------------------------- */
    /* Form State                                                             */
    /* ---------------------------------------------------------------------- */

    const [renewalType, setRenewalType] =
        useState<ComplianceRenewalTypeUi>("Insurance");

    const [newExpiryDate, setNewExpiryDate] =
        useState("");

    const [premium, setPremium] =
        useState("");

    const [policyNumber, setPolicyNumber] =
        useState("");

    const [registrationReference, setRegistrationReference] =
        useState("");

    const [isSaving, setIsSaving] =
        useState(false);
    const isSubmittingRef = useRef(false);

    const [error, setError] =
        useState("");

    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!detailQuery.isSuccess || !detailQuery.data) return;
        setPolicyNumber(detailQuery.data.insurance?.policyNumber?.trim() ?? "");
        setRegistrationReference(
            detailQuery.data.registration?.registrationReference?.trim() ?? "",
        );
        // Hydrate once per vehicle load; do not overwrite while the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleId, detailQuery.isSuccess]);

    /* ---------------------------------------------------------------------- */
    /* Input Classes                                                          */
    /* ---------------------------------------------------------------------- */

    const selectClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const credentialStartDate = useMemo(() => {
        if (!detailQuery.data) return undefined;
        if (renewalType === "Insurance") {
            return detailQuery.data.insurance?.startDate;
        }
        if (renewalType === "Registration") {
            return detailQuery.data.registration?.startDate;
        }
        return detailQuery.data.warranty?.startDate;
    }, [detailQuery.data, renewalType]);

    const newExpiryMin = useMemo(() => {
        const today = localTodayIsoDate();
        const currentExpiry =
            renewalType === "Insurance"
                ? detailQuery.data?.insurance?.endDate
                : renewalType === "Registration"
                  ? detailQuery.data?.registration?.endDate
                  : detailQuery.data?.warranty?.endDate;
        const basis = (
            currentExpiry?.trim() ||
            credentialStartDate?.trim() ||
            ""
        ).slice(0, 10);
        return basis > today ? basis : today;
    }, [credentialStartDate, detailQuery.data, renewalType]);

    const liveErrors = useMemo(
        () =>
            validateComplianceRenewFormFields(
                {
                    renewalType,
                    newExpiryDate,
                    premium,
                    policyNumber,
                    registrationReference,
                },
                { credentialStartDate },
            ),
        [
            newExpiryDate,
            renewalType,
            premium,
            policyNumber,
            registrationReference,
            credentialStartDate,
        ],
    );

    const { canSubmit } = useMemo(
        () =>
            validateComplianceRenewFormForSubmit(
                {
                    renewalType,
                    newExpiryDate,
                    premium,
                    policyNumber,
                    registrationReference,
                },
                { credentialStartDate },
                {
                    isSaving: isSaving || renewMutation.isPending,
                    canRenew,
                },
            ),
        [
            renewalType,
            newExpiryDate,
            premium,
            policyNumber,
            registrationReference,
            credentialStartDate,
            isSaving,
            renewMutation.isPending,
            canRenew,
        ],
    );

    const displayedErrors = hasAttemptedSubmit ? liveErrors : validationErrors;
    const validationSummary = Object.values(displayedErrors).filter(
        (message): message is string => Boolean(message),
    );

    const getInputClassName = (field: string) =>
        `h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition ${displayedErrors[field]
            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
            : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
        }`;

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
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setHasAttemptedSubmit(true);
        setError("");

        const errors = validateComplianceRenewFormFields(
            {
                renewalType,
                newExpiryDate,
                premium,
                policyNumber,
                registrationReference,
            },
            { credentialStartDate },
        );
        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            isSubmittingRef.current = false;
            return;
        }

        const endDate = newExpiryDate.trim();
        if (!endDate) {
            isSubmittingRef.current = false;
            return;
        }

        if (!credentialStartDate) {
            isSubmittingRef.current = false;
            return;
        }

        try {
            setIsSaving(true);
            const payload = toRenewAssetRegisterCompliancePayload(
                {
                    renewalType,
                    newExpiryDate: endDate,
                    premium,
                    policyNumber,
                    registrationReference,
                },
                { startDate: credentialStartDate },
            );

            await renewMutation.mutateAsync(payload);
        } catch {
            setError("Failed to save renewal. Please try again.");
        } finally {
            isSubmittingRef.current = false;
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
                    <div className="flex w-full flex-col gap-4">
                        {hasAttemptedSubmit && validationSummary.length > 0 && (
                            <div
                                role="status"
                                aria-live="polite"
                                className="w-full text-xs leading-5 text-red-600"
                            >
                                <span className="font-semibold">Please fix:</span>{" "}
                                {validationSummary.join(" | ")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3">
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
                                disabled={!canSubmit}
                                className="h-10 px-5"
                            >
                                {isSaving
                                    ? "Saving..."
                                    : "Save renewal"}
                            </Button>
                        </div>
                    </div>
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
                                            event.target.value as ComplianceRenewalTypeUi,
                                        );
                                        setError("");
                                        setValidationErrors({});
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
                                    type="date"
                                    min={newExpiryMin}
                                    value={newExpiryDate}
                                    onChange={(event) => {
                                        setNewExpiryDate(event.target.value);
                                        setValidationErrors((previous) => {
                                            const next = { ...previous };
                                            delete next.endDate;
                                            return next;
                                        });
                                    }}
                                    className={getInputClassName("endDate")}
                                />
                                {displayedErrors.endDate && (
                                    <p className="mt-1 text-xs text-red-500">{displayedErrors.endDate}</p>
                                )}
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

                                            <RestrictedInput
                                                id="premium"
                                                restrictedKind="inrRupee"
                                                value={premium}
                                                onChange={(value) => {
                                                    setPremium(value);
                                                    setValidationErrors((previous) => {
                                                        const next = { ...previous };
                                                        delete next.premium;
                                                        return next;
                                                    });
                                                }}
                                                placeholder="e.g. Rs. 3,400/yr"
                                                className={getInputClassName("premium")}
                                            />
                                            {displayedErrors.premium && (
                                                <p className="mt-1 text-xs text-red-500">{displayedErrors.premium}</p>
                                            )}
                                        </div>

                                        {/* Policy number */}

                                        <div>
                                            <label
                                                htmlFor="policy-number"
                                                className="mb-1 block text-xs font-semibold text-gray-700"
                                            >
                                                Policy number
                                            </label>

                                            <RestrictedInput
                                                id="policy-number"
                                                restrictedKind="text"
                                                maxLength={
                                                    ASSET_REGISTER_COMPLIANCE_INPUT_LIMITS.policyNumber
                                                }
                                                value={policyNumber}
                                                onChange={(value) => {
                                                    setPolicyNumber(value);
                                                    setValidationErrors((previous) => {
                                                        const next = { ...previous };
                                                        delete next.policyNumber;
                                                        return next;
                                                    });
                                                }}
                                                placeholder="Reference number"
                                                className={getInputClassName("policyNumber")}
                                            />
                                            {displayedErrors.policyNumber && (
                                                <p className="mt-1 text-xs text-red-500">{displayedErrors.policyNumber}</p>
                                            )}
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

                                            <RestrictedInput
                                                id="registration-reference"
                                                restrictedKind="text"
                                                maxLength={
                                                    ASSET_REGISTER_COMPLIANCE_INPUT_LIMITS.registrationReference
                                                }
                                                value={registrationReference}
                                                onChange={(value) => {
                                                    setRegistrationReference(value);
                                                    setValidationErrors((previous) => {
                                                        const next = { ...previous };
                                                        delete next.registrationReference;
                                                        return next;
                                                    });
                                                }}
                                                placeholder="Reference number"
                                                className={getInputClassName(
                                                    "registrationReference",
                                                )}
                                            />
                                            {displayedErrors.registrationReference && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {displayedErrors.registrationReference}
                                                </p>
                                            )}
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