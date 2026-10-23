"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardPageLoadingShell } from "@/components/dashboard/dashboard-async-states";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-semantic-cell";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedTextarea } from "@/components/ui/RestrictedTextarea";
import { useAuth } from "@/providers/auth-provider";
import {
    completeFleetReturnInspectionFinalizeApi,
    fetchFleetReturnDetailApi,
    saveFleetReturnInspectionFinalizeApi,
    type FleetReturnInspectionDisposition,
    type FleetReturnInspectionFinalizeDraft,
    type FleetReturnInspectionSectionId,
    type FleetReturnWorkshopPriority,
} from "@/lib/api/fleet-leasing/returns";
import { ApiClientError } from "@/lib/api/client";
import { VEHICLE_RETURN_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { formatInrFromMinor } from "@/lib/format/money-format";
import {
    collectVehicleReturnInspectIssues,
    computeClientRecoveryTotalMinor,
    defaultWorkshopTargetDateIso,
    dispositionFooterSummary,
} from "@/lib/format/vehicle-return-inspect-finalize";
import { getDashboardSemanticTextClass } from "@/lib/format/dashboard-table-semantic-presentation";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
    showErrorToast,
    showVehicleReturnInspectionCompletedToast,
} from "@/lib/toast/show-toast";
import { useSecureEntityId } from "@/lib/navigation/use-secure-entity-id";
import {
    assetRegisterVehicleReturnInspectHref,
    assetRegisterVehicleReturnInspectResultHref,
} from "@/lib/navigation/asset-register-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { invalidateLeaseContractCaches } from "@/lib/query/invalidate-lease-contract-caches";
import {
    suggestDefaultDisposition,
    validateInspectionFinalizeForm,
    vehicleReturnFormIsValid,
    type VehicleReturnFieldErrors,
} from "@/lib/validation/vehicle-return-form-validation";

const DISPOSITION_OPTIONS: Array<{
    value: FleetReturnInspectionDisposition;
    title: string;
    description: string;
}> = [
    {
        value: "ready_to_lease",
        title: "Ready to lease",
        description: "Return to the Available pool when charges are settled.",
    },
    {
        value: "send_to_workshop",
        title: "Send to workshop",
        description: "Open a job card for major or selected repairs.",
    },
    {
        value: "on_hold",
        title: "Put on hold",
        description: "Keep on return hold until operations clears it.",
    },
    {
        value: "retire",
        title: "Retire",
        description: "Mark the asset retired after this return.",
    },
];

const PRIORITY_OPTIONS: Array<{
    value: FleetReturnWorkshopPriority;
    label: string;
}> = [
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
];

function attributionLabel(
    attribution: string | undefined,
): string {
    if (attribution === "client_damage") return "Client damage";
    if (attribution === "wear_tear") return "Wear & tear";
    if (attribution === "pre_existing") return "Pre-existing";
    if (attribution === "missing") return "Missing";
    return "—";
}

function buildIssueChargePayload(
    issueRows: ReturnType<typeof collectVehicleReturnInspectIssues>,
    draft: FleetReturnInspectionFinalizeDraft,
) {
    return issueRows.map((issue) => ({
        sectionId: issue.sectionId as FleetReturnInspectionSectionId,
        itemKey: issue.itemKey,
        chargeClient:
            draft.issueCharges[issue.chargeKey] ??
            (issue.attribution === "client_damage" ||
                issue.attribution === "missing"),
    }));
}

export default function InspectFinalizeVehicleReturnPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const inspectionId = useSecureEntityId();
    const { token, organizationId, permissions, user } = useAuth();

    const canInspect =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const [draft, setDraft] = useState<FleetReturnInspectionFinalizeDraft | null>(
        null,
    );
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

    useEffect(() => {
        if (!detail || initialized) return;
        const fromApi = detail.inspectionFinalizeDraft;
        const majorCount = detail.inspectionSummary?.majorCount ?? 0;
        const issueRows = collectVehicleReturnInspectIssues(
            detail.inspectionSectionCatalog,
            detail.inspectionWorksheet,
        );
        const issueCharges = { ...fromApi.issueCharges };
        for (const row of issueRows) {
            if (issueCharges[row.chargeKey] === undefined) {
                issueCharges[row.chargeKey] =
                    row.attribution === "client_damage" ||
                    row.attribution === "missing";
            }
        }
        setDraft({
            ...fromApi,
            issueCharges,
            disposition:
                fromApi.disposition ??
                suggestDefaultDisposition(majorCount),
            workshopPriority: fromApi.workshopPriority ?? "normal",
            workshopTargetDate:
                fromApi.workshopTargetDate ?? defaultWorkshopTargetDateIso(),
        });
        setInitialized(true);
    }, [detail, initialized]);

    useEffect(() => {
        if (!detail || detailQuery.isLoading) return;
        if (detail.inspectionStatus === "completed") {
            navigateToEntityShell(
                router,
                assetRegisterVehicleReturnInspectResultHref(inspectionId),
                inspectionId,
                "replace",
            );
            return;
        }
        if (detail.inspectionStatus !== "ready_to_finalize") {
            navigateToEntityShell(
                router,
                assetRegisterVehicleReturnInspectHref(inspectionId),
                inspectionId,
                "replace",
            );
        }
    }, [detail, detailQuery.isLoading, inspectionId, router]);

    const issues = useMemo(() => {
        if (!detail) return [];
        return collectVehicleReturnInspectIssues(
            detail.inspectionSectionCatalog,
            detail.inspectionWorksheet,
        );
    }, [detail]);

    const recoveryTotalMinor = useMemo(() => {
        if (!draft || !detail?.inspectionSummary) return 0;
        return computeClientRecoveryTotalMinor(
            issues,
            detail.inspectionSummary,
            draft,
        );
    }, [draft, detail?.inspectionSummary, issues]);

    const saveMutation = useMutation({
        mutationFn: (payload: {
            complete?: boolean;
            exit?: boolean;
            draftSnapshot: FleetReturnInspectionFinalizeDraft;
        }) => {
            const body = {
                disposition: payload.draftSnapshot.disposition ?? undefined,
                issueCharges: buildIssueChargePayload(
                    issues,
                    payload.draftSnapshot,
                ),
                waiveAllRecovery: payload.draftSnapshot.waiveAllRecovery,
                inspectorConfirmed: payload.draftSnapshot.inspectorConfirmed,
                wearAndTearNote: payload.draftSnapshot.wearAndTearNote,
                workshopPriority: payload.draftSnapshot.workshopPriority,
                workshopTargetDate: payload.draftSnapshot.workshopTargetDate,
            };
            if (payload.complete) {
                return completeFleetReturnInspectionFinalizeApi({
                    token: token!,
                    organizationId: organizationId!,
                    inspectionId,
                    body,
                });
            }
            return saveFleetReturnInspectionFinalizeApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
                body: { ...body, complete: false },
            });
        },
        onSuccess: async (updated, vars) => {
            setDraft(updated.inspectionFinalizeDraft);
            await queryClient.invalidateQueries({
                queryKey: ["fleet-return", inspectionId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["fleet-returns"],
            });
            if (vars.complete && detail?.contractId) {
                await invalidateLeaseContractCaches(
                    queryClient,
                    organizationId,
                    detail.contractId,
                );
            }
            if (vars.complete) {
                setCompleteConfirmOpen(false);
                const toWorkshop =
                    updated.inspectionResult?.outcome === "sent_to_workshop";
                showVehicleReturnInspectionCompletedToast(
                    updated.registrationNo,
                    toWorkshop,
                );
                navigateToEntityShell(
                    router,
                    assetRegisterVehicleReturnInspectResultHref(inspectionId),
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
                    : "Could not save inspection review.";
            showErrorToast(message);
        },
    });

    const completeValidationErrors = useMemo(() => {
        if (!draft) return {};
        return validateInspectionFinalizeForm({ draft, complete: true });
    }, [draft]);

    const canComplete =
        canInspect &&
        Boolean(draft?.disposition) &&
        Boolean(draft?.inspectorConfirmed) &&
        vehicleReturnFormIsValid(completeValidationErrors) &&
        !saveMutation.isPending;

    const footerLine = dispositionFooterSummary(
        draft?.disposition ?? null,
        recoveryTotalMinor,
    );

    const persist = (opts: {
        complete?: boolean;
        exit?: boolean;
    }) => {
        if (!canInspect || !draft) return;
        if (opts.complete) {
            const errors = validateInspectionFinalizeForm({
                draft,
                complete: true,
            });
            setValidationErrors(errors);
            if (!vehicleReturnFormIsValid(errors)) return;
        }
        saveMutation.mutate({ ...opts, draftSnapshot: draft });
    };

    if (!inspectionId) {
        return (
            <OrganizationFormLayout
                title="Review inspection"
                description="Review issues, client charges, and disposition before completing."
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-amber-900">
                        Open this flow from Vehicle Returns after completing the
                        checklist.
                    </p>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    if (detailQuery.isLoading || !detail || !draft) {
        return (
            <OrganizationFormLayout
                title="Review inspection"
                description="Review issues, client charges, and disposition before completing."
                contentVariant="plain"
            >
                <DashboardPageLoadingShell label="Loading review…" />
            </OrganizationFormLayout>
        );
    }

    if (detailQuery.isError) {
        return (
            <OrganizationFormLayout
                title="Review inspection"
                description="Review issues, client charges, and disposition before completing."
                contentVariant="plain"
            >
                <OrganizationDetailCard>
                    <p className="text-sm text-red-800">
                        Could not load inspection review.{" "}
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

    const excessKmMinor =
        (detail.inspectionSummary?.excessKm ?? 0) > 0 && !draft.waiveAllRecovery
            ? (detail.inspectionSummary?.excessKm ?? 0) * 400
            : 0;

    return (
        <>
            <OrganizationFormLayout
                title="Review & complete inspection"
                description={`${detail.fleetCode} · ${detail.registrationNo} · ${detail.clientName}`}
                contentVariant="plain"
            >
                <div className="space-y-6 pb-28">
                    <OrganizationDetailCard>
                        <DashboardSectionHeader>
                            Issues from checklist
                        </DashboardSectionHeader>
                        {issues.length === 0 ? (
                            <p className="text-sm text-gray-600">
                                No minor or major issues were recorded — excess
                                km may still apply.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                                            <th className="py-2 pr-3 font-medium">
                                                Item
                                            </th>
                                            <th className="py-2 pr-3 font-medium">
                                                Rating
                                            </th>
                                            <th className="py-2 pr-3 font-medium">
                                                Attribution
                                            </th>
                                            <th className="py-2 pr-3 font-medium">
                                                Est. repair
                                            </th>
                                            <th className="py-2 font-medium">
                                                Charge client
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map((issue) => {
                                            const charge =
                                                draft.issueCharges[
                                                    issue.chargeKey
                                                ] ??
                                                (issue.attribution ===
                                                    "client_damage" ||
                                                issue.attribution === "missing");
                                            return (
                                                <tr
                                                    key={issue.chargeKey}
                                                    className="border-b border-gray-100"
                                                >
                                                    <td className="py-2 pr-3 text-gray-900">
                                                        {issue.label}
                                                    </td>
                                                    <td
                                                        className={`py-2 pr-3 capitalize ${getDashboardSemanticTextClass(issue.rating === "major" ? "danger" : "warning")}`}
                                                    >
                                                        {issue.rating}
                                                    </td>
                                                    <td className="py-2 pr-3 text-gray-700">
                                                        {attributionLabel(
                                                            issue.attribution,
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-3 text-gray-900">
                                                        {formatInrFromMinor(
                                                            issue.repairCostMinor ??
                                                                0,
                                                        )}
                                                    </td>
                                                    <td className="py-2">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300"
                                                            checked={charge}
                                                            disabled={
                                                                !canInspect ||
                                                                draft.waiveAllRecovery
                                                            }
                                                            onChange={(e) => {
                                                                setDraft(
                                                                    (prev) =>
                                                                        prev
                                                                            ? {
                                                                                  ...prev,
                                                                                  issueCharges:
                                                                                      {
                                                                                          ...prev.issueCharges,
                                                                                          [issue.chargeKey]:
                                                                                              e
                                                                                                  .target
                                                                                                  .checked,
                                                                                      },
                                                                              }
                                                                            : prev,
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <DashboardSectionHeader>Client charges</DashboardSectionHeader>
                        <dl className="space-y-2 text-sm">
                            {(detail.inspectionSummary?.excessKm ?? 0) > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-600">
                                        Excess km (
                                        {(
                                            detail.inspectionSummary?.excessKm ??
                                            0
                                        ).toLocaleString("en-IN")}
                                        )
                                    </dt>
                                    <dd className="font-medium text-gray-900">
                                        {draft.waiveAllRecovery
                                            ? "—"
                                            : formatInrFromMinor(excessKmMinor)}
                                    </dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-100 pt-2">
                                <dt className="font-medium text-gray-900">
                                    Total to bill client
                                </dt>
                                <dd className="font-semibold text-gray-900">
                                    {formatInrFromMinor(recoveryTotalMinor)}
                                </dd>
                            </div>
                        </dl>
                        <label className="mt-4 flex items-center gap-2 text-sm text-gray-800">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={draft.waiveAllRecovery}
                                disabled={!canInspect}
                                onChange={(e) =>
                                    setDraft((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  waiveAllRecovery:
                                                      e.target.checked,
                                              }
                                            : prev,
                                    )
                                }
                            />
                            Waive all recovery charges
                        </label>
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <DashboardSectionHeader>
                            Wear & tear note
                        </DashboardSectionHeader>
                        <p className="mb-2 text-xs text-gray-500">
                            Optional — internal note for wear-and-tear items
                            (not billed to client).
                        </p>
                        <RestrictedTextarea
                            rows={3}
                            value={draft.wearAndTearNote ?? ""}
                            disabled={!canInspect}
                            maxLength={
                                VEHICLE_RETURN_INPUT_LIMITS.inspectionFinalize
                                    .wearAndTearNote
                            }
                            onChange={(wearAndTearNote) =>
                                setDraft((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              wearAndTearNote,
                                          }
                                        : prev,
                                )
                            }
                            className={mergeFormControlBorderClass(
                                Boolean(validationErrors.wearAndTearNote),
                                "w-full rounded-md border border-gray-300 px-3 py-2 text-sm",
                            )}
                        />
                        <FormFieldInlineError
                            message={validationErrors.wearAndTearNote}
                        />
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <DashboardSectionHeader>Disposition</DashboardSectionHeader>
                        <FormFieldInlineError
                            message={validationErrors.disposition}
                        />
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {DISPOSITION_OPTIONS.map((opt) => {
                                const selected =
                                    draft.disposition === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={!canInspect}
                                        onClick={() =>
                                            setDraft((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          disposition:
                                                              opt.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                        className={`rounded-lg border p-4 text-left transition-colors ${
                                            selected
                                                ? "border-[#FE5720] bg-orange-50/50 ring-1 ring-[#FE5720]/30"
                                                : "border-gray-200 bg-white hover:border-gray-300"
                                        }`}
                                    >
                                        <p className="font-medium text-gray-900">
                                            {opt.title}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-600">
                                            {opt.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {draft.disposition === "send_to_workshop" && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Workshop priority
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        value={
                                            draft.workshopPriority ?? "normal"
                                        }
                                        disabled={!canInspect}
                                        onChange={(e) =>
                                            setDraft((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          workshopPriority: e
                                                              .target
                                                              .value as FleetReturnWorkshopPriority,
                                                      }
                                                    : prev,
                                            )
                                        }
                                    >
                                        {PRIORITY_OPTIONS.map((p) => (
                                            <option
                                                key={p.value}
                                                value={p.value}
                                            >
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Target ready date
                                    </label>
                                    <input
                                        type="date"
                                        className={mergeFormControlBorderClass(
                                            Boolean(
                                                validationErrors.workshopTargetDate,
                                            ),
                                            "w-full rounded-md border border-gray-300 px-3 py-2 text-sm",
                                        )}
                                        value={
                                            draft.workshopTargetDate ?? ""
                                        }
                                        disabled={!canInspect}
                                        onChange={(e) =>
                                            setDraft((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          workshopTargetDate:
                                                              e.target.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                    />
                                    <FormFieldInlineError
                                        message={
                                            validationErrors.workshopTargetDate
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </OrganizationDetailCard>

                    <OrganizationDetailCard>
                        <label className="flex items-start gap-2 text-sm text-gray-800">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                                checked={draft.inspectorConfirmed}
                                disabled={!canInspect}
                                onChange={(e) =>
                                    setDraft((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  inspectorConfirmed:
                                                      e.target.checked,
                                              }
                                            : prev,
                                    )
                                }
                            />
                            <span>
                                I confirm the checklist, client charges, and
                                disposition are correct
                                {user?.name ? ` (${user.name})` : ""}
                                .
                            </span>
                        </label>
                        <FormFieldInlineError
                            message={validationErrors.inspectorConfirmed}
                        />
                    </OrganizationDetailCard>
                </div>

                <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:pl-[var(--sidebar-width,16rem)]">
                    <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-700">{footerLine}</p>
                        <div className="flex flex-wrap gap-2">
                            <GrubpacButton
                                type="button"
                                variant="secondary"
                                disabled={!canInspect || saveMutation.isPending}
                                onClick={() => persist({ exit: true })}
                            >
                                Save & exit
                            </GrubpacButton>
                            <GrubpacButton
                                type="button"
                                disabled={!canComplete}
                                onClick={() => setCompleteConfirmOpen(true)}
                            >
                                Complete inspection
                            </GrubpacButton>
                        </div>
                    </div>
                </div>
            </OrganizationFormLayout>

            <ConfirmDialog
                open={completeConfirmOpen}
                title="Complete inspection?"
                message={footerLine}
                confirmLabel="Complete inspection"
                isConfirmPending={saveMutation.isPending}
                onConfirm={() => persist({ complete: true })}
                onClose={() => setCompleteConfirmOpen(false)}
                confirmDisabled={!canComplete}
            />
        </>
    );
}
