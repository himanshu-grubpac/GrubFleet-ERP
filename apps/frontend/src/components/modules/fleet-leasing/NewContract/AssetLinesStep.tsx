"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Plus,
    Trash2,
    AlertCircle,
    Minus,
    Loader2,
    Info,
} from "lucide-react";

import { useGrubpacAuth } from "@/lib/auth-context";
import {
    fetchFleetAssetClasses,
    previewAssetAvailabilityBatch,
    type AssetClassAvailabilitySnapshot,
} from "@/lib/api/lease-contracts";

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
    onBack: () => void;
    onContinue: (
        assetLines: AssetLine[],
        options?: { confirmShortfall?: boolean },
    ) => void | Promise<void>;
}

export default function AssetLinesStep({
    clientId,
    clientName,
    initialAssetLines,
    onBack,
    onContinue,
}: AssetLinesStepProps) {
    const { token, organizationId } = useGrubpacAuth();

    const [assetLines, setAssetLines] = useState<AssetLine[]>(
        initialAssetLines?.length ? initialAssetLines : [],
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

    useEffect(() => {
        if (initialAssetLines?.length) {
            return;
        }
        const options = assetClassesQuery.data?.items ?? [];
        if (!options.length) {
            return;
        }
        setAssetLines((previous) => {
            if (previous.length > 0) {
                return previous;
            }
            return [
                {
                    id: "line-1",
                    assetClass: options[0],
                    committedQuantity: 1,
                    ratePerVehicleMonth: "",
                },
            ];
        });
    }, [assetClassesQuery.data, initialAssetLines]);

    const availabilityPreviewQuery = useQuery({
        queryKey: [
            "fleet-leasing-availability-batch",
            organizationId,
            assetLines.map(
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
                assetLines.map((line) => ({
                    assetClass: line.assetClass,
                    committedQuantity: line.committedQuantity,
                })),
            );
        },
        enabled:
            Boolean(token && organizationId) &&
            assetLines.length > 0 &&
            assetLines.every(
                (line) =>
                    line.assetClass.trim().length > 0 &&
                    line.committedQuantity >= 1,
            ),
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

    const firstShortfallLine = useMemo(() => {
        for (let i = 0; i < assetLines.length; i += 1) {
            const snapshot = availabilityByIndex.get(i);
            if (snapshot && !snapshot.mvpAvailableNowCovers) {
                return { line: assetLines[i], snapshot };
            }
        }
        return null;
    }, [assetLines, availabilityByIndex]);

    const addAssetLine = () => {
        setFormError(null);
        if (!assetClassOptions.length) {
            setFormError(
                "No asset classes are available from the fleet register yet.",
            );
            return;
        }
        const nextClass =
            assetClassOptions.find(
                (option) =>
                    !assetLines.some((line) => line.assetClass === option),
            ) ?? assetClassOptions[0];

        setAssetLines((previous) => [
            ...previous,
            {
                id: `line-${Date.now()}`,
                assetClass: nextClass,
                committedQuantity: 1,
                ratePerVehicleMonth: "",
            },
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

    const validateAndContinue = (confirmShortfall: boolean) => {
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
            if (!line.assetClass) {
                setFormError("All asset lines must have an asset class.");
                return;
            }
            if (!line.committedQuantity || line.committedQuantity < 1) {
                setFormError("Requested quantity must be at least 1.");
                return;
            }
        }

        if (availabilityPreviewQuery.isLoading) {
            setFormError("Still checking fleet availability. Please wait.");
            return;
        }

        if (!mvpAllLinesCovered && !confirmShortfall) {
            setShortfallConfirmOpen(true);
            return;
        }

        setIsContinuing(true);
        void Promise.resolve(
            onContinue(assetLines, {
                confirmShortfall: confirmShortfall || !mvpAllLinesCovered,
            }),
        ).finally(() => {
            setIsContinuing(false);
            setShortfallConfirmOpen(false);
        });
    };

    const handleContinue = () => validateAndContinue(false);

    const subtitle = mvpAllLinesCovered
        ? "Every requested line covered by available fleet."
        : firstShortfallLine
          ? "One line requests more than the fleet currently has available."
          : "Set asset-class lines and requested quantities for this contract.";

    return (
        <>
            <p className="mb-4 text-sm text-gray-500">{subtitle}</p>

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
                        availabilityPreviewQuery.isLoading &&
                        !availabilityPreviewQuery.isError;

                    return (
                        <div
                            key={line.id}
                            className="border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-5"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr_0.9fr_1fr_40px] sm:items-center sm:gap-3">
                                <select
                                    value={line.assetClass}
                                    onChange={(event) =>
                                        updateAssetLine(line.id, {
                                            assetClass: event.target.value,
                                        })
                                    }
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                >
                                    {assetClassOptions.map((assetClass) => (
                                        <option key={assetClass} value={assetClass}>
                                            {assetClass}
                                        </option>
                                    ))}
                                </select>

                                <QuantityControl
                                    value={line.committedQuantity}
                                    onDecrease={() =>
                                        updateAssetLine(line.id, {
                                            committedQuantity: Math.max(
                                                1,
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
                                                numericValue >= 1
                                                    ? Math.floor(numericValue)
                                                    : 1,
                                        });
                                    }}
                                />

                                <AvailabilityCell
                                    loading={availabilityLoading}
                                    snapshot={snapshot}
                                    error={availabilityPreviewQuery.isError}
                                />

                                <button
                                    type="button"
                                    onClick={() => removeAssetLine(line.id)}
                                    className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 sm:justify-self-end"
                                    title="Remove asset line"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!mvpAllLinesCovered && firstShortfallLine && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-700">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FE5720]" />
                    <p>
                        <span className="font-semibold">
                            {firstShortfallLine.line.assetClass}
                        </span>{" "}
                        requests more than currently available fleet (
                        {firstShortfallLine.snapshot.availableNow} available).
                        Reduce quantities, or continue to mark lines as awaiting
                        assets after you confirm.
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={addAssetLine}
                disabled={
                    assetClassesQuery.isLoading || !assetClassOptions.length
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
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                    Back
                </button>

                <Button
                    type="button"
                    variant="primary"
                    onClick={handleContinue}
                    disabled={
                        isContinuing ||
                        assetClassesQuery.isLoading ||
                        !assetClassOptions.length ||
                        !assetLines.length ||
                        availabilityPreviewQuery.isLoading
                    }
                >
                    {isContinuing ? "Saving…" : "Continue"}
                </Button>
            </div>

            <ConfirmDialog
                open={shortfallConfirmOpen}
                title="Proceed with asset shortfall?"
                message="One or more lines exceed available fleet. Continuing marks those lines as awaiting assets on this contract."
                confirmLabel="Proceed anyway"
                isConfirmPending={isContinuing}
                onClose={() => {
                    if (!isContinuing) {
                        setShortfallConfirmOpen(false);
                    }
                }}
                onConfirm={() => validateAndContinue(true)}
            />
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
            <span className="text-xs text-slate-400">Checking…</span>
        );
    }

    if (error || !snapshot) {
        return (
            <span className="text-xs text-slate-400">—</span>
        );
    }

    if (snapshot.mvpAvailableNowCovers) {
        return (
            <span className="text-sm font-semibold text-green-700">
                {snapshot.availableNow} available
            </span>
        );
    }

    return (
        <span className="text-sm font-semibold text-red-600">
            {snapshot.availableNow} available — short by{" "}
            {snapshot.mvpShortByCount}
        </span>
    );
}

function QuantityControl({
    value,
    onDecrease,
    onIncrease,
    onChange,
}: {
    value: number;
    onDecrease: () => void;
    onIncrease: () => void;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex h-10 w-full items-center">
            <button
                type="button"
                onClick={onDecrease}
                disabled={value <= 1}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-l-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease requested quantity"
            >
                <Minus className="h-4 w-4" />
            </button>

            <input
                type="number"
                min="1"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 min-w-0 flex-1 border-y border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                aria-label="Requested quantity"
            />

            <button
                type="button"
                onClick={onIncrease}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Increase requested quantity"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}
