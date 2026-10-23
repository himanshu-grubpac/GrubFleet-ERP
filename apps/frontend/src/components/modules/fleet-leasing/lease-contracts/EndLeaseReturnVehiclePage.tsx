"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardPageLoadingShell } from "@/components/dashboard/dashboard-async-states";
import { DashboardStatusPill } from "@/components/dashboard/dashboard-semantic-cell";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedTextarea } from "@/components/ui/RestrictedTextarea";
import { useAuth } from "@/providers/auth-provider";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import {
    fetchContractVehicleAllocations,
    type LeaseClosingReason,
    type LeaseContractAvailableActions,
    type LeaseContractDetail,
    type LeaseReturnMethod,
} from "@/lib/api/lease-contracts";
import {
    fetchAllActiveOrganisationLocationsApi,
    type OrganisationLocationListItem,
} from "@/lib/api/organisation/locations";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { VEHICLE_RETURN_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
    validateEndLeaseReturnForm,
    vehicleReturnFormIsValid,
    type VehicleReturnFieldErrors,
} from "@/lib/validation/vehicle-return-form-validation";
import {
    fleetLeaseContractDetailHref,
} from "@/lib/navigation/fleet-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { usePersistFleetLeaseDisplayLabel } from "@/lib/navigation/use-persist-fleet-lease-display-label";
import { useFleetEntityId } from "@/lib/navigation/use-fleet-entity-id";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
    showErrorToast,
    showLeaseContractReturnsInitiatedToast,
} from "@/lib/toast/show-toast";
import { ApiClientError } from "@/lib/api/client";

const END_LEASE_LIMITS = VEHICLE_RETURN_INPUT_LIMITS.endLease;

const VEHICLE_TABLE_PREVIEW = 5;

/** Matches backend `FLEET_RETURN_EXCESS_KM_RATE_MINOR` (400 paise). */
const EXCESS_KM_RATE_INR = 4;

const SECTION_TITLE =
    "mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500";

const SECTION_TITLE_INLINE =
    "text-xs font-semibold uppercase tracking-wider text-slate-500";

const INPUT_LABEL = "mb-1.5 block text-sm font-medium text-gray-700";

function closingReasonCardClass(selected: boolean): string {
    return [
        "rounded-lg border p-4 text-left transition-colors",
        selected
            ? "border-[#FE5720] bg-orange-50/60 ring-1 ring-[#FE5720]/30"
            : "border-gray-200 bg-white hover:border-gray-300",
    ].join(" ");
}

function ReasonRadioIndicator({ selected }: { selected: boolean }) {
    return (
        <span
            className={`mb-2 flex h-4 w-4 items-center justify-center rounded-full border ${
                selected
                    ? "border-[#FE5720] bg-white"
                    : "border-gray-300 bg-white"
            }`}
            aria-hidden
        >
            {selected ? (
                <span className="h-2 w-2 rounded-full bg-[#FE5720]" />
            ) : null}
        </span>
    );
}

function isLeaseActionAllowed(
    actions: LeaseContractDetail["availableActions"],
    key: keyof LeaseContractAvailableActions,
): boolean {
    if (!actions) return false;
    if (Array.isArray(actions)) {
        const legacyMap: Record<
            keyof LeaseContractAvailableActions,
            string
        > = {
            editContract: "edit",
            deactivate: "deactivate",
            reactivate: "reactivate",
            pauseBilling: "pause_billing",
            terminate: "terminate",
        };
        return actions.includes(legacyMap[key] ?? key);
    }
    const entry = (actions as LeaseContractAvailableActions)[key];
    return entry?.allowed === true;
}

function formatOdometerKm(value: number): string {
    return `${value.toLocaleString("en-IN")} km`;
}

export default function EndLeaseReturnVehiclePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const leaseId = useFleetEntityId("leaseId");
    const { token, organizationId } = useAuth();
    const { api } = useLeaseApi();

    const [closingReason, setClosingReason] =
        useState<LeaseClosingReason>("completed");
    const [leaseEndDate, setLeaseEndDate] = useState("");
    const [returnMethod, setReturnMethod] =
        useState<LeaseReturnMethod>("client_depot");
    const [returnDepotLocationId, setReturnDepotLocationId] = useState("");
    const [expectedReturnBy, setExpectedReturnBy] = useState("");
    const [notes, setNotes] = useState("");
    const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(
        new Set(),
    );
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [formInitialized, setFormInitialized] = useState(false);
    const [validationErrors, setValidationErrors] =
        useState<VehicleReturnFieldErrors>({});
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [showAllVehicles, setShowAllVehicles] = useState(false);

    const contractQuery = useQuery({
        queryKey: ["lease-contract", leaseId, organizationId],
        queryFn: () => api.getById(leaseId),
        enabled: Boolean(organizationId) && Boolean(leaseId),
        ...dashboardListQueryOptions,
    });

    const contract = contractQuery.data;

    usePersistFleetLeaseDisplayLabel(
        leaseId,
        contract?.contractNumber,
    );

    const allocationsQuery = useQuery({
        queryKey: [
            "lease-contract-allocations",
            leaseId,
            organizationId,
        ],
        queryFn: () =>
            fetchContractVehicleAllocations(
                token!,
                organizationId!,
                leaseId,
                1,
                50,
            ),
        enabled: Boolean(token) && Boolean(organizationId) && Boolean(leaseId),
        ...dashboardListQueryOptions,
    });

    const locationsQuery = useQuery({
        queryKey: ["organisation-locations-picker", organizationId],
        queryFn: () =>
            fetchAllActiveOrganisationLocationsApi(
                token!,
                organizationId!,
            ),
        enabled: Boolean(token) && Boolean(organizationId),
        staleTime: 60_000,
    });

    const canEndLease =
        contract &&
        isLeaseActionAllowed(contract.availableActions, "terminate");

    const eligibleRows = useMemo(() => {
        const items = allocationsQuery.data?.items ?? [];
        return items.filter(
            (row) =>
                row.vehicleStatus === "leased" ||
                row.vehicleStatus === "return_pending",
        );
    }, [allocationsQuery.data?.items]);

    const selectableVehicleIds = useMemo(
        () =>
            eligibleRows
                .filter((row) => row.vehicleStatus === "leased")
                .map((row) => row.vehicleId),
        [eligibleRows],
    );

    const allSelectableSelected =
        selectableVehicleIds.length > 0 &&
        selectableVehicleIds.every((id) => selectedVehicleIds.has(id));

    const someSelectableSelected =
        selectableVehicleIds.some((id) => selectedVehicleIds.has(id)) &&
        !allSelectableSelected;

    const displayedVehicleRows = useMemo(() => {
        if (showAllVehicles || eligibleRows.length <= VEHICLE_TABLE_PREVIEW) {
            return eligibleRows;
        }
        return eligibleRows.slice(0, VEHICLE_TABLE_PREVIEW);
    }, [eligibleRows, showAllVehicles]);

    const leaseKmAllowancePerVehicle = useMemo(() => {
        const months = contract?.termMonths;
        if (months == null || months <= 0) return null;
        return months * 5000;
    }, [contract?.termMonths]);

    useEffect(() => {
        if (!contract || formInitialized) return;
        const defaultEnd =
            contract.closing?.leaseEndDate ??
            contract.endDate ??
            "";
        setLeaseEndDate(defaultEnd);
        setExpectedReturnBy(
            contract.closing?.expectedReturnBy ?? defaultEnd,
        );
        if (contract.closing?.reason) {
            setClosingReason(
                contract.closing.reason as LeaseClosingReason,
            );
        }
        if (contract.closing?.returnMethod) {
            setReturnMethod(
                contract.closing.returnMethod as LeaseReturnMethod,
            );
        }
        if (contract.closing?.returnDepotLocationId) {
            setReturnDepotLocationId(
                contract.closing.returnDepotLocationId,
            );
        }
        if (contract.closing?.notes) {
            setNotes(contract.closing.notes);
        }
        setFormInitialized(true);
    }, [contract, formInitialized]);

    useEffect(() => {
        if (eligibleRows.length === 0) return;
        setSelectedVehicleIds((prev) => {
            if (prev.size > 0) return prev;
            const leased = eligibleRows
                .filter((r) => r.vehicleStatus === "leased")
                .map((r) => r.vehicleId);
            return new Set(leased);
        });
    }, [eligibleRows]);

    const selectedDepotLabel = useMemo(() => {
        if (!returnDepotLocationId) return "";
        const loc = (locationsQuery.data ?? []).find(
            (l: OrganisationLocationListItem) =>
                l.id === returnDepotLocationId,
        );
        return loc?.name ?? "";
    }, [locationsQuery.data, returnDepotLocationId]);

    const clientValidationErrors = useMemo(
        () =>
            validateEndLeaseReturnForm({
                leaseEndDate,
                expectedReturnBy,
                selectedVehicleCount: selectedVehicleIds.size,
                returnMethod,
                returnDepotLocationId,
            }),
        [
            leaseEndDate,
            expectedReturnBy,
            selectedVehicleIds.size,
            returnMethod,
            returnDepotLocationId,
        ],
    );

    const isFormValid = vehicleReturnFormIsValid(clientValidationErrors);

    const initiateMutation = useMutation({
        mutationFn: () =>
            api.initiateReturns(leaseId, {
                closingReason,
                leaseEndDate,
                vehicleIds: [...selectedVehicleIds],
                returnMethod,
                returnDepotLocationId:
                    returnMethod === "client_depot" && returnDepotLocationId
                        ? returnDepotLocationId
                        : undefined,
                returnDepotLabel:
                    returnMethod === "client_depot" && selectedDepotLabel
                        ? selectedDepotLabel
                        : undefined,
                expectedReturnBy,
                notes: notes.trim() || undefined,
            }),
        onSuccess: async (updated) => {
            setConfirmOpen(false);
            showLeaseContractReturnsInitiatedToast(
                selectedVehicleIds.size,
            );
            await queryClient.invalidateQueries({
                queryKey: ["lease-contract", leaseId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["fleet-returns"],
            });
            void updated;
            router.push("/asset-register/vehicle-returns/");
        },
        onError: (err) => {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Could not initiate returns. Try again.";
            showErrorToast(message);
        },
    });

    const backToDetail = () => {
        if (!leaseId) {
            router.push("/fleet-leasing/lease-contracts/");
            return;
        }
        navigateToEntityShell(
            router,
            fleetLeaseContractDetailHref(leaseId),
            leaseId,
            "push",
            contract?.contractNumber
                ? {
                      displayLabel: contract.contractNumber,
                      labelKind: "lease",
                  }
                : undefined,
        );
    };

    const toggleVehicle = (vehicleId: string, selectable: boolean) => {
        if (!selectable) return;
        setSelectedVehicleIds((prev) => {
            const next = new Set(prev);
            if (next.has(vehicleId)) {
                next.delete(vehicleId);
            } else {
                next.add(vehicleId);
            }
            return next;
        });
    };

    const toggleSelectAllVehicles = () => {
        if (allSelectableSelected) {
            setSelectedVehicleIds(new Set());
            return;
        }
        setSelectedVehicleIds(new Set(selectableVehicleIds));
    };

    const canSubmit =
        isFormValid &&
        canEndLease &&
        !initiateMutation.isPending &&
        !contractQuery.isLoading &&
        !allocationsQuery.isLoading;

    const openInitiateConfirm = () => {
        setHasAttemptedSubmit(true);
        setValidationErrors(clientValidationErrors);
        if (!vehicleReturnFormIsValid(clientValidationErrors)) return;
        setConfirmOpen(true);
    };

    const validationSummary = Object.values(validationErrors).filter(Boolean);

    if (!leaseId) {
        return (
            <OrganizationFormLayout
                title="End lease & return vehicles"
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-amber-900">
                        Open this flow from a lease contract detail page.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (contractQuery.isLoading || allocationsQuery.isLoading) {
        return (
            <OrganizationFormLayout
                title="End lease & return vehicles"
                contentVariant="plain"
            >
                <DashboardPageLoadingShell label="Loading contract and allocated vehicles…" />
            </OrganizationFormLayout>
        );
    }

    if (contractQuery.isError || !contract) {
        return (
            <OrganizationFormLayout
                title="End lease & return vehicles"
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-red-600">
                        Could not load this contract. Return to the detail view
                        and try again.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (!canEndLease) {
        return (
            <OrganizationFormLayout
                title="End lease & return vehicles"
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-slate-600">
                        This contract cannot be ended from its current state.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    const clientName = contract.client?.companyName ?? "—";
    const startDate = contract.startDate
        ? formatCalendarDateEnIn(contract.startDate)
        : "—";
    const endDateDisplay = contract.endDate
        ? formatCalendarDateEnIn(contract.endDate)
        : "—";
    const subtitleParts = [
        clientName,
        contract.contractNumber,
        startDate !== "—" && endDateDisplay !== "—"
            ? `${startDate} – ${endDateDisplay}`
            : null,
        `${eligibleRows.length} vehicle${eligibleRows.length === 1 ? "" : "s"} leased`,
    ].filter(Boolean);

    const contractEndLabel = contract.endDate
        ? formatCalendarDateEnIn(contract.endDate)
        : "contract end";

    const closingReasonOptions: Array<{
        value: LeaseClosingReason;
        title: string;
        description: string;
    }> = [
        {
            value: "completed",
            title: "Completed",
            description: "End date reached",
        },
        {
            value: "terminated_early",
            title: "Terminated early",
            description: `Ends before ${contractEndLabel}, reason and fee needed`,
        },
        {
            value: "cancelled",
            title: "Cancelled",
            description:
                "Called off; vehicles not handed over skip inspection",
        },
    ];

    const expectedReturnLabel = expectedReturnBy.trim()
        ? formatCalendarDateEnIn(expectedReturnBy)
        : "the expected date";

    const depotArrivalLine =
        returnMethod === "client_depot" && selectedDepotLabel.trim()
            ? `${selectedDepotLabel} sees ${selectedVehicleIds.size} expected arrival${selectedVehicleIds.size === 1 ? "" : "s"} for ${expectedReturnLabel} in Vehicle Returns.`
            : `Vehicle Returns lists ${selectedVehicleIds.size} expected arrival${selectedVehicleIds.size === 1 ? "" : "s"} for ${expectedReturnLabel}.`;

    const primaryLabel = `Initiate return for ${selectedVehicleIds.size} vehicle${selectedVehicleIds.size === 1 ? "" : "s"}`;

    return (
        <OrganizationFormLayout
            title="End lease & return vehicles"
            description={subtitleParts.join(" · ")}
            contentVariant="plain"
        >
            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,320px)]">
                <div className="space-y-6">
                    {hasAttemptedSubmit && validationSummary.length > 0 ? (
                        <div
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                            role="alert"
                        >
                            {validationSummary[0]}
                        </div>
                    ) : null}
                    <OrganizationDetailCard>
                        <h2 className={SECTION_TITLE}>
                            Why is the lease ending?
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {closingReasonOptions.map((opt) => {
                                const selected =
                                    closingReason === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() =>
                                            setClosingReason(opt.value)
                                        }
                                        className={closingReasonCardClass(
                                            selected,
                                        )}
                                    >
                                        <ReasonRadioIndicator
                                            selected={selected}
                                        />
                                        <p className="text-sm font-medium text-gray-900">
                                            {opt.title}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-600">
                                            {opt.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 max-w-xs">
                            <label
                                htmlFor="lease-end-date"
                                className={INPUT_LABEL}
                            >
                                Lease end date{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="lease-end-date"
                                type="date"
                                value={leaseEndDate}
                                onChange={(e) => {
                                    setLeaseEndDate(e.target.value);
                                    setValidationErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.leaseEndDate;
                                        delete next.expectedReturnBy;
                                        return next;
                                    });
                                }}
                                aria-invalid={Boolean(
                                    validationErrors.leaseEndDate,
                                )}
                                className={mergeFormControlBorderClass(
                                    Boolean(validationErrors.leaseEndDate),
                                    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900",
                                )}
                            />
                            <FormFieldInlineError
                                message={validationErrors.leaseEndDate}
                            />
                        </div>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className={SECTION_TITLE_INLINE}>
                                Vehicles to return
                            </h2>
                            <p className="text-xs text-gray-600">
                                {selectedVehicleIds.size} of{" "}
                                {eligibleRows.length} selected · untick to keep
                                some on lease
                            </p>
                        </div>
                        {validationErrors.vehicles ? (
                            <FormFieldInlineError
                                message={validationErrors.vehicles}
                            />
                        ) : null}
                        {eligibleRows.length === 0 ? (
                            <p className="text-sm text-gray-600">
                                No leased vehicles on this contract. Allocate
                                vehicles before initiating returns.
                            </p>
                        ) : (
                            <div className="-mx-5 overflow-x-auto border-y border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="w-10 px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        allSelectableSelected
                                                    }
                                                    ref={(el) => {
                                                        if (el) {
                                                            el.indeterminate =
                                                                someSelectableSelected;
                                                        }
                                                    }}
                                                    disabled={
                                                        selectableVehicleIds.length ===
                                                        0
                                                    }
                                                    onChange={
                                                        toggleSelectAllVehicles
                                                    }
                                                    aria-label="Select all vehicles to return"
                                                />
                                            </th>
                                            <th className="px-3 py-2">
                                                Fleet code
                                            </th>
                                            <th className="px-3 py-2">
                                                Registration
                                            </th>
                                            <th className="px-3 py-2">
                                                Asset class
                                            </th>
                                            <th className="px-3 py-2">
                                                Last odometer
                                            </th>
                                            <th className="px-3 py-2">
                                                Handed over
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {displayedVehicleRows.map((row) => {
                                            const selectable =
                                                row.vehicleStatus ===
                                                "leased";
                                            const checked =
                                                selectedVehicleIds.has(
                                                    row.vehicleId,
                                                );
                                            const fleetLabel =
                                                row.fleetCode ??
                                                row.registrationNo;
                                            return (
                                                <tr key={row.id}>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={
                                                                !selectable
                                                            }
                                                            onChange={() =>
                                                                toggleVehicle(
                                                                    row.vehicleId,
                                                                    selectable,
                                                                )
                                                            }
                                                            aria-label={`Select ${fleetLabel}`}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 font-medium text-gray-800">
                                                        {fleetLabel}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
                                                        {row.registrationNo}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
                                                        {row.assetClass}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
                                                        {formatOdometerKm(
                                                            row.odometer,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
                                                        {formatCalendarDateEnIn(
                                                            row.createdAt.slice(
                                                                0,
                                                                10,
                                                            ),
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {eligibleRows.length > VEHICLE_TABLE_PREVIEW ? (
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAllVehicles((prev) => !prev)
                                    }
                                    className="text-sm font-medium text-[#FE5720] hover:underline"
                                >
                                    {showAllVehicles
                                        ? "Show fewer"
                                        : `Show all ${eligibleRows.length}`}
                                </button>
                            </div>
                        ) : null}
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <h2 className={SECTION_TITLE}>
                            How are they coming back?
                        </h2>
                        <div
                            className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-1"
                            role="group"
                            aria-label="Return method"
                        >
                            {(
                                [
                                    {
                                        value: "client_depot" as const,
                                        label: "Client drops at depot",
                                    },
                                    {
                                        value: "collect_from_site" as const,
                                        label: "We collect from client site",
                                    },
                                ] as const
                            ).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                        setReturnMethod(opt.value)
                                    }
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                        returnMethod === opt.value
                                            ? "bg-white text-[#FE5720] shadow-sm ring-1 ring-gray-200"
                                            : "text-gray-700 hover:text-gray-900"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {returnMethod === "client_depot" ? (
                            <div className="mt-4 max-w-md">
                                <label
                                    htmlFor="return-depot"
                                    className={INPUT_LABEL}
                                >
                                    Return depot{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="return-depot"
                                    value={returnDepotLocationId}
                                    onChange={(e) => {
                                        setReturnDepotLocationId(e.target.value);
                                        setValidationErrors((prev) => {
                                            const next = { ...prev };
                                            delete next.returnDepotLocationId;
                                            return next;
                                        });
                                    }}
                                    aria-invalid={Boolean(
                                        validationErrors.returnDepotLocationId,
                                    )}
                                    className={mergeFormControlBorderClass(
                                        Boolean(
                                            validationErrors.returnDepotLocationId,
                                        ),
                                        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900",
                                    )}
                                >
                                    <option value="">
                                        Select depot location
                                    </option>
                                    {(locationsQuery.data ?? []).map(
                                        (loc) => (
                                            <option
                                                key={loc.id}
                                                value={loc.id}
                                            >
                                                {loc.name}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <FormFieldInlineError
                                    message={
                                        validationErrors.returnDepotLocationId
                                    }
                                />
                            </div>
                        ) : null}
                        <div className="mt-4 max-w-xs">
                            <label
                                htmlFor="expected-return-by"
                                className={INPUT_LABEL}
                            >
                                Expected return by{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="expected-return-by"
                                type="date"
                                value={expectedReturnBy}
                                onChange={(e) => {
                                    setExpectedReturnBy(e.target.value);
                                    setValidationErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.expectedReturnBy;
                                        return next;
                                    });
                                }}
                                aria-invalid={Boolean(
                                    validationErrors.expectedReturnBy,
                                )}
                                className={mergeFormControlBorderClass(
                                    Boolean(validationErrors.expectedReturnBy),
                                    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900",
                                )}
                            />
                            <FormFieldInlineError
                                message={validationErrors.expectedReturnBy}
                            />
                        </div>
                        <div className="mt-4">
                            <label
                                htmlFor="return-notes"
                                className={INPUT_LABEL}
                            >
                                Notes for depot{" "}
                                <span className="font-normal text-gray-500">
                                    (optional)
                                </span>
                            </label>
                            <RestrictedTextarea
                                id="return-notes"
                                rows={3}
                                value={notes}
                                onChange={setNotes}
                                maxLength={END_LEASE_LIMITS.notes}
                                placeholder="e.g. Vans arrive in 2 batches, 10 each on 30 and 31 Oct"
                                className="w-full max-w-xl rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </div>
                    </OrganizationDetailCard>

                </div>

                <aside className="h-fit lg:sticky lg:top-4">
                    <OrganizationDetailCard>
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">
                            What happens when you confirm
                        </h3>
                        <ul className="space-y-3 text-xs leading-relaxed text-gray-700">
                            <li className="flex flex-wrap items-center gap-1.5">
                                <span>
                                    {selectedVehicleIds.size} vehicle
                                    {selectedVehicleIds.size === 1
                                        ? ""
                                        : "s"}{" "}
                                    move
                                </span>
                                <DashboardStatusPill
                                    label="Leased"
                                    level="info"
                                />
                                <span aria-hidden>→</span>
                                <DashboardStatusPill
                                    label="Return pending"
                                    level="warning"
                                />
                            </li>
                            <li>
                                Contract moves to{" "}
                                <DashboardStatusPill
                                    label="Closing"
                                    level="neutral"
                                    className="mx-0.5 align-middle"
                                />
                                . It closes once all{" "}
                                {selectedVehicleIds.size} are received and
                                charges settled.
                            </li>
                            <li>{depotArrivalLine}</li>
                            <li>
                                Rental billing stops on the lease end date you
                                set
                                {leaseEndDate.trim()
                                    ? ` (${formatCalendarDateEnIn(leaseEndDate)})`
                                    : ""}
                                .
                            </li>
                        </ul>
                        {leaseKmAllowancePerVehicle != null &&
                        leaseKmAllowancePerVehicle > 0 ? (
                            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-700">
                                <span className="font-semibold text-gray-900">
                                    Lease limit:
                                </span>{" "}
                                {leaseKmAllowancePerVehicle.toLocaleString(
                                    "en-IN",
                                )}{" "}
                                km per vehicle at ₹{EXCESS_KM_RATE_INR} per
                                extra km. Excess is checked at gate-in.
                            </div>
                        ) : null}
                    </OrganizationDetailCard>
                </aside>
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <GrubpacButton
                        type="button"
                        variant="secondary"
                        onClick={backToDetail}
                        disabled={initiateMutation.isPending}
                    >
                        Cancel
                    </GrubpacButton>
                    <GrubpacButton
                        type="button"
                        disabled={!canSubmit}
                        onClick={openInitiateConfirm}
                    >
                        {primaryLabel}
                    </GrubpacButton>
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title="Initiate vehicle returns?"
                message={`Mark ${selectedVehicleIds.size} vehicle(s) as return pending, move contract ${contract.contractNumber} to closing, and notify Vehicle Returns for ${expectedReturnLabel}?`}
                confirmLabel={primaryLabel}
                onConfirm={() => initiateMutation.mutate()}
                isConfirmPending={initiateMutation.isPending}
                confirmDisabled={!canSubmit}
            />
        </OrganizationFormLayout>
    );
}
