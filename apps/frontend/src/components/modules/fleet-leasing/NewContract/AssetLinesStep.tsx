import { useMemo, useState } from "react";
import {
    Plus,
    Trash2,
    Car,
    ArrowLeft,
    ArrowRight,
    AlertCircle,
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

    const updateAssetLine = (
        id: string,
        patch: Partial<Omit<AssetLine, "id">>,
    ) => {
        setFormError(null);

        setAssetLines((previous) =>
            previous.map((line) =>
                line.id === id
                    ? { ...line, ...patch }
                    : line,
            ),
        );
    };

    const totalCommittedVehicles =
        useMemo(
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

    const monthlyEstimatedRevenue =
        useMemo(
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
        <div className="min-h-full bg-[#f5f5f5]">
            <Stepper currentStep={2} />

            <main className="mx-auto max-w-7xl px-6 py-3">
                <div className="max-w-[680px]">
                    <div className="mb-5">
                        <h1 className="text-[15px] font-semibold text-slate-900">
                            Asset lines
                        </h1>

                        <p className="mt-1 text-[10px] text-slate-500">
                            Define the vehicle classes,
                            quantities, and monthly rates
                            for this lease.
                        </p>
                    </div>

                    <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                            Client
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-slate-800">
                            {clientName}
                        </p>
                    </div>

                    {formError && (
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-[#FE5720]" />

                                <div>
                                    <h2 className="text-[11px] font-semibold text-slate-800">
                                        Committed asset lines
                                    </h2>

                                    <p className="mt-0.5 text-[9px] text-slate-400">
                                        Add the asset classes required
                                        under this contract.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addAssetLine}
                                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[9px] font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <Plus className="h-3 w-3" />
                                Add asset line
                            </button>
                        </div>

                        <div className="grid grid-cols-[1.5fr_0.7fr_1fr_0.6fr_28px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2">
                            <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                Asset Class
                            </span>
                            <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                Qty
                            </span>
                            <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                Rate / Veh / Mo
                            </span>
                            <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                Total
                            </span>
                            <span />
                        </div>

                        {assetLines.map((line, index) => {
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
                                    className="grid grid-cols-[1.5fr_0.7fr_1fr_0.6fr_28px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                                >
                                    <div>
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[8px] font-semibold text-slate-500">
                                                {index + 1}
                                            </span>
                                            <span className="text-[8px] text-slate-400">
                                                Asset
                                            </span>
                                        </div>

                                        <select
                                            value={
                                                line.assetClass
                                            }
                                            onChange={(event) =>
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
                                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[10px] text-slate-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                        >
                                            {ASSET_CLASSES.map(
                                                (assetClass) => (
                                                    <option
                                                        key={
                                                            assetClass
                                                        }
                                                        value={
                                                            assetClass
                                                        }
                                                    >
                                                        {assetClass}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>

                                    <input
                                        type="number"
                                        min="1"
                                        value={
                                            line.committedQuantity
                                        }
                                        onChange={(event) =>
                                            updateAssetLine(
                                                line.id,
                                                {
                                                    committedQuantity:
                                                        Math.max(
                                                            1,
                                                            Number(
                                                                event
                                                                    .target
                                                                    .value,
                                                            ) || 1,
                                                        ),
                                                },
                                            )
                                        }
                                        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[10px] text-slate-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={
                                            line.ratePerVehicleMonth
                                        }
                                        onChange={(event) =>
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
                                        placeholder="e.g. 25,000"
                                        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                    />

                                    <div className="text-right">
                                        <p className="text-[10px] font-semibold text-slate-700">
                                            ₹
                                            {lineTotal.toLocaleString(
                                                "en-IN",
                                            )}
                                        </p>
                                        <p className="text-[8px] text-slate-400">
                                            / month
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeAssetLine(
                                                line.id,
                                            )
                                        }
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                        title="Remove asset line"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                            <div>
                                <p className="text-[8px] uppercase tracking-wide text-slate-400">
                                    Total committed vehicles
                                </p>
                                <p className="mt-0.5 text-[12px] font-semibold text-slate-800">
                                    {totalCommittedVehicles} units
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-[8px] uppercase tracking-wide text-slate-400">
                                    Estimated monthly billing
                                </p>
                                <p className="mt-0.5 text-[13px] font-bold text-[#FE5720]">
                                    ₹
                                    {monthlyEstimatedRevenue.toLocaleString(
                                        "en-IN",
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={handleContinue}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#FE5720] px-4 text-[10px] font-semibold text-white transition hover:bg-[#e94d1c]"
                        >
                            Continue
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Stepper({
    currentStep,
}: {
    currentStep: number;
}) {
    return (
        <div className="border-b border-slate-200 bg-white px-6 py-3">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto flex max-w-[420px] items-start justify-between">
                    {[1, 2, 3, 4].map((step, index) => (
                        <div
                            key={step}
                            className="contents"
                        >
                            <Step
                                number={step}
                                label={
                                    step === 1
                                        ? "Client"
                                        : step === 2
                                            ? "Asset Lines"
                                            : step === 3
                                                ? "Terms"
                                                : "Review"
                                }
                                active={
                                    step === currentStep
                                }
                                completed={
                                    step < currentStep
                                }
                            />

                            {index < 3 && (
                                <div
                                    className={`mt-[10px] h-px flex-1 ${step < currentStep
                                            ? "bg-[#2f6df6]"
                                            : "bg-slate-200"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Step({
    number,
    label,
    active,
    completed,
}: {
    number: number;
    label: string;
    active?: boolean;
    completed?: boolean;
}) {
    return (
        <div className="flex min-w-[55px] flex-col items-center">
            <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${active || completed
                        ? "bg-[#2f6df6] text-white"
                        : "border border-slate-300 bg-white text-slate-400"
                    }`}
            >
                {number}
            </div>

            <span
                className={`mt-1 text-[8px] ${active || completed
                        ? "font-semibold text-[#2f6df6]"
                        : "text-slate-400"
                    }`}
            >
                {label}
            </span>
        </div>
    );
}