"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardPageLoadingShell } from "@/components/dashboard/dashboard-async-states";
import { DashboardSemanticBanner } from "@/components/dashboard/dashboard-semantic-cell";
import VehicleReturnExpectedSummaryCard from "./VehicleReturnExpectedSummaryCard";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { RestrictedTextarea } from "@/components/ui/RestrictedTextarea";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { useAuth } from "@/providers/auth-provider";
import {
    fetchFleetReturnDetailApi,
    receiveFleetReturnApi,
    type FleetReturnConditionAtGlance,
    type FleetReturnFuelLevel,
    type FleetReturnGatePhoto,
} from "@/lib/api/fleet-leasing/returns";
import { fetchAllActiveOrganisationEmployeesApi } from "@/lib/api/organisation/employees";
import { VEHICLE_RETURN_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
    validateReceiveReturnForm,
    vehicleReturnFormIsValid,
    type VehicleReturnFieldErrors,
} from "@/lib/validation/vehicle-return-form-validation";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { getDashboardBannerLevelFromStatusBanner } from "@/lib/format/dashboard-semantic-surfaces";
import {
    showErrorToast,
    showVehicleReturnReceivedToast,
} from "@/lib/toast/show-toast";
import { ApiClientError } from "@/lib/api/client";
import { assetRegisterVehicleReturnInspectHref } from "@/lib/navigation/asset-register-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { useSecureEntityId } from "@/lib/navigation/use-secure-entity-id";

const RECEIVE_LIMITS = VEHICLE_RETURN_INPUT_LIMITS.receive;

const SECTION_TITLE =
    "mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500";

const INPUT_LABEL = "mb-1.5 block text-sm font-medium text-gray-700";

const FUEL_OPTIONS: Array<{ value: FleetReturnFuelLevel; label: string }> = [
    { value: "empty", label: "Empty" },
    { value: "quarter", label: "1/4" },
    { value: "half", label: "1/2" },
    { value: "three_quarter", label: "3/4" },
    { value: "full", label: "Full" },
];

const GATE_SLOTS: Array<{
    slot: FleetReturnGatePhoto["slot"];
    label: string;
}> = [
    { slot: "front", label: "Front" },
    { slot: "rear", label: "Rear" },
    { slot: "left", label: "Left side" },
    { slot: "right", label: "Right side" },
];

function toDatetimeLocalValue(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string {
    if (!value.trim()) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
}

function formatOdometerKm(value: number | null | undefined): string {
    if (value == null) return "—";
    return `${value.toLocaleString("en-IN")} km`;
}

export default function ReceiveReturnedVehiclePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const inspectionId = useSecureEntityId();
    const { token, organizationId, permissions } = useAuth();

    const canReceive =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const [receivedAtLocal, setReceivedAtLocal] = useState("");
    const [receivedByEmployeeId, setReceivedByEmployeeId] = useState("");
    const [broughtInBy, setBroughtInBy] = useState("");
    const [odometerInput, setOdometerInput] = useState("");
    const [fuelLevel, setFuelLevel] =
        useState<FleetReturnFuelLevel>("quarter");
    const [keysReceived, setKeysReceived] = useState(0);
    const [docs, setDocs] = useState({
        rcBook: true,
        insuranceCopy: true,
        pucCertificate: true,
        goodsPermit: true,
    });
    const [gatePhotos, setGatePhotos] = useState<FleetReturnGatePhoto[]>([]);
    const [conditionAtGlance, setConditionAtGlance] =
        useState<FleetReturnConditionAtGlance>("looks_fine");
    const [gateNote, setGateNote] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingInspectImmediately, setPendingInspectImmediately] =
        useState(false);
    const [formInitialized, setFormInitialized] = useState(false);
    const [validationErrors, setValidationErrors] =
        useState<VehicleReturnFieldErrors>({});
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [previewOdometer, setPreviewOdometer] = useState<number | undefined>(
        undefined,
    );
    const [previewCondition, setPreviewCondition] = useState<
        FleetReturnConditionAtGlance | undefined
    >(undefined);

    const detailQuery = useQuery({
        queryKey: [
            "fleet-return",
            inspectionId,
            organizationId,
            previewOdometer,
            previewCondition,
        ],
        queryFn: () =>
            fetchFleetReturnDetailApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
                previewOdometer,
                previewConditionAtGlance: previewCondition,
            }),
        enabled:
            Boolean(token) &&
            Boolean(organizationId) &&
            Boolean(inspectionId),
        ...dashboardListQueryOptions,
    });

    const employeesQuery = useQuery({
        queryKey: ["organisation-employees-receive", organizationId],
        queryFn: () =>
            fetchAllActiveOrganisationEmployeesApi(token!, organizationId!),
        enabled: Boolean(token) && Boolean(organizationId),
        staleTime: 60_000,
    });

    const detail = detailQuery.data;
    const keysHandedOver =
        detail?.keysHandedOver ??
        detail?.expectedReturn.keysHandedOver ??
        2;
    const handoverOdometer =
        detail?.handoverOdometer ??
        detail?.expectedReturn.handoverOdometer ??
        0;

    useEffect(() => {
        if (!detail || formInitialized) return;
        setReceivedAtLocal(toDatetimeLocalValue(new Date().toISOString()));
        setOdometerInput(String(detail.vehicleOdometer ?? ""));
        setKeysReceived(keysHandedOver);
        setFormInitialized(true);
    }, [detail, formInitialized, keysHandedOver]);

    const odometerReading = useMemo(() => {
        const parsed = Number.parseInt(odometerInput.replace(/\D/g, ""), 10);
        return Number.isFinite(parsed) ? parsed : NaN;
    }, [odometerInput]);

    const kmDriven =
        Number.isFinite(odometerReading) && handoverOdometer != null
            ? odometerReading - handoverOdometer
            : null;
    const leaseKmAllowance =
        detail?.leaseKmAllowance ??
        detail?.expectedReturn.leaseKmAllowance ??
        null;
    const kmOverAllowance =
        kmDriven != null && leaseKmAllowance != null
            ? kmDriven - leaseKmAllowance
            : null;

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setPreviewOdometer(
                Number.isFinite(odometerReading) ? odometerReading : undefined,
            );
            setPreviewCondition(conditionAtGlance);
        }, 300);
        return () => window.clearTimeout(handle);
    }, [odometerReading, conditionAtGlance]);

    const clientValidationErrors = useMemo(
        () =>
            validateReceiveReturnForm({
                receivedAtLocal,
                broughtInBy,
                odometerReading,
                handoverOdometer,
                keysReceived,
                keysHandedOver,
            }),
        [
            receivedAtLocal,
            broughtInBy,
            odometerReading,
            handoverOdometer,
            keysReceived,
            keysHandedOver,
        ],
    );

    const isFormValid = vehicleReturnFormIsValid(clientValidationErrors);

    const receiveMutation = useMutation({
        mutationFn: (inspectImmediately: boolean) => {
            const receivedAt = datetimeLocalToIso(receivedAtLocal);
            if (!receivedAt) {
                throw new Error("Invalid received date");
            }
            return receiveFleetReturnApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
                body: {
                    receivedAt,
                    receivedByEmployeeId: receivedByEmployeeId.trim()
                        ? receivedByEmployeeId
                        : undefined,
                    broughtInBy: broughtInBy.trim(),
                    odometerReading,
                    fuelLevel,
                    keysReceived,
                    documentsChecklist: docs,
                    gatePhotos,
                    conditionAtGlance,
                    gateNote: gateNote.trim() || undefined,
                    inspectImmediately,
                },
            });
        },
        onSuccess: async (updated, inspectImmediately) => {
            setConfirmOpen(false);
            showVehicleReturnReceivedToast(
                updated.registrationNo,
                inspectImmediately,
            );
            await queryClient.invalidateQueries({
                queryKey: ["fleet-returns"],
            });
            await queryClient.invalidateQueries({
                queryKey: ["fleet-return", inspectionId],
            });
            if (inspectImmediately) {
                navigateToEntityShell(
                    router,
                    assetRegisterVehicleReturnInspectHref(updated.id),
                    updated.id,
                    "push",
                );
            } else {
                router.push("/asset-register/vehicle-returns/");
            }
        },
        onError: (err) => {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Could not receive vehicle. Try again.";
            showErrorToast(message);
        },
    });

    const openConfirm = (inspectImmediately: boolean) => {
        setHasAttemptedSubmit(true);
        setValidationErrors(clientValidationErrors);
        if (!vehicleReturnFormIsValid(clientValidationErrors)) return;
        setPendingInspectImmediately(inspectImmediately);
        setConfirmOpen(true);
    };

    const validationSummary = Object.values(validationErrors).filter(Boolean);

    const markGatePhoto = (slot: FleetReturnGatePhoto["slot"], label: string) => {
        const capturedAt = new Date().toISOString();
        setGatePhotos((prev) => {
            const rest = prev.filter((p) => p.slot !== slot);
            return [...rest, { slot, capturedAt, label }];
        });
    };

    const canSubmit =
        isFormValid &&
        canReceive &&
        !receiveMutation.isPending &&
        !detailQuery.isLoading &&
        detail?.vehicleStatus === "return_pending" &&
        !detail?.registeredReturn;

    if (!inspectionId) {
        return (
            <OrganizationFormLayout
                title="Receive returned vehicle"
                description="Check the vehicle in at the depot gate. The detailed inspection comes next."
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-amber-900">
                        Open this flow from Vehicle Returns — Receive vehicle.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (detailQuery.isLoading) {
        return (
            <OrganizationFormLayout
                title="Receive returned vehicle"
                description="Check the vehicle in at the depot gate. The detailed inspection comes next."
                contentVariant="plain"
            >
                <DashboardPageLoadingShell label="Loading return details…" />
            </OrganizationFormLayout>
        );
    }

    if (detailQuery.isError || !detail) {
        return (
            <OrganizationFormLayout
                title="Receive returned vehicle"
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-red-600">
                        Could not load this return. Go back to Vehicle Returns
                        and try again.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (detail.registeredReturn || detail.vehicleStatus !== "return_pending") {
        return (
            <OrganizationFormLayout
                title="Receive returned vehicle"
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-slate-600">
                        This vehicle is not awaiting gate-in (
                        {detail.vehicleStatus.replace(/_/g, " ")}).
                    </p>
                    <GrubpacButton
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={() =>
                            router.push("/asset-register/vehicle-returns/")
                        }
                    >
                        Back to Vehicle Returns
                    </GrubpacButton>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    return (
        <OrganizationFormLayout
            title="Receive returned vehicle"
            description={`${detail.fleetCode} · ${detail.registrationNo} — gate-in before inspection.`}
            contentVariant="plain"
        >
            <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(260px,320px)_1fr]">
                <VehicleReturnExpectedSummaryCard
                    detail={detail}
                    statusLabel="Return pending"
                    statusLevel="brand"
                    showHandoverContext
                />

                <div className="space-y-6">
                    {hasAttemptedSubmit && validationSummary.length > 0 ? (
                        <div
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                            role="alert"
                        >
                            {validationSummary[0]}
                        </div>
                    ) : null}
                    {(detail.contextBanners ?? []).map((banner) => (
                        <DashboardSemanticBanner
                            key={banner.message}
                            level={getDashboardBannerLevelFromStatusBanner(
                                banner.level,
                            )}
                        >
                            {banner.message}
                        </DashboardSemanticBanner>
                    ))}
                    <OrganizationDetailCard>
                        <h2 className={SECTION_TITLE}>Arrival</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="received-on"
                                    className={INPUT_LABEL}
                                >
                                    Received on{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="received-on"
                                    type="datetime-local"
                                    value={receivedAtLocal}
                                    onChange={(e) => {
                                        setReceivedAtLocal(e.target.value);
                                        setValidationErrors((prev) => {
                                            const next = { ...prev };
                                            delete next.receivedAtLocal;
                                            return next;
                                        });
                                    }}
                                    aria-invalid={Boolean(
                                        validationErrors.receivedAtLocal,
                                    )}
                                    className={mergeFormControlBorderClass(
                                        Boolean(
                                            validationErrors.receivedAtLocal,
                                        ),
                                        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm",
                                    )}
                                />
                                <FormFieldInlineError
                                    message={validationErrors.receivedAtLocal}
                                />
                            </div>
                            <div>
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label
                                        htmlFor="received-by"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Received by{" "}
                                        <span className="font-normal text-gray-500">
                                            (optional)
                                        </span>
                                    </label>
                                    {receivedByEmployeeId ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setReceivedByEmployeeId("")
                                            }
                                            className="text-xs text-gray-500 hover:text-red-500"
                                        >
                                            Clear
                                        </button>
                                    ) : null}
                                </div>
                                <select
                                    id="received-by"
                                    value={receivedByEmployeeId}
                                    onChange={(e) =>
                                        setReceivedByEmployeeId(e.target.value)
                                    }
                                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                                >
                                    <option value="">Select employee</option>
                                    {(employeesQuery.data ?? []).map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName}
                                            {emp.designation
                                                ? ` · ${emp.designation}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="brought-in-by"
                                    className={INPUT_LABEL}
                                >
                                    Brought in by{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <RestrictedInput
                                    id="brought-in-by"
                                    restrictedKind="text"
                                    maxLength={RECEIVE_LIMITS.broughtInBy}
                                    value={broughtInBy}
                                    onChange={(value) => {
                                        setBroughtInBy(value);
                                        setValidationErrors((prev) => {
                                            const next = { ...prev };
                                            delete next.broughtInBy;
                                            return next;
                                        });
                                    }}
                                    aria-invalid={Boolean(
                                        validationErrors.broughtInBy,
                                    )}
                                    className={mergeFormControlBorderClass(
                                        Boolean(validationErrors.broughtInBy),
                                        "h-10 w-full text-sm",
                                    )}
                                />
                                <FormFieldInlineError
                                    message={validationErrors.broughtInBy}
                                />
                            </div>
                        </div>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <h2 className={SECTION_TITLE}>Readings</h2>
                        <div className="max-w-xs">
                            <label
                                htmlFor="odometer-now"
                                className={INPUT_LABEL}
                            >
                                Odometer now{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <RestrictedInput
                                id="odometer-now"
                                restrictedKind="digits"
                                maxLength={RECEIVE_LIMITS.odometerMaxDigits}
                                value={odometerInput}
                                onChange={(value) => {
                                    setOdometerInput(value);
                                    setValidationErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.odometerReading;
                                        return next;
                                    });
                                }}
                                aria-invalid={Boolean(
                                    validationErrors.odometerReading,
                                )}
                                className={mergeFormControlBorderClass(
                                    Boolean(validationErrors.odometerReading),
                                    "h-10 w-full text-sm",
                                )}
                            />
                            <FormFieldInlineError
                                message={validationErrors.odometerReading}
                            />
                        </div>
                        {kmOverAllowance != null && kmOverAllowance > 0 ? (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                {kmDriven?.toLocaleString("en-IN")} km driven
                                since handover —{" "}
                                {kmOverAllowance.toLocaleString("en-IN")} km
                                over the allowance. Excess km charges may apply
                                on the client account.
                            </p>
                        ) : null}
                        <div className="mt-6">
                            <p className={INPUT_LABEL}>Fuel level</p>
                            <div className="flex flex-wrap gap-2">
                                {FUEL_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() =>
                                            setFuelLevel(opt.value)
                                        }
                                        className={`rounded-md border px-3 py-1.5 text-sm ${
                                            fuelLevel === opt.value
                                                ? "border-[#FE5720] bg-orange-50 text-gray-900"
                                                : "border-gray-200 bg-white text-gray-700"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <h2 className={SECTION_TITLE}>Keys & documents</h2>
                        <div className="max-w-xs">
                            <label
                                htmlFor="keys-received"
                                className={INPUT_LABEL}
                            >
                                Keys received
                            </label>
                            <select
                                id="keys-received"
                                value={keysReceived}
                                onChange={(e) =>
                                    setKeysReceived(Number(e.target.value))
                                }
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                            >
                                {Array.from(
                                    { length: keysHandedOver + 1 },
                                    (_, i) => i,
                                ).map((n) => (
                                    <option key={n} value={n}>
                                        {n} of {keysHandedOver}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {keysReceived < keysHandedOver ? (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                Spare key missing — will be recorded as a
                                missing item at inspection.
                            </p>
                        ) : null}
                        <div className="mt-4 space-y-2">
                            {(
                                [
                                    ["rcBook", "RC book"],
                                    ["insuranceCopy", "Insurance copy"],
                                    ["pucCertificate", "PUC certificate"],
                                    ["goodsPermit", "Goods permit"],
                                ] as const
                            ).map(([key, label]) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-2 text-sm text-gray-800"
                                >
                                    <input
                                        type="checkbox"
                                        checked={docs[key]}
                                        onChange={(e) =>
                                            setDocs((prev) => ({
                                                ...prev,
                                                [key]: e.target.checked,
                                            }))
                                        }
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h2 className={SECTION_TITLE.replace("mb-4 ", "")}>
                                Gate photos
                            </h2>
                            <span className="text-xs text-gray-500">
                                {gatePhotos.length} of {GATE_SLOTS.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {GATE_SLOTS.map(({ slot, label }) => {
                                const captured = gatePhotos.find(
                                    (p) => p.slot === slot,
                                );
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() =>
                                            markGatePhoto(slot, label)
                                        }
                                        className="flex min-h-[88px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-3 text-center text-xs text-gray-600 hover:border-gray-400"
                                    >
                                        <span className="font-medium text-gray-800">
                                            {label}
                                        </span>
                                        {captured ? (
                                            <span className="mt-1 text-[10px] text-green-700">
                                                Marked{" "}
                                                {new Date(
                                                    captured.capturedAt,
                                                ).toLocaleString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        ) : (
                                            <span className="mt-1">
                                                Tap to mark captured
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <h2 className={SECTION_TITLE}>Condition at a glance</h2>
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ["looks_fine", "Looks fine"],
                                    ["visible_damage", "Visible damage"],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        setConditionAtGlance(value)
                                    }
                                    className={`rounded-md border px-4 py-2 text-sm font-medium ${
                                        conditionAtGlance === value
                                            ? "border-[#FE5720] bg-orange-50 text-gray-900"
                                            : "border-gray-200 bg-white text-gray-700"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4">
                            <label htmlFor="gate-note" className={INPUT_LABEL}>
                                Gate note
                            </label>
                            <RestrictedTextarea
                                id="gate-note"
                                value={gateNote}
                                maxLength={RECEIVE_LIMITS.gateNote}
                                rows={3}
                                onChange={setGateNote}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                                placeholder="Optional notes visible on the inspection record"
                            />
                        </div>
                    </OrganizationDetailCard>

                </div>
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <GrubpacButton
                        type="button"
                        variant="secondary"
                        disabled={receiveMutation.isPending}
                        onClick={() =>
                            router.push("/asset-register/vehicle-returns/")
                        }
                    >
                        Cancel
                    </GrubpacButton>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <GrubpacButton
                            type="button"
                            variant="secondary"
                            disabled={!canSubmit}
                            onClick={() => openConfirm(false)}
                        >
                            Receive & queue for inspection
                        </GrubpacButton>
                        <GrubpacButton
                            type="button"
                            disabled={!canSubmit}
                            onClick={() => openConfirm(true)}
                        >
                            Receive & inspect now
                        </GrubpacButton>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                title="Receive vehicle at gate?"
                message={`Confirm gate-in for ${detail.registrationNo}. This updates odometer and marks the vehicle received.`}
                confirmLabel={
                    pendingInspectImmediately
                        ? "Receive & inspect"
                        : "Receive & queue"
                }
                onConfirm={() =>
                    receiveMutation.mutate(pendingInspectImmediately)
                }
                onClose={() => setConfirmOpen(false)}
                isConfirmPending={receiveMutation.isPending}
                confirmDisabled={!canSubmit}
            />
        </OrganizationFormLayout>
    );
}
