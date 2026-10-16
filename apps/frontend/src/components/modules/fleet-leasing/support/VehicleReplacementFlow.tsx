"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import OrganizationFormLayout, {
    type OrganizationFormBackLink,
} from "@/components/common/OrganizationFormLayout";
import DetailField from "@/components/common/DetailField";
import OrganizationDetailCard, {
    OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTable, {
    type DashboardColumn,
} from "@/components/dashboard/DashboardTable";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { FLEET_SUPPORT_REPLACEMENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { ApiClientError } from "@/lib/api/client";
import {
    fetchFleetClients,
    type FleetClientListItem,
} from "@/lib/api/lease-contracts";
import {
    executeVehicleReplacements,
    fetchSupportActiveContractsForClient,
    fetchSupportAllocatedVehicles,
    lookupOnLeaseVehicle,
    type OnLeaseVehicleLookupResult,
    type SupportAllocatedVehicle,
} from "@/lib/api/fleet-leasing/support-replacement";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useAuth } from "@/providers/auth-provider";
import {
    showErrorToast,
    showVehicleReplacementCompletedToast,
} from "@/lib/toast/show-toast";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";

import ReplacementVehiclePicker from "./ReplacementVehiclePicker";
import VehicleReplacementStepper from "./VehicleReplacementStepper";

/** Primary: registration/VIN lookup. Alternate: client → contract → allocated units. */
type FindMode = "registration" | "contract";

type SelectedUnit = OnLeaseVehicleLookupResult;

type ReplacementRow = SelectedUnit & {
    toVehicleId: string;
};

const SELECT_FIELD_CLASS =
    "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function unitKey(unit: SelectedUnit): string {
    return `${unit.contract.id}:${unit.vehicle.id}`;
}

export default function VehicleReplacementFlow() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { token, organizationId, permissions, isLoading: authLoading } =
        useAuth();

    const [step, setStep] = useState<1 | 2>(1);
    const [findMode, setFindMode] = useState<FindMode>("registration");
    const [searchQuery, setSearchQuery] = useState("");
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookupPending, setLookupPending] = useState(false);
    const [previewResult, setPreviewResult] =
        useState<OnLeaseVehicleLookupResult | null>(null);
    const [selectedUnits, setSelectedUnits] = useState<SelectedUnit[]>([]);
    const [replacementByFromId, setReplacementByFromId] = useState<
        Record<string, string>
    >({});
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [selectedClient, setSelectedClient] =
        useState<FleetClientListItem | null>(null);
    const [contractId, setContractId] = useState("");
    const [clientSearch, setClientSearch] = useState("");

    const debouncedClientSearch = useDebouncedValue(clientSearch.trim(), 300);

    const selectedVehicleIds = useMemo(
        () => new Set(selectedUnits.map((u) => u.vehicle.id)),
        [selectedUnits],
    );

    const canReplace =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const orgReady = Boolean(token && organizationId && !authLoading);

    const clientsQuery = useQuery({
        queryKey: [
            "fleet-support-clients",
            organizationId,
            debouncedClientSearch,
        ],
        queryFn: () =>
            fetchFleetClients(token!, organizationId!, {
                pageSize: 50,
                search: debouncedClientSearch || undefined,
            }),
        enabled: orgReady && findMode === "contract" && !selectedClient,
        staleTime: 60_000,
    });

    const contractsQuery = useQuery({
        queryKey: [
            "fleet-support-contracts",
            organizationId,
            selectedClient?.id,
        ],
        queryFn: () =>
            fetchSupportActiveContractsForClient(
                token!,
                organizationId!,
                selectedClient!.id,
            ),
        enabled:
            orgReady &&
            findMode === "contract" &&
            Boolean(selectedClient?.id),
    });

    const allocatedQuery = useQuery({
        queryKey: ["fleet-support-allocated", organizationId, contractId],
        queryFn: () =>
            fetchSupportAllocatedVehicles(token!, organizationId!, contractId),
        enabled:
            orgReady && findMode === "contract" && Boolean(contractId),
    });

    const addUnit = useCallback((unit: SelectedUnit) => {
        setSelectedUnits((prev) => {
            const key = unitKey(unit);
            if (prev.some((u) => unitKey(u) === key)) {
                return prev;
            }
            return [...prev, unit];
        });
    }, []);

    const runLookupPreview = useCallback(
        async (q: string) => {
            if (!token || !organizationId || !q.trim()) return;
            setLookupError(null);
            setPreviewResult(null);
            setLookupPending(true);
            try {
                const result = await lookupOnLeaseVehicle(
                    token,
                    organizationId,
                    q,
                );
                setPreviewResult(result);
            } catch (err) {
                const message =
                    err instanceof ApiClientError
                        ? err.message
                        : "Could not find an on-lease vehicle for that identifier.";
                setLookupError(message);
            } finally {
                setLookupPending(false);
            }
        },
        [organizationId, token],
    );

    const addFromPreview = useCallback(() => {
        if (!previewResult) return;
        addUnit(previewResult);
        setPreviewResult(null);
        setSearchQuery("");
        setLookupError(null);
    }, [addUnit, previewResult]);

    const addFromAllocated = useCallback(
        (vehicle: SupportAllocatedVehicle) => {
            if (!selectedClient || !contractId) return;
            if (selectedVehicleIds.has(vehicle.id)) return;

            const contract = contractsQuery.data?.items.find(
                (c) => c.id === contractId,
            );
            if (!contract) {
                setLookupError(
                    "Contract details are still loading. Try again in a moment.",
                );
                return;
            }

            addUnit({
                vehicle: {
                    id: vehicle.id,
                    registrationNo: vehicle.registrationNo,
                    vin: vehicle.vin,
                    assetClass: vehicle.assetClass,
                    status: vehicle.status,
                    vehicleStore: vehicle.vehicleStore,
                },
                contract: {
                    id: contract.id,
                    contractNumber: contract.contractNumber,
                    status: contract.status,
                    startDate: contract.startDate,
                    endDate: contract.endDate,
                    termMonths: null,
                },
                clientName: selectedClient.companyName,
            });
            setLookupError(null);
        },
        [
            addUnit,
            contractId,
            contractsQuery.data?.items,
            selectedClient,
            selectedVehicleIds,
        ],
    );

    useEffect(() => {
        setPreviewResult(null);
        setLookupError(null);
        setLookupPending(false);
        if (findMode === "contract") {
            setSearchQuery("");
        }
    }, [findMode]);

    useEffect(() => {
        if (step === 1) {
            setConfirmOpen(false);
        }
    }, [step]);

    const invalidateSupportReplacementCaches = useCallback(() => {
        if (!organizationId) return;
        void queryClient.invalidateQueries({
            queryKey: ["fleet-support-allocated", organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["replacement-candidates", organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["fleet-support-contracts", organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["lease-contracts-list", organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["lease-contract-detail", organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["asset-register", "vehicles"],
        });
    }, [organizationId, queryClient]);

    const clearContractPath = () => {
        setSelectedClient(null);
        setContractId("");
        setClientSearch("");
        setLookupError(null);
    };

    const removeUnit = (key: string) => {
        setSelectedUnits((prev) => {
            const removed = prev.find((u) => unitKey(u) === key);
            if (removed) {
                setReplacementByFromId((map) => {
                    if (!(removed.vehicle.id in map)) return map;
                    const next = { ...map };
                    delete next[removed.vehicle.id];
                    return next;
                });
            }
            return prev.filter((u) => unitKey(u) !== key);
        });
    };

    const replacementRows: ReplacementRow[] = useMemo(
        () =>
            selectedUnits.map((unit) => ({
                ...unit,
                toVehicleId: replacementByFromId[unit.vehicle.id] ?? "",
            })),
        [replacementByFromId, selectedUnits],
    );

    const allReplacementsChosen =
        replacementRows.length > 0 &&
        replacementRows.every((row) => row.toVehicleId.trim().length > 0);

    const canContinueStep1 = selectedUnits.length > 0;
    const canConfirm = canReplace && allReplacementsChosen;

    const canSubmitRegistrationLookup =
        Boolean(searchQuery.trim()) && orgReady && !lookupPending;
    const registrationLookupHasError = Boolean(lookupError);



    const replaceMutation = useMutation({
        mutationFn: () =>
            executeVehicleReplacements(
                token!,
                organizationId!,
                replacementRows.map((row) => ({
                    contractId: row.contract.id,
                    fromVehicleId: row.vehicle.id,
                    toVehicleId: row.toVehicleId,
                })),
            ),
        onSuccess: (data) => {
            setConfirmOpen(false);
            invalidateSupportReplacementCaches();
            showVehicleReplacementCompletedToast(data.replacedCount);
            router.replace("/fleet-leasing/support/");
        },
        onError: (err) => {
            showErrorToast(
                err instanceof ApiClientError
                    ? err.message
                    : "Vehicle replacement failed. Try again.",
            );
        },
    });

    const step1Columns: DashboardColumn<SelectedUnit>[] = [
        {
            key: "registration",
            label: "Registration",
            render: (row) => row.vehicle.registrationNo,
        },
        {
            key: "client",
            label: "Client",
            render: (row) => row.clientName,
        },
        {
            key: "contract",
            label: "Contract",
            render: (row) => row.contract.contractNumber,
        },
        {
            key: "leaseStart",
            label: "Lease start",
            render: (row) =>
                row.contract.startDate
                    ? formatCalendarDateEnIn(row.contract.startDate)
                    : "—",
        },
        {
            key: "actions",
            label: "",
            render: (row) => (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeUnit(unitKey(row))}
                >
                    Remove
                </Button>
            ),
        },
    ];

    const allocatedColumns: DashboardColumn<SupportAllocatedVehicle>[] =
        useMemo(
            () => [
                {
                    key: "registration",
                    label: "Registration",
                    render: (row) => row.registrationNo,
                },
                {
                    key: "class",
                    label: "Asset class",
                    render: (row) => row.assetClass,
                },
                {
                    key: "status",
                    label: "Status",
                    render: (row) => row.status,
                },
                {
                    key: "add",
                    label: "",
                    render: (row) =>
                        selectedVehicleIds.has(row.id) ? (
                            <span className="text-xs font-medium text-slate-500">
                                Added
                            </span>
                        ) : (
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!orgReady}
                                onClick={() => addFromAllocated(row)}
                            >
                                Add
                            </Button>
                        ),
                },
            ],
            [addFromAllocated, orgReady, selectedVehicleIds],
        );

    const onLeaseVehicleIds = useMemo(
        () => selectedUnits.map((u) => u.vehicle.id),
        [selectedUnits],
    );

    const buildExcludeIdsForRow = useCallback(
        (fromVehicleId: string) => {
            const otherChosenReplacements = Object.entries(replacementByFromId)
                .filter(
                    ([fromId, toId]) =>
                        fromId !== fromVehicleId && toId.trim().length > 0,
                )
                .map(([, toId]) => toId);
            return [...onLeaseVehicleIds, ...otherChosenReplacements];
        },
        [onLeaseVehicleIds, replacementByFromId],
    );

    const previewVehicleInList =
        previewResult != null &&
        selectedVehicleIds.has(previewResult.vehicle.id);

    const canSubmitAddFromPreview =
        Boolean(previewResult) && !previewVehicleInList;

    const lookupPreviewCard = previewResult ? (
        <OrganizationDetailCard className="w-full">
            <p className="mb-4 text-sm font-medium text-slate-800">
                On-lease vehicle found
            </p>
            <OrganizationDetailFieldGrid>
                <DetailField label="Client" value={previewResult.clientName} />
                <DetailField
                    label="Contract no."
                    value={previewResult.contract.contractNumber}
                />
                <DetailField
                    label="Lease start"
                    value={
                        previewResult.contract.startDate
                            ? formatCalendarDateEnIn(
                                previewResult.contract.startDate,
                            )
                            : "—"
                    }
                />
                <DetailField
                    label="Registration"
                    value={previewResult.vehicle.registrationNo}
                />
                <DetailField
                    label="Asset class"
                    value={previewResult.vehicle.assetClass}
                />
            </OrganizationDetailFieldGrid>
            <div className="mt-4 flex flex-wrap gap-2">
                {previewVehicleInList ? (
                    <span className="inline-flex h-10 items-center text-sm font-medium text-slate-500">
                        Already selected
                    </span>
                ) : (
                    <Button
                        type="button"
                        variant="primary"
                        disabled={!canSubmitAddFromPreview}
                        onClick={addFromPreview}
                    >
                        Add vehicle
                    </Button>
                )}
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPreviewResult(null)}
                >
                    Dismiss
                </Button>
            </div>
        </OrganizationDetailCard>
    ) : null;

    const registrationLookupBlock = (
        <div className="w-full space-y-3">
            <label className="block text-sm font-medium text-slate-700">
                Registration or VIN
            </label>
            <div className="flex w-full flex-wrap gap-2">
                <RestrictedInput
                    restrictedKind="text"
                    maxLength={
                        FLEET_SUPPORT_REPLACEMENT_INPUT_LIMITS.vehicleIdentifier
                    }
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(value)}
                    placeholder="Enter registration or VIN"
                    className={mergeFormControlBorderClass(
                        registrationLookupHasError,
                        "min-w-0 flex-1",
                    )}
                    aria-invalid={registrationLookupHasError || undefined}
                />
                <Button
                    type="button"
                    variant="secondary"
                    disabled={!canSubmitRegistrationLookup}
                    onClick={() => void runLookupPreview(searchQuery)}
                >
                    {lookupPending ? "Searching…" : "Search"}
                </Button>
            </div>
            <FormFieldInlineError message={lookupError ?? undefined} />
            {lookupPreviewCard}
        </div>
    );

    const clients = clientsQuery.data?.items ?? [];

    const contractPathBlock = (
        <div className="w-full space-y-4">
            {!selectedClient ? (
                <>
                    <p className="text-sm text-slate-600">
                        Choose a client and an active contract to add allocated
                        vehicles to your selection.
                    </p>
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden
                        />
                        <RestrictedInput
                            restrictedKind="text"
                            maxLength={
                                FLEET_SUPPORT_REPLACEMENT_INPUT_LIMITS.clientSearch
                            }
                            value={clientSearch}
                            onChange={setClientSearch}
                            placeholder="Search clients by name..."
                            className="pl-10"
                        />
                    </div>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        {clientsQuery.isLoading ? (
                            <div
                                className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500"
                                aria-busy="true"
                            >
                                <Loader2 className="h-4 w-4 animate-spin text-[#FE5720]" />
                                Loading clients…
                            </div>
                        ) : clients.length === 0 ? (
                            <DashboardEmptyState
                                title="No clients found"
                                description={
                                    clientSearch.trim()
                                        ? "Try a different search term."
                                        : "No fleet clients are available yet."
                                }
                            />
                        ) : (
                            <ul>
                                {clients.map((client) => (
                                    <li
                                        key={client.id}
                                        className="border-b border-slate-100 last:border-b-0"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedClient(client);
                                                setContractId("");
                                                setLookupError(null);
                                            }}
                                            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-orange-50/40 focus:bg-orange-50/40 focus:outline-none sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <span className="text-sm font-semibold text-slate-800">
                                                {client.companyName}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {client.contractCount ?? 0}{" "}
                                                active contract
                                                {(client.contractCount ?? 0) ===
                                                    1
                                                    ? ""
                                                    : "s"}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-800">
                            <span className="font-medium">Client:</span>{" "}
                            {selectedClient.companyName}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={clearContractPath}
                        >
                            Change client
                        </Button>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Contract
                        </label>
                        <select
                            className={SELECT_FIELD_CLASS}
                            value={contractId}
                            disabled={contractsQuery.isLoading}
                            onChange={(e) => {
                                setContractId(e.target.value);
                                setLookupError(null);
                            }}
                        >
                            <option value="">Select contract</option>
                            {(contractsQuery.data?.items ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.contractNumber} ({c.status})
                                </option>
                            ))}
                        </select>
                    </div>
                    {contractId ? (
                        <div>
                            {allocatedQuery.isLoading ? (
                                <div
                                    className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500"
                                    aria-busy="true"
                                >
                                    <Loader2 className="h-4 w-4 animate-spin text-[#FE5720]" />
                                    Loading allocated vehicles…
                                </div>
                            ) : (allocatedQuery.data?.items ?? []).length ===
                                0 ? (
                                <DashboardEmptyState
                                    title="No allocated vehicles"
                                    description="This contract has no vehicles allocated yet."
                                />
                            ) : (
                                <DashboardTable
                                    columns={allocatedColumns}
                                    data={allocatedQuery.data?.items ?? []}
                                    getRowKey={(row) => row.id}
                                />
                            )}
                            <FormFieldInlineError
                                message={lookupError ?? undefined}
                            />
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );

    return (
        <>
            <OrganizationFormLayout

                beforeHeader={
                    <VehicleReplacementStepper currentStep={step} />
                }
                title={
                    step === 1
                        ? "Select vehicles to replace"
                        : "Choose replacement vehicles"
                }
                description={
                    step === 1
                        ? "Search by registration or VIN, or pick vehicles from a client’s active contract."
                        : "For each vehicle, filter by wheeler, brand, and model, or search by registration / VIN / fleet code, then confirm."
                }
                contentVariant="plain"
            >
                {step === 1 ? (
                    <div className="space-y-6">
                        <div
                            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
                            role="tablist"
                            aria-label="How to find vehicles"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={findMode === "registration"}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition ${findMode === "registration"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                onClick={() => setFindMode("registration")}
                            >
                                Registration or VIN
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={findMode === "contract"}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition ${findMode === "contract"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                onClick={() => setFindMode("contract")}
                            >
                                From client contract
                            </button>
                        </div>

                        {findMode === "registration"
                            ? registrationLookupBlock
                            : contractPathBlock}

                        <div className="border-t border-slate-200 pt-6">
                            <h3 className="mb-1 text-sm font-semibold text-slate-800">
                                Vehicles to replace
                            </h3>
                            <p className="mb-3 text-sm text-slate-600">
                                Vehicles you add above are listed here. Continue
                                when you are ready to assign replacements.
                            </p>
                            {selectedUnits.length > 0 ? (
                                <DashboardTable
                                    columns={step1Columns}
                                    data={selectedUnits}
                                    getRowKey={(row) => unitKey(row)}
                                />
                            ) : (
                                <DashboardEmptyState
                                    title="No vehicles selected yet"
                                    description="Search by registration, VIN, or fleet code, or pick a client contract and add allocated vehicles."
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                            <Button
                                type="button"
                                variant="primary"
                                disabled={!canContinueStep1}
                                onClick={() => setStep(2)}
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-sm text-slate-600">
                            Assign one available replacement for each on-lease
                            vehicle below. Use filter or search, then confirm
                            when every row has a replacement.
                        </p>
                        <div className="flex w-full flex-col gap-6">
                            {replacementRows.map((row) => (
                                <OrganizationDetailCard
                                    key={row.vehicle.id}
                                    className="w-full"
                                >
                                    <h3 className="mb-4 text-sm font-semibold text-slate-800">
                                        Vehicle to replace
                                    </h3>
                                    <OrganizationDetailFieldGrid>
                                        <DetailField
                                            label="Registration"
                                            value={row.vehicle.registrationNo}
                                        />
                                        <DetailField
                                            label="Asset class"
                                            value={row.vehicle.assetClass}
                                        />
                                        <DetailField
                                            label="Contract"
                                            value={row.contract.contractNumber}
                                        />
                                        <DetailField
                                            label="Client"
                                            value={row.clientName}
                                        />
                                    </OrganizationDetailFieldGrid>
                                    <div className="mt-6 border-t border-slate-200 pt-6">
                                        <h4 className="mb-4 text-sm font-semibold text-slate-800">
                                            Replacement vehicle
                                        </h4>
                                        {token && organizationId ? (
                                            <ReplacementVehiclePicker
                                                organizationId={organizationId}
                                                token={token}
                                                replacementSourceKind={
                                                    row.vehicle.vehicleStore
                                                }
                                                excludeVehicleIds={buildExcludeIdsForRow(
                                                    row.vehicle.id,
                                                )}
                                                value={row.toVehicleId}
                                                onChange={(id) =>
                                                    setReplacementByFromId(
                                                        (prev) => ({
                                                            ...prev,
                                                            [row.vehicle.id]:
                                                                id,
                                                        }),
                                                    )
                                                }
                                            />
                                        ) : null}
                                    </div>
                                </OrganizationDetailCard>
                            ))}
                        </div>
                        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setStep(1)}
                            >
                                Back to select vehicles
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                disabled={!canConfirm || replaceMutation.isPending}
                                onClick={() => setConfirmOpen(true)}
                            >
                                Confirm replacement
                            </Button>
                        </div>
                        {!canReplace ? (
                            <p className="text-sm text-slate-600">
                                You need fleet leasing update permission to
                                execute replacements.
                            </p>
                        ) : null}
                    </div>
                )}
            </OrganizationFormLayout>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title="Confirm vehicle replacement?"
                message={`Replace ${replacementRows.length} on-lease vehicle(s) with the vehicles you selected. Contract allocations will update immediately.`}
                confirmLabel="Confirm replacement"
                onConfirm={() => replaceMutation.mutate()}
                isConfirmPending={replaceMutation.isPending}
                confirmDisabled={!canConfirm}
            />
        </>
    );
}
