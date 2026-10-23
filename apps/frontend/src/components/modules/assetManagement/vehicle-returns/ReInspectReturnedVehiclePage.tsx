"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardPageLoadingShell } from "@/components/dashboard/dashboard-async-states";
import {
    DashboardSemanticBanner,
    DashboardStatusPill,
} from "@/components/dashboard/dashboard-semantic-cell";
import { ErrorState } from "@/components/states/async-states";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { useAuth } from "@/providers/auth-provider";
import {
    fetchFleetReturnDetailApi,
    saveFleetReturnReInspectionApi,
    startFleetReturnReInspectionApi,
    type FleetReturnReInspectionItemRating,
    type FleetReturnReInspectionPoolChecklist,
    type FleetReturnReInspectionWorksheet,
} from "@/lib/api/fleet-leasing/returns";
import { ApiClientError } from "@/lib/api/client";
import { formatInrFromMinor } from "@/lib/format/money-format";
import {
    getDashboardBannerLevelFromStatusBanner,
    getDashboardInspectionRatingToggleClass,
    getDashboardInspectionSeverityDotClass,
} from "@/lib/format/dashboard-semantic-surfaces";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useSecureEntityId } from "@/lib/navigation/use-secure-entity-id";
import { assetRegisterVehicleReturnInspectResultHref } from "@/lib/navigation/asset-register-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import {
    showErrorToast,
    showVehicleReturnReInspectionCompletedToast,
} from "@/lib/toast/show-toast";
import { VEHICLE_RETURN_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
    validateReInspectionWorksheet,
    vehicleReturnFormIsValid,
    type VehicleReturnFieldErrors,
} from "@/lib/validation/vehicle-return-form-validation";

const RE_INSPECTION_LIMITS = VEHICLE_RETURN_INPUT_LIMITS.reInspection;

const RATING_OPTIONS: FleetReturnReInspectionItemRating[] = [
    "pass",
    "minor",
    "major",
];

function poolChecklistLabels(keysHandedOver: number | null): Array<{
    key: keyof FleetReturnReInspectionPoolChecklist;
    label: string;
}> {
    const keysLabel =
        keysHandedOver != null && keysHandedOver > 0
            ? `${keysHandedOver} keys present`
            : "Keys present";
    return [
        {
            key: "roadTestDone",
            label: "Road test done, no warning lights",
        },
        { key: "washedCleaned", label: "Washed and cleaned" },
        {
            key: "fuelLevelChecked",
            label: `${keysLabel} (fuel level checked)`,
        },
        {
            key: "insuranceValidAck",
            label: "Insurance valid (acknowledged)",
        },
        { key: "pucValidAck", label: "PUC valid (acknowledged)" },
    ];
}

export default function ReInspectReturnedVehiclePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const inspectionId = useSecureEntityId();
    const { token, organizationId, permissions } = useAuth();

    const canView =
        permissions.has("fleet_leasing.view") ||
        permissions.has("fleet_leasing.manage") ||
        permissions.has("asset_register.view") ||
        permissions.has("asset_register.manage");

    const canInspect =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const [worksheet, setWorksheet] =
        useState<FleetReturnReInspectionWorksheet | null>(null);
    const [odometerInput, setOdometerInput] = useState("");
    const [startAttempted, setStartAttempted] = useState(false);
    const [validationErrors, setValidationErrors] =
        useState<VehicleReturnFieldErrors>({});
    const [hasAttemptedComplete, setHasAttemptedComplete] = useState(false);

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
            Boolean(inspectionId) &&
            canView,
        ...dashboardListQueryOptions,
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (
                data?.inspectionResult?.outcome === "sent_to_workshop" &&
                !data.workshopRepairClosedAt
            ) {
                return 15_000;
            }
            return false;
        },
    });

    const detail = detailQuery.data;

    const startMutation = useMutation({
        mutationFn: () =>
            startFleetReturnReInspectionApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
            }),
        onSuccess: (data) => {
            setWorksheet(data.reInspection.worksheet);
            if (data.reInspection.worksheet?.odometerAfterRoadTest != null) {
                setOdometerInput(
                    String(data.reInspection.worksheet.odometerAfterRoadTest),
                );
            }
            queryClient.setQueryData(
                ["fleet-return", inspectionId, organizationId],
                data,
            );
        },
        onError: (err) => {
            showErrorToast(
                err instanceof ApiClientError
                    ? err.message
                    : "Could not start re-inspection.",
            );
        },
    });

    useEffect(() => {
        if (!detail || startAttempted || !canInspect) return;
        if (detail.reInspection.status === "completed") return;
        if (detail.reInspection.worksheet) {
            setWorksheet(detail.reInspection.worksheet);
            if (detail.reInspection.worksheet.odometerAfterRoadTest != null) {
                setOdometerInput(
                    String(detail.reInspection.worksheet.odometerAfterRoadTest),
                );
            }
            return;
        }
        if (detail.reInspection.eligible && detail.reInspection.status === "not_started") {
            setStartAttempted(true);
            startMutation.mutate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once when eligible
    }, [detail, startAttempted, canInspect]);

    useEffect(() => {
        if (detail?.reInspection.worksheet && !worksheet) {
            setWorksheet(detail.reInspection.worksheet);
            if (detail.reInspection.worksheet.odometerAfterRoadTest != null) {
                setOdometerInput(
                    String(detail.reInspection.worksheet.odometerAfterRoadTest),
                );
            }
        }
    }, [detail, worksheet]);

    const saveMutation = useMutation({
        mutationFn: (complete: boolean) => {
            if (!worksheet) throw new Error("Missing worksheet");
            return saveFleetReturnReInspectionApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
                body: {
                    items: worksheet.items.map((item) => ({
                        itemKey: item.itemKey,
                        sectionId: item.sectionId,
                        rating: item.rating,
                    })),
                    poolChecklist: worksheet.poolChecklist,
                    odometerAfterRoadTest: worksheet.odometerAfterRoadTest ?? 0,
                    selectedOutcome: worksheet.selectedOutcome ?? "ready_to_lease",
                    workshopActualCostMinor:
                        worksheet.workshopActualCostMinor ?? undefined,
                    complete,
                },
            });
        },
        onSuccess: (data, complete) => {
            queryClient.invalidateQueries({
                queryKey: ["fleet-return", inspectionId, organizationId],
            });
            queryClient.invalidateQueries({ queryKey: ["fleet-returns"] });
            if (complete) {
                showVehicleReturnReInspectionCompletedToast(data.fleetCode);
                navigateToEntityShell(
                    router,
                    assetRegisterVehicleReturnInspectResultHref(inspectionId),
                    inspectionId,
                    "replace",
                );
                return;
            }
            router.push("/asset-register/vehicle-returns/");
        },
        onError: (err) => {
            showErrorToast(
                err instanceof ApiClientError
                    ? err.message
                    : "Could not save re-inspection.",
            );
        },
    });

    const updateRating = useCallback(
        (itemKey: string, rating: FleetReturnReInspectionItemRating) => {
            setWorksheet((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    items: prev.items.map((item) =>
                        item.itemKey === itemKey ? { ...item, rating } : item,
                    ),
                };
            });
        },
        [],
    );

    const toggleChecklist = useCallback(
        (key: keyof FleetReturnReInspectionPoolChecklist) => {
            setWorksheet((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    poolChecklist: {
                        ...prev.poolChecklist,
                        [key]: !prev.poolChecklist[key],
                    },
                };
            });
        },
        [],
    );

    const clientValidationErrors = useMemo(() => {
        if (!worksheet) return {};
        return validateReInspectionWorksheet(worksheet);
    }, [worksheet]);

    const canSubmit = useMemo(() => {
        if (!worksheet || !canInspect || saveMutation.isPending) return false;
        return vehicleReturnFormIsValid(clientValidationErrors);
    }, [worksheet, canInspect, saveMutation.isPending, clientValidationErrors]);

    const submitComplete = () => {
        if (!worksheet) return;
        setHasAttemptedComplete(true);
        setValidationErrors(clientValidationErrors);
        if (!vehicleReturnFormIsValid(clientValidationErrors)) return;
        saveMutation.mutate(true);
    };

    const validationSummary = Object.values(validationErrors).filter(Boolean);

    if (detailQuery.isLoading || startMutation.isPending || !token || !organizationId) {
        return <DashboardPageLoadingShell />;
    }

    if (detailQuery.isError || !detail) {
        return (
            <OrganizationFormLayout title="Re-inspection" contentVariant="plain">
                <ErrorState
                    message="Could not load re-inspection."
                    onRetry={() => detailQuery.refetch()}
                />
            </OrganizationFormLayout>
        );
    }

    const reInspection = detail.reInspection;

    if (reInspection.status === "completed") {
        const completedBanner =
            reInspection.statusBanner ?? detail.flowGuards?.reInspectView;
        return (
            <OrganizationFormLayout
                title={detail.fleetCode}
                contentVariant="plain"
            >
                {completedBanner ? (
                    <DashboardSemanticBanner
                        level={getDashboardBannerLevelFromStatusBanner(
                            completedBanner.level,
                        )}
                        className="mb-4"
                    >
                        {completedBanner.message}
                    </DashboardSemanticBanner>
                ) : null}
                <OrganizationDetailCard className="p-6">
                    <GrubpacButton
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={() =>
                            navigateToEntityShell(
                                router,
                                assetRegisterVehicleReturnInspectResultHref(
                                    inspectionId,
                                ),
                                inspectionId,
                                "push",
                            )
                        }
                    >
                        View inspection result
                    </GrubpacButton>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (!reInspection.eligible || !worksheet) {
        const ineligibleBanner =
            reInspection.statusBanner ?? detail.flowGuards?.reInspectView;
        return (
            <OrganizationFormLayout
                title={detail.fleetCode}
                contentVariant="plain"
            >
                {ineligibleBanner ? (
                    <DashboardSemanticBanner
                        level={getDashboardBannerLevelFromStatusBanner(
                            ineligibleBanner.level,
                        )}
                        className="mb-4"
                    >
                        {ineligibleBanner.message}
                    </DashboardSemanticBanner>
                ) : null}
                <GrubpacButton
                    type="button"
                    variant="secondary"
                    onClick={() =>
                        router.push("/asset-register/vehicle-returns/")
                    }
                >
                    Back to Vehicle Returns
                </GrubpacButton>
            </OrganizationFormLayout>
        );
    }

    const headerMeta = [
        detail.fleetCode,
        detail.registrationNo,
        reInspection.jobCardDisplayNumber
            ? `Job card ${reInspection.jobCardDisplayNumber}`
            : null,
    ]
        .filter(Boolean)
        .join(" · ");

    const markReadyAction = reInspection.availableActions.find(
        (a) => a.actionKey === "mark_ready_to_lease",
    );

    return (
        <OrganizationFormLayout
            title={reInspection.displayNumber}
            description={headerMeta}
            contentVariant="plain"
            headerAction={
                <DashboardStatusPill label="In inspection" level="violet" />
            }
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {hasAttemptedComplete && validationSummary.length > 0 ? (
                        <div
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                            role="alert"
                        >
                            {validationSummary[0]}
                        </div>
                    ) : null}
                    <OrganizationDetailCard className="p-4">
                        <h2 className="text-sm font-semibold text-gray-900">
                            Repaired items
                        </h2>
                        <p className="mt-1 text-xs text-gray-600">
                            Only items that failed the initial inspection are
                            checked again.
                        </p>
                        <ul className="mt-4 space-y-4">
                            {worksheet.items.map((item) => {
                                const itemErrorKey = `item:${item.itemKey}`;
                                return (
                                <li
                                    key={item.itemKey}
                                    className="rounded-lg border border-gray-200 p-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.label}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                                                Was
                                                <span
                                                    className={`inline-block h-1.5 w-1.5 rounded-full ${getDashboardInspectionSeverityDotClass(item.priorRating)}`}
                                                    aria-hidden
                                                />
                                                {item.priorDetail}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {RATING_OPTIONS.map((rating) => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    onClick={() => {
                                                        updateRating(
                                                            item.itemKey,
                                                            rating,
                                                        );
                                                        setValidationErrors(
                                                            (prev) => {
                                                                const next = {
                                                                    ...prev,
                                                                };
                                                                delete next[
                                                                    itemErrorKey
                                                                ];
                                                                return next;
                                                            },
                                                        );
                                                    }}
                                                    className={getDashboardInspectionRatingToggleClass(
                                                        rating,
                                                        item.rating === rating,
                                                    )}
                                                >
                                                    {rating}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <FormFieldInlineError
                                        message={
                                            validationErrors[itemErrorKey]
                                        }
                                    />
                                </li>
                            );
                            })}
                        </ul>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard className="p-4">
                        <h2 className="text-sm font-semibold text-gray-900">
                            Before it goes back in the pool
                        </h2>
                        <label className="mt-4 block text-sm text-gray-700">
                            Odometer after road test
                            <RestrictedInput
                                className={mergeFormControlBorderClass(
                                    Boolean(
                                        validationErrors.odometerAfterRoadTest,
                                    ),
                                    "mt-1 max-w-xs",
                                )}
                                restrictedKind="digits"
                                maxLength={
                                    RE_INSPECTION_LIMITS.odometerMaxDigits
                                }
                                value={odometerInput}
                                onChange={(next) => {
                                    setOdometerInput(next);
                                    const parsed = next
                                        ? Number.parseInt(next, 10)
                                        : null;
                                    setWorksheet((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  odometerAfterRoadTest: parsed,
                                              }
                                            : prev,
                                    );
                                    setValidationErrors((prev) => {
                                        const nextErrors = { ...prev };
                                        delete nextErrors.odometerAfterRoadTest;
                                        return nextErrors;
                                    });
                                }}
                                aria-invalid={Boolean(
                                    validationErrors.odometerAfterRoadTest,
                                )}
                            />
                            <FormFieldInlineError
                                message={
                                    validationErrors.odometerAfterRoadTest
                                }
                            />
                        </label>
                        <FormFieldInlineError
                            message={validationErrors.poolChecklist}
                        />
                        <ul className="mt-4 space-y-2">
                            {poolChecklistLabels(
                                detail.expectedReturn.keysHandedOver,
                            ).map(({ key, label }) => (
                                <li key={key}>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={
                                                worksheet.poolChecklist[key]
                                            }
                                            onChange={() => {
                                                toggleChecklist(key);
                                                setValidationErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next.poolChecklist;
                                                    return next;
                                                });
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-[#FE5720] focus:ring-[#FE5720]"
                                        />
                                        {label}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </OrganizationDetailCard>
                </div>

                <OrganizationDetailCard className="h-fit p-4 lg:col-span-1">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Outcome
                    </h2>
                    <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border-2 border-[#FE5720] p-3">
                        <input
                            type="radio"
                            name="reinspect-outcome"
                            checked={
                                worksheet.selectedOutcome === "ready_to_lease"
                            }
                            onChange={() =>
                                setWorksheet((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              selectedOutcome: "ready_to_lease",
                                          }
                                        : prev,
                                )
                            }
                            className="mt-0.5"
                        />
                        <span>
                            <span className="block text-sm font-medium text-gray-900">
                                Ready to lease
                            </span>
                            <span className="text-xs text-gray-600">
                                Vehicle returns to the Available pool
                            </span>
                        </span>
                    </label>
                    <p className="mt-4 text-xs text-gray-600">
                        Workshop cost:{" "}
                        {formatInrFromMinor(
                            reInspection.outcomeSummary
                                .workshopCostActualMinor ?? 0,
                        )}{" "}
                        actual vs{" "}
                        {formatInrFromMinor(
                            reInspection.outcomeSummary
                                .workshopCostEstimateMinor ?? 0,
                        )}{" "}
                        estimate.
                    </p>
                    {reInspection.outcomeSummary.recoveryNoteUnchanged ? (
                        <p className="mt-2 text-xs text-gray-500">
                            The recovery note to {detail.clientName} is
                            unchanged.
                        </p>
                    ) : null}
                </OrganizationDetailCard>
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
                <GrubpacButton
                    type="button"
                    variant="secondary"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(false)}
                >
                    Save & exit
                </GrubpacButton>
                <GrubpacButton
                    type="button"
                    disabled={!canSubmit}
                    title={markReadyAction?.reasonDisabled}
                    onClick={submitComplete}
                >
                    Mark ready to lease
                </GrubpacButton>
            </div>
        </OrganizationFormLayout>
    );
}
