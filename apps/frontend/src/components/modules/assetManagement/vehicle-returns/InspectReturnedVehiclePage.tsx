"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardPageLoadingShell } from "@/components/dashboard/dashboard-async-states";
import { DashboardSemanticBanner } from "@/components/dashboard/dashboard-semantic-cell";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { useAuth } from "@/providers/auth-provider";
import {
    fetchFleetReturnDetailApi,
    saveFleetReturnInspectionApi,
    type FleetReturnInspectionAttribution,
    type FleetReturnInspectionItemRating,
    type FleetReturnInspectionLineItemState,
    type FleetReturnInspectionSectionId,
    type FleetReturnInspectionWorksheet,
} from "@/lib/api/fleet-leasing/returns";
import { ApiClientError } from "@/lib/api/client";
import { VEHICLE_RETURN_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
    formatInrFromMinor,
    parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast } from "@/lib/toast/show-toast";
import { useSecureEntityId } from "@/lib/navigation/use-secure-entity-id";
import {
    assetRegisterVehicleReturnInspectFinalizeHref,
    assetRegisterVehicleReturnInspectResultHref,
} from "@/lib/navigation/asset-register-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import {
    computeInspectionWorksheetSummary,
    countCompletedInspectionSections,
    countIssueItemsInInspectionSection,
    countRatedItemsInInspectionSection,
    inspectionSectionIsComplete,
} from "@/lib/format/vehicle-return-inspection-summary";
import {
    getDashboardBannerLevelFromStatusBanner,
    getDashboardInspectionRatingToggleClass,
} from "@/lib/format/dashboard-semantic-surfaces";
import { getDashboardSemanticTextClass } from "@/lib/format/dashboard-table-semantic-presentation";
import {
    validateInspectionWorksheet,
    vehicleReturnFormIsValid,
    type VehicleReturnFieldErrors,
} from "@/lib/validation/vehicle-return-form-validation";
import InspectVehicleHeader from "./InspectVehicleHeader";

const INSPECTION_LIMITS = VEHICLE_RETURN_INPUT_LIMITS.inspection;

function normalizeInspectionWorksheetForSubmit(
    worksheet: FleetReturnInspectionWorksheet,
): FleetReturnInspectionWorksheet {
    const sections: FleetReturnInspectionWorksheet["sections"] = {};
    for (const [sectionId, sectionItems] of Object.entries(
        worksheet.sections,
    )) {
        const nextItems: Record<string, FleetReturnInspectionLineItemState> = {};
        for (const [itemKey, row] of Object.entries(sectionItems ?? {})) {
            const trimmedNote = row.note?.trim();
            nextItems[itemKey] = {
                ...row,
                note: trimmedNote ? trimmedNote : undefined,
            };
        }
        sections[sectionId as FleetReturnInspectionSectionId] = nextItems;
    }
    return { ...worksheet, sections };
}

const ATTRIBUTION_OPTIONS: Array<{
    value: FleetReturnInspectionAttribution;
    label: string;
}> = [
    { value: "client_damage", label: "Client damage" },
    { value: "wear_tear", label: "Wear & tear" },
    { value: "pre_existing", label: "Pre-existing" },
    { value: "missing", label: "Missing item" },
];

const RATING_OPTIONS = ["pass", "minor", "major"] as const;

export default function InspectReturnedVehiclePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const inspectionId = useSecureEntityId();
    const { token, organizationId, permissions, user } = useAuth();

    const canInspect =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const [worksheet, setWorksheet] =
        useState<FleetReturnInspectionWorksheet | null>(null);
    const [repairCostInputs, setRepairCostInputs] = useState<
        Record<string, string>
    >({});
    const [initialized, setInitialized] = useState(false);
    const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
    const [validationErrors, setValidationErrors] =
        useState<VehicleReturnFieldErrors>({});

    const detailQuery = useQuery({
        queryKey: ["fleet-return", inspectionId, organizationId],
        queryFn: () =>
            fetchFleetReturnDetailApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
            }),
        enabled:
            Boolean(token) &&
            Boolean(organizationId) &&
            Boolean(inspectionId),
        ...dashboardListQueryOptions,
    });

    const detail = detailQuery.data;
    const catalog = detail?.inspectionSectionCatalog ?? [];

    useEffect(() => {
        if (!detail || initialized) return;
        setWorksheet(detail.inspectionWorksheet);
        setInitialized(true);
    }, [detail, initialized]);

    const currentIndex = worksheet?.currentSectionIndex ?? 0;
    const currentSection = catalog[currentIndex];

    const liveSummary = useMemo(() => {
        if (!worksheet) {
            return detail?.inspectionSummary ?? null;
        }
        return computeInspectionWorksheetSummary(catalog, worksheet, {
            odometerReading: detail?.odometerReading ?? 0,
            handoverOdometer: detail?.handoverOdometer ?? null,
            leaseKmAllowance: detail?.leaseKmAllowance ?? null,
        });
    }, [catalog, worksheet, detail]);

    const completedSectionCount = useMemo(() => {
        if (!worksheet) return 0;
        return countCompletedInspectionSections(catalog, worksheet);
    }, [catalog, worksheet]);

    const saveMutation = useMutation({
        mutationFn: (payload: {
            complete?: boolean;
            exit?: boolean;
            sectionIndex: number;
            worksheetSnapshot: FleetReturnInspectionWorksheet;
        }) =>
            saveFleetReturnInspectionApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
                body: {
                    currentSectionIndex: payload.sectionIndex,
                    complete: payload.complete,
                    sections: payload.worksheetSnapshot.sections,
                },
            }),
        onSuccess: async (updated, vars) => {
            setWorksheet(updated.inspectionWorksheet);
            await queryClient.invalidateQueries({
                queryKey: ["fleet-return", inspectionId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["fleet-returns"],
            });
            if (vars.complete) {
                setCompleteConfirmOpen(false);
                navigateToEntityShell(
                    router,
                    assetRegisterVehicleReturnInspectFinalizeHref(
                        inspectionId,
                    ),
                    inspectionId,
                    "replace",
                );
                return;
            }
            if (vars.exit) {
                router.push("/asset-register/vehicle-returns/");
            }
        },
        onError: (err) => {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Could not save inspection.";
            showErrorToast(message);
        },
    });

    const updateLineItem = useCallback(
        (
            sectionId: FleetReturnInspectionSectionId,
            itemKey: string,
            patch: Partial<FleetReturnInspectionLineItemState>,
        ) => {
            setWorksheet((prev) => {
                if (!prev) return prev;
                const sectionItems = {
                    ...(prev.sections[sectionId] ?? {}),
                };
                const existing = sectionItems[itemKey] ?? {
                    rating: "unchecked" as const,
                };
                sectionItems[itemKey] = { ...existing, ...patch };
                return {
                    ...prev,
                    sections: {
                        ...prev.sections,
                        [sectionId]: sectionItems,
                    },
                };
            });
        },
        [],
    );

    const markRestPass = () => {
        if (!worksheet || !currentSection) return;
        const sectionId = currentSection.id;
        const items = { ...(worksheet.sections[sectionId] ?? {}) };
        for (const item of currentSection.items) {
            const row = items[item.key];
            if (!row || row.rating === "unchecked") {
                items[item.key] = { rating: "pass" };
            }
        }
        setWorksheet({
            ...worksheet,
            sections: { ...worksheet.sections, [sectionId]: items },
        });
    };

    const goToSection = (index: number) => {
        if (!worksheet) return;
        setWorksheet({ ...worksheet, currentSectionIndex: index });
    };

    const persist = (opts: {
        complete?: boolean;
        exit?: boolean;
        sectionIndex: number;
    }) => {
        if (!canInspect || !worksheet) return;
        if (opts.complete) {
            const errors = validateInspectionWorksheet(catalog, worksheet, {
                complete: true,
            });
            setValidationErrors(errors);
            if (!vehicleReturnFormIsValid(errors)) return;
        } else if (
            !opts.exit &&
            currentSection &&
            opts.sectionIndex > (worksheet.currentSectionIndex ?? 0)
        ) {
            const errors = validateInspectionWorksheet(catalog, worksheet, {
                sectionId: currentSection.id,
            });
            setValidationErrors(errors);
            if (!vehicleReturnFormIsValid(errors)) return;
        }
        const worksheetSnapshot = normalizeInspectionWorksheetForSubmit({
            ...worksheet,
            currentSectionIndex: opts.sectionIndex,
        });
        setWorksheet(worksheetSnapshot);
        saveMutation.mutate({ ...opts, worksheetSnapshot });
    };

    const currentSectionValidationErrors = useMemo(() => {
        if (!worksheet || !currentSection) return {};
        return validateInspectionWorksheet(catalog, worksheet, {
            sectionId: currentSection.id,
        });
    }, [catalog, worksheet, currentSection]);

    const completeValidationErrors = useMemo(() => {
        if (!worksheet) return {};
        return validateInspectionWorksheet(catalog, worksheet, {
            complete: true,
        });
    }, [catalog, worksheet]);

    const inlineFieldErrors = useMemo(
        () => ({
            ...currentSectionValidationErrors,
            ...validationErrors,
        }),
        [currentSectionValidationErrors, validationErrors],
    );

    const canAdvanceSection =
        canInspect &&
        vehicleReturnFormIsValid(currentSectionValidationErrors) &&
        !saveMutation.isPending;

    const canComplete =
        canInspect &&
        vehicleReturnFormIsValid(completeValidationErrors) &&
        !saveMutation.isPending &&
        detail?.inspectionStatus !== "completed" &&
        detail?.inspectionStatus !== "ready_to_finalize";

    const openCompleteConfirm = () => {
        if (!worksheet) return;
        const errors = validateInspectionWorksheet(catalog, worksheet, {
            complete: true,
        });
        setValidationErrors(errors);
        if (!vehicleReturnFormIsValid(errors)) return;
        setCompleteConfirmOpen(true);
    };

    useEffect(() => {
        if (!detail || !inspectionId) return;
        if (detail.inspectionStatus === "ready_to_finalize") {
            navigateToEntityShell(
                router,
                assetRegisterVehicleReturnInspectFinalizeHref(inspectionId),
                inspectionId,
                "replace",
            );
        }
        if (detail.inspectionStatus === "completed") {
            navigateToEntityShell(
                router,
                assetRegisterVehicleReturnInspectResultHref(inspectionId),
                inspectionId,
                "replace",
            );
        }
    }, [detail, inspectionId, router]);

    if (!inspectionId) {
        return (
            <OrganizationFormLayout
                title="Vehicle inspection"
                description="Document condition section by section before releasing the asset."
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-amber-900">
                        Open this flow from Vehicle Returns — Start inspection.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (detailQuery.isLoading || !worksheet || !detail) {
        return (
            <OrganizationFormLayout
                title="Vehicle inspection"
                description="Document condition section by section before releasing the asset."
                contentVariant="plain"
            >
                <DashboardPageLoadingShell label="Loading inspection…" />
            </OrganizationFormLayout>
        );
    }

    if (detailQuery.isError) {
        return (
            <OrganizationFormLayout
                title="Vehicle inspection"
                description="Document condition section by section before releasing the asset."
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-red-800">
                        Could not load inspection.{" "}
                        <button
                            type="button"
                            className="font-medium underline"
                            onClick={() => void detailQuery.refetch()}
                        >
                            Retry
                        </button>
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (!detail.registeredReturn || detail.vehicleStatus !== "returned") {
        const guard = detail.flowGuards?.inspectWorksheetView;
        return (
            <OrganizationFormLayout
                title="Vehicle inspection"
                description="Document condition section by section before releasing the asset."
                contentVariant="plain"
            >
                {guard ? (
                    <DashboardSemanticBanner
                        level={getDashboardBannerLevelFromStatusBanner(
                            guard.level,
                        )}
                        className="mb-4"
                    >
                        {guard.message}
                    </DashboardSemanticBanner>
                ) : null}
                <OrganizationDetailCard>
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

    if (detail.inspectionStatus === "completed") {
        const guard = detail.flowGuards?.inspectWorksheetView;
        return (
            <OrganizationFormLayout
                title={detail.inspectionDisplayNumber}
                description={`${detail.registrationNo} · ${detail.clientName} · ${detail.contractNumber}`}
                contentVariant="plain"
            >
                {guard ? (
                    <DashboardSemanticBanner
                        level={getDashboardBannerLevelFromStatusBanner(
                            guard.level,
                        )}
                        className="mb-4"
                    >
                        {guard.message}
                    </DashboardSemanticBanner>
                ) : null}
                <OrganizationDetailCard>
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

    const sectionItems =
        (currentSection &&
            worksheet.sections[currentSection.id]) ??
        {};

    const prevSectionTitle =
        currentIndex > 0 ? catalog[currentIndex - 1]?.title : null;
    const nextSectionTitle =
        currentIndex < catalog.length - 1
            ? catalog[currentIndex + 1]?.title
            : null;

    return (
        <>
            <OrganizationFormLayout
                title=""
                contentVariant="plain"
                header={
                    <InspectVehicleHeader
                        inspectionDisplayNumber={detail.inspectionDisplayNumber}
                        fleetCode={detail.fleetCode}
                        registrationNo={detail.registrationNo}
                        clientName={detail.clientName}
                        contractNumber={detail.contractNumber}
                        inspectorName={user?.fullName ?? user?.name ?? null}
                        completedSectionCount={completedSectionCount}
                        totalSections={catalog.length}
                        lastSavedAt={detail.inspectionLastSavedAt}
                        isSaving={saveMutation.isPending}
                    />
                }
                footer={
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <GrubpacButton
                            type="button"
                            variant="secondary"
                            disabled={saveMutation.isPending || !canInspect}
                            onClick={() =>
                                persist({
                                    sectionIndex: currentIndex,
                                    exit: true,
                                })
                            }
                        >
                            Save & exit
                        </GrubpacButton>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {currentIndex > 0 ? (
                                <GrubpacButton
                                    type="button"
                                    variant="secondary"
                                    disabled={saveMutation.isPending}
                                    onClick={() => goToSection(currentIndex - 1)}
                                >
                                    {prevSectionTitle
                                        ? `‹ ${prevSectionTitle}`
                                        : "‹ Previous section"}
                                </GrubpacButton>
                            ) : null}
                            {currentIndex < catalog.length - 1 ? (
                                <GrubpacButton
                                    type="button"
                                    disabled={!canAdvanceSection}
                                    onClick={() =>
                                        persist({
                                            sectionIndex: currentIndex + 1,
                                        })
                                    }
                                >
                                    {nextSectionTitle
                                        ? `Next: ${nextSectionTitle} ›`
                                        : "Next section ›"}
                                </GrubpacButton>
                            ) : (
                                <GrubpacButton
                                    type="button"
                                    disabled={!canComplete}
                                    onClick={openCompleteConfirm}
                                >
                                    Complete inspection
                                </GrubpacButton>
                            )}
                        </div>
                    </div>
                }
            >
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
                    <OrganizationDetailCard className="p-3">
                        <ol className="space-y-1 text-sm">
                            {catalog.map((section, index) => {
                                const sectionItemsState =
                                    worksheet.sections[section.id];
                                const done = inspectionSectionIsComplete(
                                    section,
                                    sectionItemsState,
                                );
                                const active = index === currentIndex;
                                const ratedCount =
                                    countRatedItemsInInspectionSection(
                                        section,
                                        sectionItemsState,
                                    );
                                const totalItems = section.items.length;
                                const issueCount =
                                    countIssueItemsInInspectionSection(
                                        section,
                                        sectionItemsState,
                                    );
                                return (
                                    <li key={section.id}>
                                        <button
                                            type="button"
                                            onClick={() => goToSection(index)}
                                            className={[
                                                "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition",
                                                active
                                                    ? "bg-orange-50 text-gray-900 ring-1 ring-orange-200"
                                                    : "text-gray-600 hover:bg-gray-50",
                                            ].join(" ")}
                                        >
                                            <span
                                                className={[
                                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                                    done
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-gray-100 text-gray-600",
                                                ].join(" ")}
                                            >
                                                {done ? (
                                                    <Check
                                                        className="h-3 w-3"
                                                        aria-hidden
                                                    />
                                                ) : (
                                                    index + 1
                                                )}
                                            </span>
                                            <span className="min-w-0 flex-1 leading-snug">
                                                <span className="block">
                                                    {section.title}
                                                </span>
                                                {!done && totalItems > 0 ? (
                                                    <span className="mt-0.5 block text-[11px] tabular-nums text-gray-400">
                                                        {ratedCount}/{totalItems}{" "}
                                                        rated
                                                    </span>
                                                ) : null}
                                            </span>
                                            {issueCount > 0 ? (
                                                <span
                                                    className={[
                                                        "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                                                        getDashboardSemanticTextClass(
                                                            "warning",
                                                        ),
                                                        "bg-orange-50",
                                                    ].join(" ")}
                                                    title={`${issueCount} issue${issueCount === 1 ? "" : "s"}`}
                                                >
                                                    {issueCount}
                                                </span>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard className="p-4">
                        {currentSection ? (
                            <>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold text-gray-900">
                                        {currentIndex + 1}. {currentSection.title}
                                    </h2>
                                    <GrubpacButton
                                        type="button"
                                        variant="secondary"
                                        className="h-8 text-xs"
                                        onClick={markRestPass}
                                    >
                                        Mark rest as Pass
                                    </GrubpacButton>
                                </div>
                                <div className="space-y-4">
                                    {currentSection.items.map((item) => {
                                        const row = sectionItems[item.key] ?? {
                                            rating: "unchecked" as const,
                                        };
                                        const costKey = `${currentSection.id}:${item.key}`;
                                        const showDamageFields =
                                            row.rating === "minor" ||
                                            row.rating === "major";
                                        const ratingErrorKey = `line:${currentSection.id}:${item.key}:rating`;
                                        const attributionErrorKey = `line:${currentSection.id}:${item.key}:attribution`;
                                        const noteErrorKey = `line:${currentSection.id}:${item.key}:note`;
                                        const repairErrorKey = `line:${currentSection.id}:${item.key}:repairCost`;
                                        return (
                                            <div
                                                key={item.key}
                                                className="rounded-lg border border-gray-200 p-3"
                                            >
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {item.label}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        {RATING_OPTIONS.map(
                                                            (rating) => (
                                                                <button
                                                                    key={rating}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        updateLineItem(
                                                                            currentSection.id,
                                                                            item.key,
                                                                            {
                                                                                rating,
                                                                                ...(rating ===
                                                                                "pass"
                                                                                    ? {
                                                                                          note: undefined,
                                                                                          attribution:
                                                                                              undefined,
                                                                                          repairCostMinor:
                                                                                              undefined,
                                                                                      }
                                                                                    : {}),
                                                                            },
                                                                        );
                                                                        setValidationErrors(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                const next =
                                                                                    {
                                                                                        ...prev,
                                                                                    };
                                                                                delete next[
                                                                                    ratingErrorKey
                                                                                ];
                                                                                delete next[
                                                                                    attributionErrorKey
                                                                                ];
                                                                                delete next[
                                                                                    noteErrorKey
                                                                                ];
                                                                                delete next[
                                                                                    repairErrorKey
                                                                                ];
                                                                                return next;
                                                                            },
                                                                        );
                                                                    }}
                                                                    className={getDashboardInspectionRatingToggleClass(
                                                                        rating,
                                                                        row.rating ===
                                                                            rating,
                                                                    )}
                                                                >
                                                                    {rating}
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                                {row.rating === "unchecked" ? (
                                                    <p className="text-xs text-amber-700">
                                                        Not checked yet
                                                    </p>
                                                ) : null}
                                                <FormFieldInlineError
                                                    message={
                                                        inlineFieldErrors[
                                                            ratingErrorKey
                                                        ]
                                                    }
                                                />
                                                {showDamageFields ? (
                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                        <div className="sm:col-span-2">
                                                            <RestrictedInput
                                                                restrictedKind="text"
                                                                maxLength={
                                                                    INSPECTION_LIMITS.lineNote
                                                                }
                                                                value={
                                                                    row.note ??
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) => {
                                                                    updateLineItem(
                                                                        currentSection.id,
                                                                        item.key,
                                                                        {
                                                                            note: value,
                                                                        },
                                                                    );
                                                                    setValidationErrors(
                                                                        (
                                                                            prev,
                                                                        ) => {
                                                                            const next =
                                                                                {
                                                                                    ...prev,
                                                                                };
                                                                            delete next[
                                                                                noteErrorKey
                                                                            ];
                                                                            return next;
                                                                        },
                                                                    );
                                                                }}
                                                                aria-invalid={Boolean(
                                                                    inlineFieldErrors[
                                                                        noteErrorKey
                                                                    ],
                                                                )}
                                                                placeholder="Describe damage or missing item"
                                                                className={mergeFormControlBorderClass(
                                                                    Boolean(
                                                                        inlineFieldErrors[
                                                                            noteErrorKey
                                                                        ],
                                                                    ),
                                                                    "w-full text-sm",
                                                                )}
                                                            />
                                                            <FormFieldInlineError
                                                                message={
                                                                    inlineFieldErrors[
                                                                        noteErrorKey
                                                                    ]
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                                <label
                                                                    className="block text-xs font-medium text-gray-600"
                                                                    htmlFor={`${item.key}-attribution`}
                                                                >
                                                                    Attribution
                                                                </label>
                                                                {row.attribution ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updateLineItem(
                                                                                currentSection.id,
                                                                                item.key,
                                                                                {
                                                                                    attribution:
                                                                                        undefined,
                                                                                },
                                                                            );
                                                                            setValidationErrors(
                                                                                (
                                                                                    prev,
                                                                                ) => {
                                                                                    const next =
                                                                                        {
                                                                                            ...prev,
                                                                                        };
                                                                                    delete next[
                                                                                        attributionErrorKey
                                                                                    ];
                                                                                    return next;
                                                                                },
                                                                            );
                                                                        }}
                                                                        className="text-xs text-gray-500 hover:text-red-500"
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                            <select
                                                                id={`${item.key}-attribution`}
                                                                value={
                                                                    row.attribution ??
                                                                    ""
                                                                }
                                                                onChange={(e) => {
                                                                    const nextValue =
                                                                        e.target
                                                                            .value;
                                                                    updateLineItem(
                                                                        currentSection.id,
                                                                        item.key,
                                                                        {
                                                                            attribution:
                                                                                nextValue
                                                                                    ? (nextValue as FleetReturnInspectionAttribution)
                                                                                    : undefined,
                                                                        },
                                                                    );
                                                                    setValidationErrors(
                                                                        (
                                                                            prev,
                                                                        ) => {
                                                                            const next =
                                                                                {
                                                                                    ...prev,
                                                                                };
                                                                            delete next[
                                                                                attributionErrorKey
                                                                            ];
                                                                            return next;
                                                                        },
                                                                    );
                                                                }}
                                                                aria-invalid={Boolean(
                                                                    inlineFieldErrors[
                                                                        attributionErrorKey
                                                                    ],
                                                                )}
                                                                className={mergeFormControlBorderClass(
                                                                    Boolean(
                                                                        inlineFieldErrors[
                                                                            attributionErrorKey
                                                                        ],
                                                                    ),
                                                                    "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm",
                                                                )}
                                                            >
                                                                <option value="">
                                                                    Select…
                                                                </option>
                                                                {ATTRIBUTION_OPTIONS.map(
                                                                    (opt) => (
                                                                        <option
                                                                            key={
                                                                                opt.value
                                                                            }
                                                                            value={
                                                                                opt.value
                                                                            }
                                                                        >
                                                                            {
                                                                                opt.label
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                            <FormFieldInlineError
                                                                message={
                                                                    inlineFieldErrors[
                                                                        attributionErrorKey
                                                                    ]
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                Repair estimate
                                                            </label>
                                                            <RestrictedInput
                                                                restrictedKind="inrRupee"
                                                                value={
                                                                    repairCostInputs[
                                                                        costKey
                                                                    ] ??
                                                                    (row.repairCostMinor !=
                                                                    null
                                                                        ? formatInrFromMinor(
                                                                              row.repairCostMinor,
                                                                          ).replace(
                                                                              /^₹\s?/,
                                                                              "",
                                                                          )
                                                                        : "")
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) => {
                                                                    setRepairCostInputs(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            [costKey]:
                                                                                value,
                                                                        }),
                                                                    );
                                                                    const minor =
                                                                        parseRupeeInputToMinor(
                                                                            value,
                                                                        );
                                                                    updateLineItem(
                                                                        currentSection.id,
                                                                        item.key,
                                                                        {
                                                                            repairCostMinor:
                                                                                minor ??
                                                                                undefined,
                                                                        },
                                                                    );
                                                                    setValidationErrors(
                                                                        (
                                                                            prev,
                                                                        ) => {
                                                                            const next =
                                                                                {
                                                                                    ...prev,
                                                                                };
                                                                            delete next[
                                                                                repairErrorKey
                                                                            ];
                                                                            return next;
                                                                        },
                                                                    );
                                                                }}
                                                                aria-invalid={Boolean(
                                                                    inlineFieldErrors[
                                                                        repairErrorKey
                                                                    ],
                                                                )}
                                                                className={mergeFormControlBorderClass(
                                                                    Boolean(
                                                                        inlineFieldErrors[
                                                                            repairErrorKey
                                                                        ],
                                                                    ),
                                                                    "w-full text-sm",
                                                                )}
                                                                placeholder="0"
                                                            />
                                                            <FormFieldInlineError
                                                                message={
                                                                    inlineFieldErrors[
                                                                        repairErrorKey
                                                                    ]
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : null}
                    </OrganizationDetailCard>

                    <OrganizationDetailCard className="p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            So far
                        </h3>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Major</dt>
                                <dd
                                    className={[
                                        "font-medium tabular-nums",
                                        getDashboardSemanticTextClass(
                                            (liveSummary?.majorCount ?? 0) > 0
                                                ? "danger"
                                                : "neutral",
                                        ),
                                    ].join(" ")}
                                >
                                    {liveSummary?.majorCount ?? 0}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Minor</dt>
                                <dd
                                    className={[
                                        "font-medium tabular-nums",
                                        getDashboardSemanticTextClass(
                                            (liveSummary?.minorCount ?? 0) > 0
                                                ? "warning"
                                                : "neutral",
                                        ),
                                    ].join(" ")}
                                >
                                    {liveSummary?.minorCount ?? 0}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Missing items</dt>
                                <dd className="font-medium text-gray-900">
                                    {liveSummary?.missingCount ?? 0}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Excess km</dt>
                                <dd className="font-medium text-gray-900">
                                    {(liveSummary?.excessKm ?? 0).toLocaleString(
                                        "en-IN",
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-2">
                                <dt className="text-gray-600">
                                    Repair estimate
                                </dt>
                                <dd className="font-medium text-gray-900">
                                    {formatInrFromMinor(
                                        liveSummary?.repairEstimateMinor ?? 0,
                                    )}
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-4 text-xs text-gray-500">
                            Any Major item means the vehicle can&apos;t go
                            straight to Available.
                        </p>
                    </OrganizationDetailCard>
                </div>
            </OrganizationFormLayout>

            <ConfirmDialog
                open={completeConfirmOpen}
                title="Complete inspection?"
                message="This saves the full checklist and opens review — charges, disposition, and completion happen on the next screen."
                confirmLabel="Continue to review"
                isConfirmPending={saveMutation.isPending}
                onConfirm={() =>
                    persist({
                        complete: true,
                        sectionIndex: currentIndex,
                    })
                }
                onClose={() => setCompleteConfirmOpen(false)}
                confirmDisabled={!canComplete}
            />
        </>
    );
}
