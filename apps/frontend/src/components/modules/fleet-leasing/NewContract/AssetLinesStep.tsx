"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/GrubpacButton";
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
import { DRIVER_INPUT_LIMITS } from "@/lib/forms/restricted-input";
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

interface AssetLinesStepProps {
    clientId: string;
    clientName: string;
    initialAssetLines?: AssetLine[];
    availabilityRefreshKey?: number;
    onBack: () => void;
    onContinue: (assetLines: AssetLine[]) => void | Promise<void>;
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


export default function AssetLinesStep({
    clientId,
    clientName: _clientName,
    initialAssetLines,
    availabilityRefreshKey = 0,
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

            void queryClient.invalidateQueries({
                queryKey: ["fleet-leasing-asset-classes", organizationId],
            });

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
    const debouncedAvailabilityLines = useDebouncedValue(assetLines, 300);

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
            );
        },
        enabled:
            Boolean(token && organizationId) &&
            debouncedAvailabilityLines.length > 0 &&
            validAvailabilityLines,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
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
        assetLines.every(
            (line) =>
                line.assetClass.trim().length > 0 &&
                line.committedQuantity >= 1,
        );

    const availabilityReady =
        availabilityInputIsCurrent &&
        !availabilityPreviewQuery.isLoading &&
        !availabilityPreviewQuery.isError &&
        currentLinesAreValid &&
        Boolean(availabilityPreviewQuery.data);

    const hasShortfall = availabilityReady && !mvpAllLinesCovered;

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

            if (!Number.isInteger(line.committedQuantity) ||
                line.committedQuantity < 1) {
                setFormError("Requested quantity must be at least 1.");
                return;
            }
        }

        if (!availabilityInputIsCurrent ||
            availabilityPreviewQuery.isLoading) {
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

        if (hasShortfall) {
            setFormError(
                "Reduce requested quantities so each line is within available fleet.",
            );
            return;
        }

        setIsContinuing(true);

        void Promise.resolve(onContinue(assetLines)).finally(() => {
            setIsContinuing(false);
        });
    };

    const canContinue =
        !isContinuing &&
        !isSaveDraftPending &&
        !assetClassesQuery.isLoading &&
        currentLinesAreValid &&
        availabilityReady &&
        !hasShortfall;

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

                    const availabilityLoading =
                        !availabilityInputIsCurrent ||
                        availabilityPreviewQuery.isLoading;

                    return (
                        <div
                            key={line.id}
                            className="border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-5"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr_0.9fr_1fr_40px] sm:items-center sm:gap-3">
                                <select
                                    value={line.assetClass}
                                    onChange={(event) => {
                                        const assetClass = event.target.value;

                                        updateAssetLine(line.id, {
                                            assetClass,
                                            committedQuantity: assetClass
                                                ? Math.max(1, line.committedQuantity)
                                                : 0,
                                        });
                                    }}



                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                    aria-label="Select an asset class"
                                >
                                    <option value="">
                                        Select an asset class
                                    </option>

                                    {assetClassOptions.map((assetClass) => (
                                        <option
                                            key={assetClass}
                                            value={assetClass}
                                        >
                                            {assetClass}
                                        </option>
                                    ))}
                                </select>
                                <QuantityControl
                                    value={line.committedQuantity}
                                    disabled={!line.assetClass}
                                    onDecrease={() =>
                                        updateAssetLine(line.id, {
                                            committedQuantity: Math.max(
                                                0,
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
                                        const numericValue = Number(value);

                                        updateAssetLine(line.id, {
                                            committedQuantity:
                                                Number.isFinite(numericValue) &&
                                                    numericValue >= 0
                                                    ? Math.floor(numericValue)
                                                    : 0,
                                        });
                                    }}
                                />

                                <AvailabilityCell
                                    loading={availabilityLoading}
                                    snapshot={
                                        availabilityInputIsCurrent
                                            ? snapshot
                                            : undefined
                                    }
                                    error={
                                        availabilityInputIsCurrent &&
                                        availabilityPreviewQuery.isError
                                    }
                                />

                                <button
                                    type="button"
                                    onClick={() => removeAssetLine(line.id)}
                                    disabled={isContinuing || isSaveDraftPending}
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
                            onClick={() => onSaveDraft(assetLines)}
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
        </>
    );
}

function AvailabilityCell({
    loading,
    snapshot,
    error,
}: {
    loading: boolean;
    snapshot?: AssetClassAvailabilitySnapshot;
    error: boolean;
}) {
    if (loading) {
        return (
            <span className="inline-flex h-6 items-center text-xs text-slate-400">
                Checking…
            </span>
        );
    }

    if (error || !snapshot) {
        return <span className="inline-flex h-6 items-center text-xs text-slate-400">—</span>;
    }

    if (snapshot.mvpAvailableNowCovers) {
        return (
            <span className="inline-flex h-6 items-center text-sm font-semibold text-green-700">
                {snapshot.availableNow} available
            </span>
        );
    }

    return (
        <span className="inline-flex h-6 items-center text-sm font-semibold text-red-600">
            {snapshot.availableNow} available — short by {snapshot.mvpShortByCount}
        </span>
    );
}

function QuantityControl({
    value,
    disabled = false,
    onDecrease,
    onIncrease,
    onChange,
}: {
    value: number;
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
                disabled={value <= 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-l-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease requested quantity"
            >
                <Minus className="h-4 w-4" />
            </button>

            <input
                type="number"
                min="0"
                step="1"
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
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
