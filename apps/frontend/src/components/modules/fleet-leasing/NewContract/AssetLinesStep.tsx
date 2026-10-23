"use client";

import { useMemo, useState } from "react";
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { invalidateAssetClassCaches } from "@/lib/query/invalidate-domain-caches";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import InlineAddField from "@/components/ui/inline-add-field";
import {
    Plus,
    Trash2,
    AlertCircle,
    Minus,
    Loader2,
} from "lucide-react";

import { useGrubpacAuth } from "@/lib/auth-context";
import { createAssetRegisterAssetClassApi } from "@/lib/api/asset-register/asset-classes";
import {
    fetchFleetAssetClasses,
    previewAssetAvailabilityBatch,
    type AssetClassAvailabilitySnapshot,
} from "@/lib/api/lease-contracts";
import {
    DRIVER_INPUT_LIMITS,
    FLEET_LEASE_ASSET_LINE_INPUT_LIMITS,
} from "@/lib/forms/restricted-input";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
    ASSET_CLASS_SAVE_ERROR,
    showAssetClassCreatedToast,
    showErrorToast,
} from "@/lib/toast/show-toast";

const WIZARD_QUICK_ASSET_CLASS_DEFAULTS: Omit<
    import("@/lib/api/asset-register/asset-classes").CreateAssetRegisterAssetClassPayload,
    "organizationId" | "brand" | "modelName"
> = {
    manufacturingYear: new Date().getFullYear(),
    engineDisplacementCc: 150,
    fuelSystem: "standard",
    color: "Unspecified",
    colorCode: "na",
    vehicleType: "4W",
    fuelType: "Unspecified",
    mileageFrom: 40,
    mileageTo: 50,
    mileageUnit: "km/L",
    fuelTankCapacity: 10,
    ratedLoadFrom: 150,
    ratedLoadTo: 250,
    intakeChecklistItems: ["Registration papers"],
};

export interface AssetLine {
    id: string;
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: string;
}

export type AssetLineEditConstraints = {
    lockAssetClass?: boolean;
    lockRemove?: boolean;
    minCommittedQuantity?: number;
};

export type AssetLinesContinueOptions = {
    confirmShortfall?: boolean;
};

/** New contract wizard blocks shortfall; active contract edit confirms proceed. */
export type AssetLinesShortfallProceedMode = "block" | "confirm";

interface AssetLinesStepProps {
    clientId: string;
    clientName: string;
    initialAssetLines?: AssetLine[];
    availabilityRefreshKey?: number;
    /** When editing an existing contract, exclude its pool from availability. */
    draftContractId?: string | null;
    lineConstraintsById?: Record<string, AssetLineEditConstraints>;
    shortfallProceedMode?: AssetLinesShortfallProceedMode;
    onBack: () => void;
    onContinue: (
        assetLines: AssetLine[],
        options?: AssetLinesContinueOptions,
    ) => void | Promise<void>;
    onSaveDraft?: (assetLines: AssetLine[]) => void;
    isSaveDraftPending?: boolean;
    showSaveDraft?: boolean;
}

const createEmptyAssetLine = (id: string): AssetLine => ({
    id,
    assetClass: "",
    // Start at zero so the user can increase the quantity explicitly.
    committedQuantity: 0,
    ratePerVehicleMonth: "",
});

const DUPLICATE_ASSET_CLASS_MESSAGE =
    "Each asset class may only appear once on the contract. Combine quantities on a single line.";

function normalizeAssetClassSelectionKey(assetClass: string): string {
    return assetClass.trim().toLowerCase();
}

function assetLineAvailabilityInputMatches(
    a: { assetClass: string; committedQuantity: number },
    b: { assetClass: string; committedQuantity: number },
): boolean {
    return (
        normalizeAssetClassSelectionKey(a.assetClass) ===
            normalizeAssetClassSelectionKey(b.assetClass) &&
        a.committedQuantity === b.committedQuantity
    );
}

function resolveMinCommittedQuantity(
    lineId: string,
    lineConstraintsById?: Record<string, AssetLineEditConstraints>,
): number {
    const explicit = lineConstraintsById?.[lineId]?.minCommittedQuantity;
    if (explicit !== undefined) {
        return explicit;
    }
    return lineConstraintsById !== undefined ? 0 : 1;
}

function assetLinesHaveDuplicateClasses(lines: AssetLine[]): boolean {
    const seen = new Set<string>();

    for (const line of lines) {
        const name = line.assetClass.trim();
        if (!name) {
            continue;
        }

        const key = normalizeAssetClassSelectionKey(name);
        if (seen.has(key)) {
            return true;
        }

        seen.add(key);
    }

    return false;
}

export default function AssetLinesStep({
    clientId,
    clientName: _clientName,
    initialAssetLines,
    availabilityRefreshKey = 0,
    draftContractId = null,
    lineConstraintsById,
    shortfallProceedMode = "block",
    onBack,
    onContinue,
    onSaveDraft,
    isSaveDraftPending = false,
    showSaveDraft = false,
}: AssetLinesStepProps) {
    void _clientName;

    const { token, organizationId, permissions } = useGrubpacAuth();
    const queryClient = useQueryClient();

    const canCreateAssetClass =
        permissions.has("asset_register.create") ||
        permissions.has("asset_register.manage");

    const [assetLines, setAssetLines] = useState<AssetLine[]>(
        () =>
            initialAssetLines?.length
                ? initialAssetLines
                : [createEmptyAssetLine("line-1")],
    );

    const [formError, setFormError] = useState<string | null>(null);
    const [isContinuing, setIsContinuing] = useState(false);
    const [shortfallConfirmOpen, setShortfallConfirmOpen] = useState(false);

    const assetClassesQuery = useQuery({
        queryKey: ["fleet-leasing-asset-classes", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }

            return fetchFleetAssetClasses(token, organizationId);
        },
        enabled: Boolean(token && organizationId),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    const assetClassOptions = assetClassesQuery.data?.items ?? [];

    const takenAssetClassKeysByLineId = useMemo(() => {
        const map = new Map<string, Set<string>>();

        for (const line of assetLines) {
            const taken = new Set<string>();

            for (const other of assetLines) {
                if (other.id === line.id) {
                    continue;
                }

                const otherName = other.assetClass.trim();
                if (otherName) {
                    taken.add(normalizeAssetClassSelectionKey(otherName));
                }
            }

            map.set(line.id, taken);
        }

        return map;
    }, [assetLines]);

    const createAssetClassMutation = useMutation({
        mutationFn: async (modelName: string) => {
            if (!token || !organizationId) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }

            return createAssetRegisterAssetClassApi({
                token,
                body: {
                    organizationId,
                    brand: "Wizard",
                    modelName: modelName.trim(),
                    ...WIZARD_QUICK_ASSET_CLASS_DEFAULTS,
                },
            });
        },
        onSuccess: (detail) => {
            showAssetClassCreatedToast(detail.name);

            void invalidateAssetClassCaches(queryClient);

            setFormError(null);

            // Keep the dropdown on its placeholder. The user selects
            // the newly created class explicitly.
        },
        onError: (error) => {
            const message =
                error instanceof Error
                    ? error.message
                    : ASSET_CLASS_SAVE_ERROR;

            showErrorToast(message);
            setFormError(message);
        },
    });

    const handleInlineCreateAssetClass = async (name: string) => {
        await createAssetClassMutation.mutateAsync(name);
    };

    /*
     * Debounce availability requests instead of requesting new availability
     * on every quantity click. The form stays mounted while the request runs.
     */
    const debouncedAvailabilityLines = useDebouncedValue(assetLines, 500);

    const currentLinesKey = useMemo(
        () =>
            JSON.stringify(
                assetLines.map((line) => [
                    line.id,
                    line.assetClass,
                    line.committedQuantity,
                ]),
            ),
        [assetLines],
    );

    const debouncedLinesKey = useMemo(
        () =>
            JSON.stringify(
                debouncedAvailabilityLines.map((line) => [
                    line.id,
                    line.assetClass,
                    line.committedQuantity,
                ]),
            ),
        [debouncedAvailabilityLines],
    );

    const availabilityInputIsCurrent = currentLinesKey === debouncedLinesKey;

    const validAvailabilityLines = debouncedAvailabilityLines.every(
        (line) =>
            line.assetClass.trim().length > 0 &&
            line.committedQuantity >= 1,
    );

    const availabilityPreviewQuery = useQuery({
        queryKey: [
            "fleet-leasing-availability-batch",
            organizationId,
            draftContractId,
            availabilityRefreshKey,
            debouncedAvailabilityLines.map(
                (line) =>
                    `${line.id}:${line.assetClass}:${line.committedQuantity}`,
            ),
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }

            return previewAssetAvailabilityBatch(
                token,
                organizationId,
                debouncedAvailabilityLines.map((line) => ({
                    assetClass: line.assetClass,
                    committedQuantity: line.committedQuantity,
                })),
                draftContractId
                    ? { excludeContractId: draftContractId }
                    : undefined,
            );
        },
        enabled:
            Boolean(token && organizationId) &&
            debouncedAvailabilityLines.length > 0 &&
            validAvailabilityLines,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
    });

    const availabilityByIndex = useMemo(() => {
        const map = new Map<number, AssetClassAvailabilitySnapshot>();

        availabilityPreviewQuery.data?.lines.forEach((snapshot, index) => {
            map.set(index, snapshot);
        });

        return map;
    }, [availabilityPreviewQuery.data?.lines]);

    const mvpAllLinesCovered =
        availabilityPreviewQuery.data?.mvpAllLinesCovered ?? false;

    const currentLinesAreValid =
        assetLines.length > 0 &&
        assetLines.every((line) => {
            if (!line.assetClass.trim()) {
                return false;
            }
            const minQty = resolveMinCommittedQuantity(
                line.id,
                lineConstraintsById,
            );
            return (
                Number.isInteger(line.committedQuantity) &&
                line.committedQuantity >= Math.max(1, minQty)
            );
        });

    const availabilityReady =
        availabilityInputIsCurrent &&
        !availabilityPreviewQuery.isFetching &&
        !availabilityPreviewQuery.isError &&
        currentLinesAreValid &&
        Boolean(availabilityPreviewQuery.data);

    const hasShortfall = availabilityReady && !mvpAllLinesCovered;

    const shortfallSummary = useMemo(() => {
        if (!availabilityPreviewQuery.data?.lines) {
            return "";
        }
        const parts: string[] = [];
        availabilityPreviewQuery.data.lines.forEach((snapshot, index) => {
            if (snapshot.mvpAvailableNowCovers) {
                return;
            }
            const label =
                assetLines[index]?.assetClass.trim() || snapshot.assetClass;
            parts.push(
                `${label}: short by ${snapshot.mvpShortByCount} (only ${snapshot.availableNow} available now)`,
            );
        });
        return parts.join("; ");
    }, [assetLines, availabilityPreviewQuery.data?.lines]);

    const continueBlockedReason = useMemo((): string | null => {
        if (isContinuing || isSaveDraftPending) {
            return null;
        }
        if (assetClassesQuery.isLoading) {
            return "Loading asset classes…";
        }
        if (!assetLines.length) {
            return "Add at least one asset-class line.";
        }
        if (!currentLinesAreValid) {
            return "Select an asset class and quantity of at least 1 on every line.";
        }
        if (
            !availabilityInputIsCurrent ||
            availabilityPreviewQuery.isFetching
        ) {
            return "Checking fleet availability…";
        }
        if (availabilityPreviewQuery.isError) {
            return "Could not verify fleet availability.";
        }
        if (!availabilityPreviewQuery.data) {
            return "Waiting for availability check…";
        }
        if (hasShortfall && shortfallProceedMode === "block") {
            return shortfallSummary
                ? `Reduce quantities or fix availability — ${shortfallSummary}`
                : "Reduce requested quantities so each line is within available fleet.";
        }
        return null;
    }, [
        assetClassesQuery.isLoading,
        assetLines.length,
        availabilityInputIsCurrent,
        availabilityPreviewQuery.data,
        availabilityPreviewQuery.isError,
        availabilityPreviewQuery.isFetching,
        currentLinesAreValid,
        hasShortfall,
        isContinuing,
        isSaveDraftPending,
        shortfallProceedMode,
        shortfallSummary,
    ]);

    const proceedAfterContinueChecks = (confirmShortfall: boolean) => {
        setIsContinuing(true);

        void Promise.resolve(
            onContinue(assetLines, confirmShortfall ? { confirmShortfall } : undefined),
        ).finally(() => {
            setIsContinuing(false);
            setShortfallConfirmOpen(false);
        });
    };

    const addAssetLine = () => {
        setFormError(null);

        if (!assetClassOptions.length) {
            setFormError(
                canCreateAssetClass
                    ? "Add an asset class below before adding lines."
                    : "No asset classes in the register yet. Create one under Asset Register, or ask an administrator.",
            );
            return;
        }

        setAssetLines((previous) => [
            ...previous,
            createEmptyAssetLine(
                `line-${Date.now()}-${previous.length}`,
            ),
        ]);
    };

    const removeAssetLine = (id: string) => {
        if (assetLines.length === 1) {
            setFormError("At least one asset line is required.");
            return;
        }

        setFormError(null);

        setAssetLines((previous) =>
            previous.filter((line) => line.id !== id),
        );
    };

    const updateAssetLine = (
        id: string,
        patch: Partial<Omit<AssetLine, "id">>,
    ) => {
        setFormError(null);

        setAssetLines((previous) =>
            previous.map((line) =>
                line.id === id ? { ...line, ...patch } : line,
            ),
        );
    };

    const handleContinue = () => {
        setFormError(null);

        if (!clientId) {
            setFormError("Please select a client first.");
            return;
        }

        if (!assetLines.length) {
            setFormError("Add at least one asset-class line to continue.");
            return;
        }

        for (const line of assetLines) {
            if (!line.assetClass.trim()) {
                setFormError("Please select an asset class for every line.");
                return;
            }

            const minQty = resolveMinCommittedQuantity(
                line.id,
                lineConstraintsById,
            );
            const requiredQty = Math.max(1, minQty);
            if (
                !Number.isInteger(line.committedQuantity) ||
                line.committedQuantity < requiredQty
            ) {
                setFormError(
                    minQty > 1
                        ? `Requested quantity cannot be below ${minQty} for an existing line.`
                        : "Requested quantity must be at least 1.",
                );
                return;
            }
        }

        if (assetLinesHaveDuplicateClasses(assetLines)) {
            setFormError(DUPLICATE_ASSET_CLASS_MESSAGE);
            return;
        }

        if (
            !availabilityInputIsCurrent ||
            availabilityPreviewQuery.isFetching
        ) {
            setFormError("Still checking fleet availability. Please wait.");
            return;
        }

        if (availabilityPreviewQuery.isError ||
            !availabilityPreviewQuery.data) {
            setFormError(
                "Could not verify fleet availability. Please try again.",
            );
            return;
        }

        if (hasShortfall && shortfallProceedMode === "block") {
            setFormError(
                shortfallSummary ||
                    "Reduce requested quantities so each line is within available fleet.",
            );
            return;
        }

        if (hasShortfall && shortfallProceedMode === "confirm") {
            setShortfallConfirmOpen(true);
            return;
        }

        proceedAfterContinueChecks(false);
    };

    const canContinue =
        !isContinuing &&
        !isSaveDraftPending &&
        !assetClassesQuery.isLoading &&
        currentLinesAreValid &&
        availabilityReady &&
        (!hasShortfall || shortfallProceedMode === "confirm");

    const catalogReady =
        !assetClassesQuery.isLoading && !assetClassesQuery.isError;

    return (
        <>

            {formError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                </div>
            )}

            {assetClassesQuery.isLoading && (
                <div
                    className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"
                    aria-busy="true"
                >
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    Loading asset classes from fleet register…
                </div>
            )}

            {assetClassesQuery.isError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>
                        Could not load asset classes. Please retry or register
                        fleet vehicles first.
                    </span>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                    <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Asset-class lines
                    </h2>
                </div>

                <div className="hidden grid-cols-[1.2fr_0.9fr_1fr_40px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 sm:grid sm:px-5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Asset class
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Qty requested
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Available
                    </span>
                    <span />
                </div>

                {assetLines.map((line, index) => {
                    const snapshot = availabilityByIndex.get(index);
                    const lineConstraints = lineConstraintsById?.[line.id];
                    const minQty = resolveMinCommittedQuantity(
                        line.id,
                        lineConstraintsById,
                    );

                    const lineHasValidAvailabilityInput =
                        line.assetClass.trim().length > 0 &&
                        line.committedQuantity >= 1;

                    const debouncedLineAtIndex =
                        debouncedAvailabilityLines[index];

                    const rowPendingDebounce =
                        lineHasValidAvailabilityInput &&
                        debouncedLineAtIndex !== undefined &&
                        !assetLineAvailabilityInputMatches(
                            line,
                            debouncedLineAtIndex,
                        );

                    const rowSnapshotStaleDuringFetch =
                        lineHasValidAvailabilityInput &&
                        snapshot !== undefined &&
                        debouncedLineAtIndex !== undefined &&
                        availabilityPreviewQuery.isFetching &&
                        !assetLineAvailabilityInputMatches(
                            debouncedLineAtIndex,
                            snapshot,
                        );

                    const availabilityRefreshing =
                        lineHasValidAvailabilityInput &&
                        Boolean(snapshot) &&
                        (rowPendingDebounce || rowSnapshotStaleDuringFetch);

                    const availabilityInitialLoading =
                        lineHasValidAvailabilityInput &&
                        !snapshot &&
                        !availabilityPreviewQuery.data &&
                        availabilityPreviewQuery.isLoading;

                    const takenOnOtherLines =
                        takenAssetClassKeysByLineId.get(line.id) ??
                        new Set<string>();
                    const ownSelectionKey = line.assetClass.trim()
                        ? normalizeAssetClassSelectionKey(line.assetClass)
                        : "";

                    const dropdownAssetClassOptions = assetClassOptions.filter(
                        (assetClass) => {
                            const key =
                                normalizeAssetClassSelectionKey(assetClass);

                            if (ownSelectionKey && key === ownSelectionKey) {
                                return true;
                            }

                            return !takenOnOtherLines.has(key);
                        },
                    );

                    const hasAssetClassSelected =
                        line.assetClass.trim().length > 0;

                    return (
                        <div
                            key={line.id}
                            className="border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-5"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr_0.9fr_1fr_40px] sm:items-center sm:gap-3">
                                <select
                                    value={line.assetClass}
                                    disabled={lineConstraints?.lockAssetClass}
                                    onChange={(event) => {
                                        const assetClass = event.target.value;

                                        updateAssetLine(line.id, {
                                            assetClass,
                                            ...(assetClass
                                                ? {
                                                      committedQuantity:
                                                          Math.max(
                                                              minQty,
                                                              line.committedQuantity,
                                                          ),
                                                  }
                                                : {}),
                                        });
                                    }}
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                    aria-label="Select an asset class"
                                >
                                    <option value="">
                                        Select an asset class
                                    </option>

                                    {dropdownAssetClassOptions.map(
                                        (assetClass) => (
                                            <option
                                                key={assetClass}
                                                value={assetClass}
                                            >
                                                {assetClass}
                                            </option>
                                        ),
                                    )}
                                </select>
                                {hasAssetClassSelected ? (
                                    <QuantityControl
                                        value={line.committedQuantity}
                                        min={minQty}
                                        onDecrease={() =>
                                            updateAssetLine(line.id, {
                                                committedQuantity: Math.max(
                                                    minQty,
                                                    line.committedQuantity - 1,
                                                ),
                                            })
                                        }
                                        onIncrease={() =>
                                            updateAssetLine(line.id, {
                                                committedQuantity:
                                                    line.committedQuantity + 1,
                                            })
                                        }
                                        onChange={(value) => {
                                            const numericValue =
                                                Number(value);
                                            const next =
                                                Number.isFinite(numericValue) &&
                                                numericValue >= 0
                                                    ? Math.floor(numericValue)
                                                    : 0;

                                            updateAssetLine(line.id, {
                                                committedQuantity: Math.max(
                                                    minQty,
                                                    next,
                                                ),
                                            });
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="hidden min-h-10 sm:block"
                                        aria-hidden
                                    />
                                )}

                                {hasAssetClassSelected ? (
                                    <AvailabilityCell
                                        initialLoading={
                                            availabilityInitialLoading
                                        }
                                        refreshing={availabilityRefreshing}
                                        snapshot={snapshot}
                                        error={
                                            availabilityInputIsCurrent &&
                                            availabilityPreviewQuery.isError
                                        }
                                    />
                                ) : (
                                    <div
                                        className="hidden min-h-6 sm:block"
                                        aria-hidden
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => removeAssetLine(line.id)}
                                    disabled={
                                        isContinuing ||
                                        isSaveDraftPending ||
                                        lineConstraints?.lockRemove
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:justify-self-end"
                                    title="Remove asset line"
                                    aria-label="Remove asset line"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {assetLines.length === 0 && catalogReady && (
                    <div className="border-b border-slate-100 px-4 py-8 text-center text-sm text-slate-600 sm:px-5">
                        {assetClassOptions.length === 0
                            ? "No asset classes in the register yet."
                            : "No asset-class lines yet."}
                    </div>
                )}
            </div >


            {catalogReady &&
                assetClassOptions.length === 0 &&
                canCreateAssetClass && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                        <p className="mb-3 text-xs text-slate-600">
                            Add an asset class to the register to start this
                            contract. Defaults can be updated later in Asset
                            Register.
                        </p>

                        <InlineAddField
                            placeholder="Asset class name"
                            maxLength={DRIVER_INPUT_LIMITS.assetClass}
                            buttonLabel="Add class"
                            isPending={createAssetClassMutation.isPending}
                            onAdd={handleInlineCreateAssetClass}
                        />
                    </div>
                )
            }

            {
                catalogReady &&
                assetClassOptions.length === 0 &&
                !canCreateAssetClass && (
                    <p className="mt-4 text-xs text-slate-600">
                        No asset classes are available. Create asset classes
                        under Asset Register, or ask an administrator for
                        access.
                    </p>
                )
            }

            <button
                type="button"
                onClick={addAssetLine}
                disabled={
                    assetClassesQuery.isLoading ||
                    !assetClassOptions.length ||
                    isContinuing ||
                    isSaveDraftPending
                }
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#FE5720] transition hover:text-[#d94412] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Plus className="h-4 w-4" />
                Add another asset-class line
            </button>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isContinuing || isSaveDraftPending}
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    Back
                </button>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    {showSaveDraft && onSaveDraft ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setFormError(null);

                                if (
                                    assetLinesHaveDuplicateClasses(assetLines)
                                ) {
                                    setFormError(DUPLICATE_ASSET_CLASS_MESSAGE);
                                    return;
                                }

                                onSaveDraft(assetLines);
                            }}
                            disabled={isContinuing || isSaveDraftPending}
                            className="w-full sm:w-auto"
                        >
                            {isSaveDraftPending ? "Saving…" : "Save draft"}
                        </Button>
                    ) : null}

                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleContinue}
                        disabled={!canContinue}
                        className="w-full sm:w-auto"
                    >
                        {isContinuing ? "Saving…" : "Continue"}
                    </Button>
                </div>
            </div>

            {continueBlockedReason && !formError ? (
                <p
                    className="mt-3 text-xs text-slate-600"
                    role="status"
                >
                    {continueBlockedReason}
                </p>
            ) : null}

            <ConfirmDialog
                open={shortfallConfirmOpen}
                title="Proceed with fleet shortfall?"
                message={
                    shortfallSummary
                        ? `Some lines exceed available fleet today. Lines not fully covered will be marked awaiting assets: ${shortfallSummary}`
                        : "Some lines exceed available fleet today. Lines not fully covered will be marked awaiting assets."
                }
                confirmLabel="Proceed anyway"
                isConfirmPending={isContinuing}
                onClose={() => {
                    if (!isContinuing) {
                        setShortfallConfirmOpen(false);
                    }
                }}
                onConfirm={() => proceedAfterContinueChecks(true)}
            />
        </>
    );
}

function AvailabilityCell({
    initialLoading,
    refreshing,
    snapshot,
    error,
}: {
    initialLoading: boolean;
    refreshing: boolean;
    snapshot?: AssetClassAvailabilitySnapshot;
    error: boolean;
}) {
    if (initialLoading) {
        return (
            <span className="inline-flex min-h-6 items-center text-xs text-slate-400">
                Checking…
            </span>
        );
    }

    if (error || !snapshot) {
        return (
            <span className="inline-flex min-h-6 items-center text-xs text-slate-400">
                —
            </span>
        );
    }

    const covers = snapshot.mvpAvailableNowCovers;
    const labelClass = covers ? "text-green-700" : "text-red-600";
    const label = covers
        ? `${snapshot.availableNow} available`
        : `${snapshot.availableNow} available — short by ${snapshot.mvpShortByCount}`;

    return (
        <span
            className={`inline-flex min-h-6 items-center gap-1.5 text-sm font-semibold ${labelClass}`}
        >
            {label}
            {refreshing ? (
                <Loader2
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400"
                    aria-hidden
                />
            ) : null}
        </span>
    );
}

function QuantityControl({
    value,
    min = 0,
    disabled = false,
    onDecrease,
    onIncrease,
    onChange,
}: {
    value: number;
    min?: number;
    disabled?: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex h-10 w-full items-center">
            <button
                type="button"
                onClick={onDecrease}
                disabled={disabled || value <= min}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-l-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease requested quantity"
            >
                <Minus className="h-4 w-4" />
            </button>

            <RestrictedInput
                restrictedKind="digits"
                maxLength={
                    FLEET_LEASE_ASSET_LINE_INPUT_LIMITS.committedQuantityMaxDigits
                }
                value={String(value)}
                disabled={disabled}
                onChange={onChange}
                className="h-10 min-w-0 flex-1 border-y border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                aria-label="Requested quantity"
            />

            <button
                type="button"
                onClick={onIncrease}
                disabled={disabled}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase requested quantity"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}
