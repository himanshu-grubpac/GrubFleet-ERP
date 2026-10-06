"use client";

import { useMemo, useState } from "react";

import LeaseContractStepper from "./LeaseContractStepper";
import Button from "@/components/ui/GrubpacButton";
import {
    Plus,
    Trash2,
    AlertCircle,
    Minus,
    Check,
} from "lucide-react";

const ASSET_CLASSES = [
    "Sedan",
    "SUV",
    "Pickup",
    "Van",
    "Electric 2W",
    "Electric 3W",
    "Electric 4W",
    "Hatchback",
    "Commercial Truck",
];

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
    onContinue: (assetLines: AssetLine[]) => void;
}

export default function AssetLinesStep({
    clientId,
    clientName,
    initialAssetLines,
    onBack,
    onContinue,
}: AssetLinesStepProps) {
    const [assetLines, setAssetLines] =
        useState<AssetLine[]>(
            initialAssetLines?.length
                ? initialAssetLines
                : [
                    {
                        id: "line-1",
                        assetClass: "Sedan",
                        committedQuantity: 1,
                        ratePerVehicleMonth: "",
                    },
                ],
        );

    const [formError, setFormError] =
        useState<string | null>(null);

    // ============================================================
    // ADD ASSET LINE
    // ============================================================

    const addAssetLine = () => {
        setFormError(null);

        setAssetLines((previous) => [
            ...previous,
            {
                id: `line-${Date.now()}`,
                assetClass: "SUV",
                committedQuantity: 1,
                ratePerVehicleMonth: "",
            },
        ]);
    };

    // ============================================================
    // REMOVE ASSET LINE
    // ============================================================

    const removeAssetLine = (id: string) => {
        if (assetLines.length === 1) {
            setFormError(
                "At least one asset line is required.",
            );
            return;
        }

        setFormError(null);

        setAssetLines((previous) =>
            previous.filter(
                (line) => line.id !== id,
            ),
        );
    };

    // ============================================================
    // UPDATE ASSET LINE
    // ============================================================

    const updateAssetLine = (
        id: string,
        patch: Partial<Omit<AssetLine, "id">>,
    ) => {
        setFormError(null);

        setAssetLines((previous) =>
            previous.map((line) =>
                line.id === id
                    ? {
                        ...line,
                        ...patch,
                    }
                    : line,
            ),
        );
    };

    // ============================================================
    // QUANTITY
    // ============================================================

    const decreaseQuantity = (line: AssetLine) => {
        updateAssetLine(line.id, {
            committedQuantity: Math.max(
                1,
                line.committedQuantity - 1,
            ),
        });
    };

    const increaseQuantity = (line: AssetLine) => {
        updateAssetLine(line.id, {
            committedQuantity:
                line.committedQuantity + 1,
        });
    };

    const handleQuantityChange = (
        line: AssetLine,
        value: string,
    ) => {
        const numericValue = Number(value);

        updateAssetLine(line.id, {
            committedQuantity:
                Number.isFinite(numericValue) &&
                    numericValue >= 1
                    ? Math.floor(numericValue)
                    : 1,
        });
    };

    // ============================================================
    // TOTAL COMMITTED VEHICLES
    // ============================================================

    const totalCommittedVehicles = useMemo(
        () =>
            assetLines.reduce(
                (sum, line) =>
                    sum +
                    (Number(
                        line.committedQuantity,
                    ) || 0),
                0,
            ),
        [assetLines],
    );

    // ============================================================
    // MONTHLY ESTIMATED REVENUE
    // ============================================================

    const monthlyEstimatedRevenue = useMemo(
        () =>
            assetLines.reduce(
                (sum, line) =>
                    sum +
                    (Number(
                        line.committedQuantity,
                    ) || 0) *
                    (Number(
                        line.ratePerVehicleMonth,
                    ) || 0),
                0,
            ),
        [assetLines],
    );

    // ============================================================
    // CONTINUE
    // ============================================================

    const handleContinue = () => {
        setFormError(null);

        if (!clientId) {
            setFormError(
                "Please select a client first.",
            );
            return;
        }

        for (const line of assetLines) {
            if (!line.assetClass) {
                setFormError(
                    "All asset lines must have an asset class.",
                );
                return;
            }

            if (
                !line.committedQuantity ||
                line.committedQuantity < 1
            ) {
                setFormError(
                    "Committed quantity must be at least 1.",
                );
                return;
            }

            if (
                line.ratePerVehicleMonth === "" ||
                Number.isNaN(
                    Number(
                        line.ratePerVehicleMonth,
                    ),
                ) ||
                Number(
                    line.ratePerVehicleMonth,
                ) < 0
            ) {
                setFormError(
                    "Please enter a valid monthly rate for all asset lines.",
                );
                return;
            }
        }

        onContinue(assetLines);
    };

    return (
        <div className="min-h-full w-full bg-[#f7f7f7]">
            {/* =====================================================
                STEPPER
            ====================================================== */}

            <LeaseContractStepper currentStep={2} />

            {/* =====================================================
                CONTENT
            ====================================================== */}

            <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <div className="w-full max-w-[860px]">
                    {/* =================================================
                        HEADER
                    ================================================== */}

                    <div className="mb-5">
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                            Asset classes & committed counts
                        </h1>

                        <p className="mt-1 max-w-[720px] text-xs leading-5 text-slate-500 sm:text-sm">
                            A contract can cover several
                            asset-class lines, each with its
                            own count and rate. Vehicles
                            resolve automatically per line at
                            confirmation — nothing is
                            hand-picked here.
                        </p>
                    </div>

                    {/* =================================================
                        CLIENT
                    ================================================== */}

                    <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Client
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {clientName ||
                                "Selected client"}
                        </p>
                    </div>

                    {/* =================================================
                        ERROR
                    ================================================== */}

                    {formError && (
                        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                            <span>
                                {formError}
                            </span>
                        </div>
                    )}

                    {/* =================================================
                        ASSET LINES
                    ================================================== */}

                    <div className="space-y-3">
                        {assetLines.map((line) => {
                            const lineTotal =
                                (Number(
                                    line.committedQuantity,
                                ) || 0) *
                                (Number(
                                    line.ratePerVehicleMonth,
                                ) || 0);

                            return (
                                <div
                                    key={line.id}
                                    className="rounded-lg border border-slate-200 bg-white shadow-sm"
                                >
                                    {/* =================================
                                        DESKTOP / TABLE HEADER
                                    ================================== */}

                                    <div className="hidden grid-cols-[1.1fr_1.05fr_1.55fr_40px] items-center gap-4 border-b border-slate-100 px-4 py-2.5 sm:grid sm:px-5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Asset Class
                                        </span>

                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Committed Count
                                        </span>

                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Rate (per vehicle / month)
                                        </span>

                                        <span />
                                    </div>

                                    {/* =================================
                                        DESKTOP ROW
                                    ================================== */}

                                    <div className="hidden grid-cols-[1.1fr_1.05fr_1.55fr_40px] items-center gap-4 px-4 py-3.5 sm:grid sm:px-5">
                                        {/* ASSET CLASS */}

                                        <div>
                                            <select
                                                value={
                                                    line.assetClass
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateAssetLine(
                                                        line.id,
                                                        {
                                                            assetClass:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                            >
                                                {ASSET_CLASSES.map(
                                                    (
                                                        assetClass,
                                                    ) => (
                                                        <option
                                                            key={
                                                                assetClass
                                                            }
                                                            value={
                                                                assetClass
                                                            }
                                                        >
                                                            {
                                                                assetClass
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        {/* COMMITTED COUNT */}

                                        <QuantityControl
                                            value={
                                                line.committedQuantity
                                            }
                                            onDecrease={() =>
                                                decreaseQuantity(
                                                    line,
                                                )
                                            }
                                            onIncrease={() =>
                                                increaseQuantity(
                                                    line,
                                                )
                                            }
                                            onChange={(
                                                value,
                                            ) =>
                                                handleQuantityChange(
                                                    line,
                                                    value,
                                                )
                                            }
                                        />

                                        {/* RATE */}

                                        <div className="relative">
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                                ₹
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="500"
                                                value={
                                                    line.ratePerVehicleMonth
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateAssetLine(
                                                        line.id,
                                                        {
                                                            ratePerVehicleMonth:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                placeholder="e.g. 32,000"
                                                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                            />
                                        </div>

                                        {/* DELETE */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeAssetLine(
                                                    line.id,
                                                )
                                            }
                                            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                            title="Remove asset line"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* =================================
                                        MOBILE ROW
                                    ================================== */}

                                    <div className="space-y-4 p-4 sm:hidden">
                                        {/* Asset class */}

                                        <div>
                                            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                Asset Class
                                            </label>

                                            <select
                                                value={
                                                    line.assetClass
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateAssetLine(
                                                        line.id,
                                                        {
                                                            assetClass:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                            >
                                                {ASSET_CLASSES.map(
                                                    (
                                                        assetClass,
                                                    ) => (
                                                        <option
                                                            key={
                                                                assetClass
                                                            }
                                                            value={
                                                                assetClass
                                                            }
                                                        >
                                                            {
                                                                assetClass
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Quantity */}

                                            <div>
                                                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Committed Count
                                                </label>

                                                <QuantityControl
                                                    value={
                                                        line.committedQuantity
                                                    }
                                                    onDecrease={() =>
                                                        decreaseQuantity(
                                                            line,
                                                        )
                                                    }
                                                    onIncrease={() =>
                                                        increaseQuantity(
                                                            line,
                                                        )
                                                    }
                                                    onChange={(
                                                        value,
                                                    ) =>
                                                        handleQuantityChange(
                                                            line,
                                                            value,
                                                        )
                                                    }
                                                />
                                            </div>

                                            {/* Rate */}

                                            <div>
                                                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Rate / vehicle / month
                                                </label>

                                                <div className="relative">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                                        ₹
                                                    </span>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="500"
                                                        value={
                                                            line.ratePerVehicleMonth
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAssetLine(
                                                                line.id,
                                                                {
                                                                    ratePerVehicleMonth:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="e.g. 32,000"
                                                        className="h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total / Delete */}

                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                    Monthly line total
                                                </p>

                                                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                                    ₹
                                                    {lineTotal.toLocaleString(
                                                        "en-IN",
                                                    )}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeAssetLine(
                                                        line.id,
                                                    )
                                                }
                                                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                title="Remove asset line"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* =================================
                                        LINE TOTAL / STATUS
                                    ================================== */}

                                    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-[#FE5720]">
                                                <Check className="h-3 w-3" />
                                                Committed
                                            </span>

                                            <span className="text-xs text-slate-500">
                                                {
                                                    line.committedQuantity
                                                }{" "}
                                                vehicle
                                                {line.committedQuantity !==
                                                    1
                                                    ? "s"
                                                    : ""}{" "}
                                                committed
                                            </span>
                                        </div>

                                        <div className="hidden text-right sm:block">
                                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                                Monthly line total
                                            </span>

                                            <span className="ml-2 text-sm font-semibold text-slate-800">
                                                ₹
                                                {lineTotal.toLocaleString(
                                                    "en-IN",
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* =================================================
                        ADD ASSET LINE
                    ================================================== */}

                    <button
                        type="button"
                        onClick={addAssetLine}
                        className="mx-auto mt-5 flex items-center gap-1.5 text-sm font-semibold text-[#FE5720] transition hover:text-[#d94412] hover:underline"
                    >
                        <Plus className="h-4 w-4" />
                        Add another asset-class line
                    </button>

                    {/* =================================================
                        SUMMARY
                    ================================================== */}

                    <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Total committed vehicles
                                </p>

                                <p className="mt-1 text-lg font-semibold text-slate-800">
                                    {
                                        totalCommittedVehicles
                                    }{" "}
                                    units
                                </p>
                            </div>

                            <div className="sm:text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Estimated monthly billing
                                </p>

                                <p className="mt-1 text-lg font-bold text-[#FE5720]">
                                    ₹
                                    {monthlyEstimatedRevenue.toLocaleString(
                                        "en-IN",
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        ACTIONS
                    ================================================== */}

                    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                        >

                            Back
                        </button>

                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleContinue}
                        >
                            Next: Terms
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ================================================================
   QUANTITY CONTROL
================================================================ */

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
                aria-label="Decrease committed quantity"
            >
                <Minus className="h-4 w-4" />
            </button>

            <input
                type="number"
                min="1"
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className="h-10 min-w-0 flex-1 border-y border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                aria-label="Committed quantity"
            />


            <button
                type="button"
                onClick={onIncrease}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Increase committed quantity"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}