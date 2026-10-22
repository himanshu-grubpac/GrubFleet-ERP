"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { assetAssignmentQueryOptions } from "@/lib/query/asset-assignment-query-options";
import { invalidateAssetAssignmentCaches } from "@/lib/query/invalidate-asset-assignment-caches";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api/client";
import {
    BULK_ASSIGN_DONE_STORAGE_KEY,
    bulkAssignAssetRegisterVehiclesApi,
    fetchBulkAssignCatalogApi,
    parseBulkAssignConflictDetails,
    validateBulkAssignAssetRegisterVehiclesApi,
    type BulkAssignCatalogLine,
    type BulkAssignVehicleValidationRow,
} from "@/lib/api/asset-register/assignments";
import {
    fetchAllAssetRegisterVehiclesForClassApi,
    fetchAssetRegisterVehiclesApi,
} from "@/lib/api/asset-register/vehicles";
import { showErrorToast, VEHICLE_ASSIGN_ERROR } from "@/lib/toast/show-toast";
import BulkAssignStepper from "./BulkAssignStepper";
import ContractStep from "./ContractStep";
import VehiclesStep from "./VehiclesStep";
import ReviewStep from "./ReviewStep";
import {
    bulkAssignSelectionCap,
    toggleBulkAssignVehicleSelection,
} from "./bulk-assign-vehicle-selection.util";
import { todayIsoDate } from "./bulk-assign-wizard.util";

const ASSET_ASSIGN_LIST_HREF = "/asset-register/asset-assign/";
const BULK_ASSIGN_DONE_HREF = "/asset-register/asset-assign/bulk/done/";
const FLEET_REGISTER_CREATE_HREF = "/asset-register/fleetregister/create/";
const VEHICLE_PAGE_SIZE = 10;

type WizardStep = 1 | 2 | 3;

export default function BulkAssignWizardPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { token, organizationId, isLoading: isAuthLoading, permissions } =
        useAuth();

    const canAssign =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");
    const canCreateFleetVehicle =
        permissions.has("asset_register.create") ||
        permissions.has("asset_register.manage");

    const [step, setStep] = useState<WizardStep>(1);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedContractId, setSelectedContractId] = useState("");
    const [selectedLineId, setSelectedLineId] = useState("");
    const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [vehicleSearch, setVehicleSearch] = useState("");
    const debouncedVehicleSearch = useDebouncedValue(vehicleSearch, 300);
    const [vehiclePage, setVehiclePage] = useState(1);
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);
    const [handoverDate, setHandoverDate] = useState(() => todayIsoDate());
    const [handoverLocation, setHandoverLocation] = useState("");
    const [assignNotes, setAssignNotes] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [autoSelectPending, setAutoSelectPending] = useState(false);
    const [autoReplacePending, setAutoReplacePending] = useState(false);
    const [selectedVehicleSnapshots, setSelectedVehicleSnapshots] = useState<
        Map<
            string,
            {
                fleetCode: string;
                registrationNumber: string;
                odometer: number;
            }
        >
    >(() => new Map());

    const assignSucceededRef = useRef(false);
    const handoverLocationSeededRef = useRef(false);

    const clientsQuery = useQuery({
        queryKey: [
            "asset-register",
            "bulk-assign-catalog",
            "clients",
            organizationId,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchBulkAssignCatalogApi({ token, organizationId });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...assetAssignmentQueryOptions,
    });

    const contractsQuery = useQuery({
        queryKey: [
            "asset-register",
            "bulk-assign-catalog",
            "contracts",
            organizationId,
            selectedClientId,
        ],
        queryFn: () => {
            if (!token || !organizationId || !selectedClientId) {
                throw new Error("Missing auth context");
            }
            return fetchBulkAssignCatalogApi({
                token,
                organizationId,
                organisationClientId: selectedClientId,
            });
        },
        enabled:
            !!token &&
            !!organizationId &&
            !isAuthLoading &&
            !!selectedClientId,
        ...assetAssignmentQueryOptions,
    });

    const clients = clientsQuery.data?.clients ?? [];
    const contracts = contractsQuery.data?.contracts ?? [];

    const selectedContract = useMemo(
        () =>
            contracts.find((c) => c.leaseContractId === selectedContractId),
        [contracts, selectedContractId],
    );

    const selectedLine: BulkAssignCatalogLine | undefined = useMemo(() => {
        if (!selectedContract || !selectedLineId) return undefined;
        return selectedContract.assetLines.find(
            (line) => line.lineId === selectedLineId,
        );
    }, [selectedContract, selectedLineId]);

    const toAssign = selectedLine?.remainingToAssign ?? 0;
    const assetClassId = selectedLine?.assetClassId ?? undefined;
    const availableNow = selectedLine?.availableNow ?? 0;
    const selectionCap = bulkAssignSelectionCap(toAssign, availableNow);
    const isShortage = availableNow < toAssign && toAssign > 0;
    const pendingAfterPartial = Math.max(0, toAssign - selectionCap);

    useEffect(() => {
        setSelectedContractId("");
        setSelectedLineId("");
    }, [selectedClientId]);

    useEffect(() => {
        setSelectedLineId("");
    }, [selectedContractId]);

    useEffect(() => {
        if (!organizationId || !selectedContractId) {
            return;
        }
        void queryClient.invalidateQueries({
            queryKey: ["asset-register", "vehicles", "bulk-assign"],
        });
        void queryClient.invalidateQueries({
            queryKey: ["asset-register", "bulk-assign-validate"],
        });
    }, [organizationId, selectedContractId, selectedLineId, queryClient]);

    useEffect(() => {
        if (!selectedContract) return;
        const firstSelectable = selectedContract.assetLines.find(
            (line) => line.selectable && line.remainingToAssign > 0,
        );
        if (firstSelectable && !selectedLineId) {
            setSelectedLineId(firstSelectable.lineId);
        }
    }, [selectedContract, selectedLineId]);

    useEffect(() => {
        setSelectedVehicleIds(new Set());
        setSelectedVehicleSnapshots(new Map());
        setVehiclePage(1);
        setVehicleSearch("");
        handoverLocationSeededRef.current = false;
    }, [selectedLineId, assetClassId]);

    useEffect(() => {
        setVehiclePage(1);
    }, [debouncedVehicleSearch]);

    useEffect(() => {
        if (step !== 3 || handoverLocationSeededRef.current) return;
        const depot = selectedContract?.location?.trim();
        if (depot) {
            setHandoverLocation(depot);
        }
        handoverLocationSeededRef.current = true;
    }, [step, selectedContract?.location]);

    const vehiclesQuery = useQuery({
        queryKey: [
            "asset-register",
            "vehicles",
            "bulk-assign",
            organizationId,
            assetClassId,
            debouncedVehicleSearch,
            vehiclePage,
        ],
        queryFn: () => {
            if (!token || !organizationId || !assetClassId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterVehiclesApi({
                token,
                organizationId,
                page: vehiclePage,
                pageSize: VEHICLE_PAGE_SIZE,
                search: debouncedVehicleSearch.trim() || undefined,
                assetClassId,
                operationalStatus: "available",
                status: "active",
                sortBy: "createdAt",
                sortOrder: "asc",
            });
        },
        enabled:
            step >= 2 &&
            !!token &&
            !!organizationId &&
            !isAuthLoading &&
            !!assetClassId,
        ...assetAssignmentQueryOptions,
    });

    const vehicleRows = vehiclesQuery.data?.items ?? [];
    const vehicleTotal = vehiclesQuery.data?.total ?? 0;
    const vehicleTotalPages = Math.max(
        1,
        Math.ceil(vehicleTotal / VEHICLE_PAGE_SIZE),
    );

    const selectedVehicleIdsKey = useMemo(
        () => [...selectedVehicleIds].sort().join(","),
        [selectedVehicleIds],
    );

    const validateQuery = useQuery({
        queryKey: [
            "asset-register",
            "bulk-assign-validate",
            organizationId,
            selectedContractId,
            selectedVehicleIdsKey,
        ],
        queryFn: () => {
            if (
                !token ||
                !organizationId ||
                !selectedContract ||
                selectedVehicleIds.size === 0
            ) {
                throw new Error("Missing auth context");
            }
            return validateBulkAssignAssetRegisterVehiclesApi({
                token,
                body: {
                    organizationId,
                    leaseContractId: selectedContract.leaseContractId,
                    vehicleIds: [...selectedVehicleIds],
                    assetClassId,
                },
            });
        },
        enabled:
            step === 3 &&
            !!token &&
            !!organizationId &&
            !isAuthLoading &&
            !!selectedContract &&
            selectedVehicleIds.size > 0,
        ...assetAssignmentQueryOptions,
    });

    const { refetch: refetchBulkCatalogContracts } = contractsQuery;
    const { refetch: refetchBulkAssignVehicles } = vehiclesQuery;
    const { refetch: refetchBulkAssignValidate } = validateQuery;

    const prevStepRef = useRef<WizardStep>(step);
    useEffect(() => {
        const prev = prevStepRef.current;
        prevStepRef.current = step;
        if (step === 2 && prev !== 2) {
            void refetchBulkCatalogContracts();
            if (assetClassId) {
                void refetchBulkAssignVehicles();
            }
        }
        if (step === 3 && prev !== 3) {
            void refetchBulkCatalogContracts();
            if (selectedVehicleIds.size > 0) {
                void refetchBulkAssignValidate();
            }
        }
    }, [
        step,
        assetClassId,
        selectedVehicleIds.size,
        refetchBulkCatalogContracts,
        refetchBulkAssignVehicles,
        refetchBulkAssignValidate,
    ]);

    const validationByVehicleId = useMemo(() => {
        const map = new Map<string, BulkAssignVehicleValidationRow>();
        for (const row of validateQuery.data?.vehicles ?? []) {
            map.set(row.vehicleId, row);
        }
        return map;
    }, [validateQuery.data?.vehicles]);

    const conflictCount = validateQuery.data?.conflictCount ?? 0;
    const replacementAvailableCount =
        validateQuery.data?.replacementAvailableCount ?? 0;

    const toggleVehicle = useCallback(
        (vehicleId: string) => {
            setSelectedVehicleIds((prev) => {
                const next = toggleBulkAssignVehicleSelection(
                    prev,
                    vehicleId,
                    selectionCap,
                );
                if (next === prev) {
                    return prev;
                }
                if (!next.has(vehicleId)) {
                    setSelectedVehicleSnapshots((snap) => {
                        const copy = new Map(snap);
                        copy.delete(vehicleId);
                        return copy;
                    });
                    return next;
                }
                const row = vehicleRows.find((v) => v.id === vehicleId);
                if (row) {
                    setSelectedVehicleSnapshots((snap) => {
                        const copy = new Map(snap);
                        copy.set(vehicleId, {
                            fleetCode: row.fleetCode,
                            registrationNumber: row.registrationNumber,
                            odometer: row.odometer,
                        });
                        return copy;
                    });
                }
                return next;
            });
        },
        [selectionCap, vehicleRows],
    );

    const handleClearSelection = useCallback(() => {
        setSelectedVehicleIds(new Set());
        setSelectedVehicleSnapshots(new Map());
    }, []);

    const handleAutoSelect = useCallback(async () => {
        if (
            !token ||
            !organizationId ||
            !assetClassId ||
            selectionCap <= 0
        ) {
            return;
        }
        setAutoSelectPending(true);
        try {
            const items = await fetchAllAssetRegisterVehiclesForClassApi({
                token,
                organizationId,
                assetClassId,
                operationalStatus: "available",
                status: "active",
                sortBy: "createdAt",
                sortOrder: "asc",
                maxItems: selectionCap,
            });
            const pick = items.slice(0, selectionCap);
            setSelectedVehicleIds(new Set(pick.map((row) => row.id)));
            setSelectedVehicleSnapshots(
                new Map(
                    pick.map((row) => [
                        row.id,
                        {
                            fleetCode: row.fleetCode,
                            registrationNumber: row.registrationNumber,
                            odometer: row.odometer,
                        },
                    ]),
                ),
            );
        } catch {
            showErrorToast(VEHICLE_ASSIGN_ERROR);
        } finally {
            setAutoSelectPending(false);
        }
    }, [token, organizationId, assetClassId, selectionCap]);

    const canContinueStep1 =
        canAssign &&
        !!selectedClientId &&
        !!selectedContractId &&
        !!selectedLineId &&
        !!selectedLine &&
        selectedLine.remainingToAssign > 0;

    const selectedCount = selectedVehicleIds.size;
    const canContinueStep2 =
        canAssign && selectedCount >= 1 && selectedCount <= selectionCap;

    const canSubmitReview =
        canAssign &&
        handoverDate.trim().length > 0 &&
        selectedCount >= 1 &&
        conflictCount === 0 &&
        !validateQuery.isFetching;

    const handleRemoveVehicleFromReview = useCallback((vehicleId: string) => {
        setSelectedVehicleIds((prev) => {
            const next = new Set(prev);
            next.delete(vehicleId);
            return next;
        });
        setSelectedVehicleSnapshots((snap) => {
            const copy = new Map(snap);
            copy.delete(vehicleId);
            return copy;
        });
    }, []);

    const handleRemoveConflicts = useCallback(() => {
        setSelectedVehicleIds((prev) => {
            const next = new Set(prev);
            for (const id of prev) {
                const row = validationByVehicleId.get(id);
                if (row && !row.available) {
                    next.delete(id);
                }
            }
            return next;
        });
        setSelectedVehicleSnapshots((snap) => {
            const copy = new Map(snap);
            for (const id of copy.keys()) {
                const row = validationByVehicleId.get(id);
                if (row && !row.available) {
                    copy.delete(id);
                }
            }
            return copy;
        });
        void invalidateAssetAssignmentCaches(queryClient, organizationId);
    }, [validationByVehicleId, queryClient, organizationId]);

    const handleAutoReplaceConflicts = useCallback(async () => {
        if (
            !token ||
            !organizationId ||
            !assetClassId ||
            conflictCount < 1
        ) {
            return;
        }
        const conflictIds = [...selectedVehicleIds].filter(
            (id) => validationByVehicleId.get(id)?.available === false,
        );
        if (conflictIds.length === 0) {
            return;
        }
        setAutoReplacePending(true);
        try {
            const pool = await fetchAllAssetRegisterVehiclesForClassApi({
                token,
                organizationId,
                assetClassId,
                operationalStatus: "available",
                status: "active",
                sortBy: "createdAt",
                sortOrder: "asc",
                maxItems: Math.max(
                    selectionCap,
                    conflictIds.length + replacementAvailableCount + 10,
                ),
            });
            const selected = new Set(selectedVehicleIds);
            const replacements = pool
                .filter((row) => !selected.has(row.id))
                .slice(0, conflictIds.length);
            if (replacements.length < conflictIds.length) {
                showErrorToast(
                    "Not enough replacement vehicles are available in the pool.",
                );
                return;
            }
            setSelectedVehicleIds((prev) => {
                const next = new Set(prev);
                for (const id of conflictIds) {
                    next.delete(id);
                }
                for (const row of replacements) {
                    next.add(row.id);
                }
                return next;
            });
            setSelectedVehicleSnapshots((snap) => {
                const copy = new Map(snap);
                for (const id of conflictIds) {
                    copy.delete(id);
                }
                for (const row of replacements) {
                    copy.set(row.id, {
                        fleetCode: row.fleetCode,
                        registrationNumber: row.registrationNumber,
                        odometer: row.odometer,
                    });
                }
                return copy;
            });
            await invalidateAssetAssignmentCaches(queryClient, organizationId);
        } catch {
            showErrorToast(VEHICLE_ASSIGN_ERROR);
        } finally {
            setAutoReplacePending(false);
        }
    }, [
        token,
        organizationId,
        assetClassId,
        conflictCount,
        selectedVehicleIds,
        validationByVehicleId,
        selectionCap,
        replacementAvailableCount,
        queryClient,
    ]);

    const assignMutation = useMutation({
        mutationFn: async () => {
            if (
                !token ||
                !organizationId ||
                !selectedContract ||
                !selectedLine
            ) {
                throw new Error("Missing auth context");
            }
            const organisationClientId =
                selectedContract.organisationClientId ??
                selectedContract.fleetClientId ??
                undefined;
            const body: Parameters<
                typeof bulkAssignAssetRegisterVehiclesApi
            >[0]["body"] = {
                organizationId,
                leaseContractId: selectedContract.leaseContractId,
                vehicleIds: [...selectedVehicleIds],
                organisationClientId,
                handoverDate: handoverDate.trim(),
            };
            const locationTrim = handoverLocation.trim();
            if (locationTrim) {
                body.handoverLocation = locationTrim;
            }
            const notesTrim = assignNotes.trim();
            if (notesTrim) {
                body.notes = notesTrim;
            }
            return bulkAssignAssetRegisterVehiclesApi({ token, body });
        },
        onSuccess: async (result) => {
            assignSucceededRef.current = true;
            setConfirmOpen(false);
            const contractId =
                result.contractId ?? result.leaseContractId ?? "";
            await invalidateAssetAssignmentCaches(
                queryClient,
                organizationId,
                contractId,
            );
            try {
                sessionStorage.setItem(
                    BULK_ASSIGN_DONE_STORAGE_KEY,
                    JSON.stringify(result),
                );
            } catch {
                // sessionStorage may be unavailable
            }
            router.replace(BULK_ASSIGN_DONE_HREF);
        },
        onError: async (error: Error) => {
            if (error instanceof ApiClientError && error.status === 409) {
                setConfirmOpen(false);
                await invalidateAssetAssignmentCaches(
                    queryClient,
                    organizationId,
                    selectedContract?.leaseContractId,
                );
                const parsed = parseBulkAssignConflictDetails(error.details);
                if (parsed) {
                    queryClient.setQueryData(
                        [
                            "asset-register",
                            "bulk-assign-validate",
                            organizationId,
                            selectedContractId,
                            selectedVehicleIdsKey,
                        ],
                        {
                            leaseContractId: selectedContract?.leaseContractId,
                            vehicles: parsed.vehicles,
                            conflictCount: parsed.conflictCount,
                            replacementAvailableCount:
                                parsed.replacementAvailableCount,
                            allAvailable: parsed.conflictCount === 0,
                        },
                    );
                }
                await validateQuery.refetch();
                return;
            }
            showErrorToast(error.message || VEHICLE_ASSIGN_ERROR);
        },
    });

    const reviewVehicles = useMemo(() => {
        return [...selectedVehicleIds].map((id) => {
            const snap = selectedVehicleSnapshots.get(id);
            return {
                id,
                fleetCode: snap?.fleetCode ?? id.slice(0, 8),
                registrationNumber: snap?.registrationNumber ?? "—",
                odometer: snap?.odometer ?? 0,
            };
        });
    }, [selectedVehicleIds, selectedVehicleSnapshots]);

    const step2ReviewHelper =
        isShortage &&
        selectedCount >= selectionCap &&
        selectionCap > 0 &&
        pendingAfterPartial > 0
            ? `${pendingAfterPartial} will remain pending on this line`
            : null;

    const footerPrimary = () => {
        if (step === 1) {
            return (
                <Button
                    type="button"
                    disabled={!canContinueStep1}
                    onClick={() => setStep(2)}
                    className="h-9 px-5 text-sm disabled:cursor-not-allowed"
                >
                    Continue →
                </Button>
            );
        }
        if (step === 2) {
            return (
                <div className="flex flex-col items-end gap-0.5">
                    {step2ReviewHelper ? (
                        <span className="text-[11px] text-gray-500">
                            {step2ReviewHelper}
                        </span>
                    ) : null}
                    <Button
                        type="button"
                        disabled={!canContinueStep2}
                        onClick={() => setStep(3)}
                        className="h-9 px-5 text-sm disabled:cursor-not-allowed"
                    >
                        {selectedCount > 0
                            ? `Review ${selectedCount} vehicle${selectedCount === 1 ? "" : "s"}`
                            : "Review vehicles"}
                    </Button>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-end gap-0.5">
                {conflictCount > 0 ? (
                    <span className="text-[11px] font-medium text-red-600">
                        Fix {conflictCount} vehicle
                        {conflictCount === 1 ? "" : "s"} to continue
                    </span>
                ) : null}
                <Button
                    type="button"
                    disabled={!canSubmitReview || assignMutation.isPending}
                    onClick={() => setConfirmOpen(true)}
                    className="h-9 px-5 text-sm disabled:cursor-not-allowed"
                >
                    Assign {selectedCount} vehicle
                    {selectedCount === 1 ? "" : "s"}
                </Button>
            </div>
        );
    };

    if (!canAssign && !isAuthLoading) {
        return (
            <div className="px-6 py-8 text-sm text-gray-600">
                You do not have permission to assign vehicles.
            </div>
        );
    }

    return (
        <>
            <OrganizationFormLayout
                title="Bulk assign vehicles"
                description="Assign many vehicles of one asset class to a contract"
                contentVariant="plain"
                beforeHeader={<BulkAssignStepper currentStep={step} />}
            >
                {step === 1 ? (
                    <ContractStep
                        clients={clients}
                        clientsLoading={clientsQuery.isLoading}
                        selectedClientId={selectedClientId}
                        onClientChange={setSelectedClientId}
                        contracts={contracts}
                        contractsLoading={contractsQuery.isLoading}
                        selectedContractId={selectedContractId}
                        onContractChange={setSelectedContractId}
                        selectedLineId={selectedLineId}
                        onLineChange={setSelectedLineId}
                    />
                ) : null}

                {step === 2 && selectedLine && selectedContract ? (
                    <VehiclesStep
                        summary={{
                            clientName: selectedContract.clientName,
                            contractNumber: selectedContract.contractNumber,
                            assetClassName: selectedLine.assetClassName,
                            toAssign,
                            availableNow: selectedLine.availableNow,
                        }}
                        canCreateFleetVehicle={canCreateFleetVehicle}
                        fleetRegisterCreateHref={FLEET_REGISTER_CREATE_HREF}
                        onChangeContract={() => setStep(1)}
                        search={vehicleSearch}
                        onSearchChange={setVehicleSearch}
                        showSelectedOnly={showSelectedOnly}
                        onShowSelectedOnlyChange={setShowSelectedOnly}
                        vehicles={vehicleRows}
                        vehiclesLoading={vehiclesQuery.isLoading}
                        selectedIds={selectedVehicleIds}
                        onToggleVehicle={toggleVehicle}
                        onAutoSelect={() => void handleAutoSelect()}
                        autoSelectPending={autoSelectPending}
                        onClearSelection={handleClearSelection}
                        page={vehiclePage}
                        pageSize={VEHICLE_PAGE_SIZE}
                        totalItems={vehicleTotal}
                        totalPages={vehicleTotalPages}
                        onPageChange={setVehiclePage}
                    />
                ) : null}

                {step === 3 && selectedLine && selectedContract ? (
                    <ReviewStep
                        summary={{
                            clientName: selectedContract.clientName,
                            contractNumber: selectedContract.contractNumber,
                            assetClassName: selectedLine.assetClassName,
                            committedQuantity: selectedLine.committedQuantity,
                            allocatedCount: selectedLine.allocatedCount,
                            batchCount: selectedCount,
                            lineShortBy: isShortage
                                ? selectedLine.shortBy
                                : undefined,
                        }}
                        vehicles={reviewVehicles}
                        validationByVehicleId={validationByVehicleId}
                        conflictCount={conflictCount}
                        replacementAvailableCount={replacementAvailableCount}
                        validationLoading={validateQuery.isFetching}
                        autoReplacePending={autoReplacePending}
                        onRemoveVehicle={handleRemoveVehicleFromReview}
                        onRemoveConflicts={handleRemoveConflicts}
                        onAutoReplaceConflicts={() =>
                            void handleAutoReplaceConflicts()
                        }
                        handoverDate={handoverDate}
                        onHandoverDateChange={setHandoverDate}
                        handoverLocation={handoverLocation}
                        onHandoverLocationChange={setHandoverLocation}
                        notes={assignNotes}
                        onNotesChange={setAssignNotes}
                        onChangeVehicles={() => setStep(2)}
                        onChangeContract={() => setStep(1)}
                    />
                ) : null}

                <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-gray-200 bg-[#f8f8f8] px-4 py-4 sm:-mx-6 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex shrink-0 items-center gap-2">
                            {step > 1 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setStep((prev) =>
                                            prev === 3 ? 2 : 1,
                                        )
                                    }
                                    className="h-9 px-4 text-sm"
                                >
                                    Back
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        router.push(ASSET_ASSIGN_LIST_HREF)
                                    }
                                    className="h-9 px-4 text-sm"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {step === 3 ? (
                                <span className="hidden text-[11px] text-gray-500 sm:inline">
                                    Vehicles move from Available to Leased
                                </span>
                            ) : null}
                            {footerPrimary()}
                        </div>
                    </div>
                </div>
            </OrganizationFormLayout>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title="Assign vehicles to lease?"
                message={
                    selectedContract && selectedLine
                        ? `Assign ${selectedCount} vehicle${selectedCount === 1 ? "" : "s"} (${selectedLine.assetClassName}) to ${selectedContract.contractNumber} with handover on ${handoverDate || "—"}.`
                        : "Complete the wizard steps first."
                }
                confirmLabel="Assign"
                confirmDisabled={!canSubmitReview}
                isConfirmPending={assignMutation.isPending}
                onConfirm={() => assignMutation.mutate()}
            />
        </>
    );
}
