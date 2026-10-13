"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MockPart = {
    id: string;
    name: string;
    availability: number;
    unitCost: number;
};

type PartRow = MockPart & {
    quantity: number;
};

type MockFleet = {
    fleetCode: string;
    vehicleName: string;
    assetClass: string;
    partIds: string[];
};

type MockLabourBundle = {
    id: string;
    name: string;
    assetClass: string;
    rate: number;
};

type LabourBundleRow = MockLabourBundle;

/* -------------------------------------------------------------------------- */
/* Mock Parts                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_PARTS: MockPart[] = [
    {
        id: "part-001",
        name: "Fuel filter",
        availability: 14,
        unitCost: 200,
    },
    {
        id: "part-002",
        name: "Carburetor cleaner (can)",
        availability: 6,
        unitCost: 150,
    },
    {
        id: "part-003",
        name: "Engine oil",
        availability: 20,
        unitCost: 450,
    },
    {
        id: "part-004",
        name: "Brake fluid",
        availability: 8,
        unitCost: 300,
    },
];

/* -------------------------------------------------------------------------- */
/* Mock Fleet Data                                                            */
/*                                                                            */
/* This represents which parts are applicable to each vehicle.               */
/* Later this will come from the Fleet / Inventory API.                       */
/* -------------------------------------------------------------------------- */

const MOCK_FLEETS: MockFleet[] = [
    {
        fleetCode: "VH-1091",
        vehicleName: "Toyota Hilux",
        assetClass: "Light Commercial Vehicle",
        partIds: [
            "part-001",
            "part-003",
            "part-004",
        ],
    },
    {
        fleetCode: "VH-1004",
        vehicleName: "Honda City",
        assetClass: "Passenger Vehicle",
        partIds: [
            "part-001",
            "part-002",
            "part-003",
        ],
    },
];

/* -------------------------------------------------------------------------- */
/* Mock Labour Rate Cards                                                     */
/* -------------------------------------------------------------------------- */

const MOCK_LABOUR_BUNDLES: MockLabourBundle[] = [
    {
        id: "labour-001",
        name: "General diagnostic & repair",
        assetClass: "All asset classes",
        rate: 250,
    },
    {
        id: "labour-002",
        name: "Engine service",
        assetClass: "2-Wheeler",
        rate: 400,
    },
    {
        id: "labour-003",
        name: "Brake inspection & repair",
        assetClass: "All asset classes",
        rate: 300,
    },
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function WorkForm() {
    /* ---------------------------------------------------------------------- */
    /* Basic Form                                                             */
    /* ---------------------------------------------------------------------- */

    const [fleetCode, setFleetCode] = useState("");
    const [reportedBy, setReportedBy] = useState("");
    const [odometerReading, setOdometerReading] =
        useState("");
    const [issueDescription, setIssueDescription] =
        useState("");
    const [notes, setNotes] = useState("");

    /* ---------------------------------------------------------------------- */
    /* Selected Parts                                                         */
    /* ---------------------------------------------------------------------- */

    const [parts, setParts] = useState<PartRow[]>([]);

    /* ---------------------------------------------------------------------- */
    /* Selected Labour Bundles                                                */
    /* ---------------------------------------------------------------------- */

    const [labourBundles, setLabourBundles] =
        useState<LabourBundleRow[]>([]);

    /* ---------------------------------------------------------------------- */
    /* Part Selector                                                           */
    /* ---------------------------------------------------------------------- */

    const [isAddingPart, setIsAddingPart] =
        useState(false);

    const [selectedPartId, setSelectedPartId] =
        useState("");

    /* ---------------------------------------------------------------------- */
    /* Labour Selector                                                        */
    /* ---------------------------------------------------------------------- */

    const [isAddingLabourBundle, setIsAddingLabourBundle] =
        useState(false);

    const [selectedLabourBundleId, setSelectedLabourBundleId] =
        useState("");

    const [isSaving, setIsSaving] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* Input Classes                                                          */
    /* ---------------------------------------------------------------------- */

    const inputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    /* ---------------------------------------------------------------------- */
    /* Find Vehicle                                                           */
    /* ---------------------------------------------------------------------- */

    const normalizedFleetCode =
        fleetCode.trim().toUpperCase();

    const selectedFleet = MOCK_FLEETS.find(
        (fleet) =>
            fleet.fleetCode === normalizedFleetCode,
    );

    /* ---------------------------------------------------------------------- */
    /* Available Parts For Selected Vehicle                                  */
    /* ---------------------------------------------------------------------- */

    const availablePartsForVehicle =
        selectedFleet
            ? MOCK_PARTS.filter((part) =>
                selectedFleet.partIds.includes(
                    part.id,
                ),
            )
            : [];

    /* ---------------------------------------------------------------------- */
    /* Parts Already Selected                                                 */
    /* ---------------------------------------------------------------------- */

    const selectableParts =
        availablePartsForVehicle.filter(
            (part) =>
                !parts.some(
                    (selectedPart) =>
                        selectedPart.id ===
                        part.id,
                ),
        );

    /* ---------------------------------------------------------------------- */
    /* Fleet Code Change                                                      */
    /* ---------------------------------------------------------------------- */

    const handleFleetCodeChange = (
        value: string,
    ) => {
        const nextFleetCode =
            value.toUpperCase();

        setFleetCode(nextFleetCode);

        /*
         * Parts belong to the selected vehicle.
         * If the fleet changes, previously selected
         * parts should not remain attached to the
         * previous vehicle.
         */
        const nextFleet = MOCK_FLEETS.find(
            (fleet) =>
                fleet.fleetCode ===
                nextFleetCode.trim(),
        );

        if (
            !nextFleet ||
            nextFleet.fleetCode !==
            normalizedFleetCode
        ) {
            setParts([]);
        }

        setIsAddingPart(false);
        setSelectedPartId("");
    };

    /* ---------------------------------------------------------------------- */
    /* Add Part                                                               */
    /* ---------------------------------------------------------------------- */

    const handleAddPart = () => {
        if (!selectedPartId) return;

        const selectedPart =
            availablePartsForVehicle.find(
                (part) =>
                    part.id ===
                    selectedPartId,
            );

        if (!selectedPart) return;

        /*
         * Prevent duplicate part rows.
         */
        if (
            parts.some(
                (part) =>
                    part.id ===
                    selectedPart.id,
            )
        ) {
            return;
        }

        setParts((previous) => [
            ...previous,
            {
                ...selectedPart,
                quantity: 1,
            },
        ]);

        setSelectedPartId("");
        setIsAddingPart(false);
    };

    /* ---------------------------------------------------------------------- */
    /* Update Part Quantity                                                   */
    /* ---------------------------------------------------------------------- */

    const updateQuantity = (
        id: string,
        change: number,
    ) => {
        setParts((previous) => {
            return previous.reduce<PartRow[]>(
                (result, part) => {
                    if (part.id !== id) {
                        result.push(part);
                        return result;
                    }

                    const newQuantity =
                        part.quantity + change;

                    /*
                     * Quantity 1 + minus
                     * means remove this part.
                     */
                    if (newQuantity === 0) {
                        return result;
                    }

                    /*
                     * Never allow quantity
                     * above available stock.
                     */
                    if (
                        newQuantity >
                        part.availability
                    ) {
                        result.push(part);
                        return result;
                    }

                    result.push({
                        ...part,
                        quantity: newQuantity,
                    });

                    return result;
                },
                [],
            );
        });
    };

    /* ---------------------------------------------------------------------- */
    /* Add Labour Bundle                                                      */
    /* ---------------------------------------------------------------------- */

    const selectableLabourBundles =
        MOCK_LABOUR_BUNDLES.filter(
            (bundle) =>
                !labourBundles.some(
                    (selectedBundle) =>
                        selectedBundle.id ===
                        bundle.id,
                ),
        );

    const handleAddLabourBundle = () => {
        if (!selectedLabourBundleId) {
            return;
        }

        const selectedBundle =
            MOCK_LABOUR_BUNDLES.find(
                (bundle) =>
                    bundle.id ===
                    selectedLabourBundleId,
            );

        if (!selectedBundle) return;

        setLabourBundles((previous) => [
            ...previous,
            selectedBundle,
        ]);

        setSelectedLabourBundleId("");
        setIsAddingLabourBundle(false);
    };

    /* ---------------------------------------------------------------------- */
    /* Remove Labour Bundle                                                   */
    /* ---------------------------------------------------------------------- */

    const removeLabourBundle = (
        id: string,
    ) => {
        setLabourBundles((previous) =>
            previous.filter(
                (bundle) =>
                    bundle.id !== id,
            ),
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Estimated Cost                                                         */
    /* ---------------------------------------------------------------------- */

    const partsCost = parts.reduce(
        (total, part) =>
            total +
            part.quantity * part.unitCost,
        0,
    );

    const labourCost =
        labourBundles.reduce(
            (total, bundle) =>
                total + bundle.rate,
            0,
        );

    const estimatedCost =
        partsCost + labourCost;

    /* ---------------------------------------------------------------------- */
    /* Create Work Order                                                      */
    /* ---------------------------------------------------------------------- */

    const handleSubmit = async () => {
        setIsSaving(true);

        try {
            const workOrder = {
                fleetCode:
                    normalizedFleetCode,
                reportedBy,
                odometerReading,
                issueDescription,
                notes,
                parts,
                labourBundles,
                estimatedCost,
            };

            // Replace with API call later.
            console.log(
                "Work order:",
                workOrder,
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                     */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title="Log Work Order"
            description="Creates a General work order. PM, Service, and Return Inspection work orders are generated automatically by Maintenance Schedules and Asset Register."
        >
            {/* ============================================================== */}
            {/* BASIC WORK ORDER DETAILS                                    */}
            {/* ============================================================== */}

            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* Fleet Code */}
                    <div>
                        <label
                            htmlFor="fleet-code"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Fleet code
                        </label>

                        <input
                            id="fleet-code"
                            type="text"
                            value={fleetCode}
                            onChange={(event) =>
                                handleFleetCodeChange(
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. VH-1091"
                            className={
                                inputClassName
                            }
                        />

                        {fleetCode &&
                            selectedFleet && (
                                <p className="mt-1 text-xs text-gray-500">
                                    {
                                        selectedFleet.vehicleName
                                    }{" "}
                                    ·{" "}
                                    {
                                        selectedFleet.assetClass
                                    }
                                </p>
                            )}

                        {fleetCode &&
                            !selectedFleet && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter a valid
                                    fleet code to
                                    load vehicle
                                    parts.
                                </p>
                            )}
                    </div>

                    {/* Reported By */}
                    <div>
                        <label
                            htmlFor="reported-by"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Reported by
                        </label>

                        <input
                            id="reported-by"
                            type="text"
                            value={reportedBy}
                            onChange={(event) =>
                                setReportedBy(
                                    event.target.value,
                                )
                            }
                            placeholder="Name / owner / client POC"
                            className={
                                inputClassName
                            }
                        />
                    </div>

                    {/* Odometer */}
                    <div>
                        <label
                            htmlFor="odometer-reading"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Odometer reading (km)
                        </label>

                        <input
                            id="odometer-reading"
                            type="text"
                            value={
                                odometerReading
                            }
                            onChange={(event) =>
                                setOdometerReading(
                                    event.target.value,
                                )
                            }
                            placeholder="Current reading"
                            className={
                                inputClassName
                            }
                        />
                    </div>
                </div>

                {/* Issue Description */}
                <div className="mt-3">
                    <label
                        htmlFor="issue-description"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Issue description
                    </label>

                    <input
                        id="issue-description"
                        type="text"
                        value={
                            issueDescription
                        }
                        onChange={(event) =>
                            setIssueDescription(
                                event.target.value,
                            )
                        }
                        placeholder="What's wrong, and any symptoms observed"
                        className={
                            inputClassName
                        }
                    />
                </div>

                {/* Notes */}
                <div className="mt-3">
                    <label
                        htmlFor="work-order-notes"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Notes{" "}
                        <span className="font-normal text-gray-400">
                            (optional)
                        </span>
                    </label>

                    <input
                        id="work-order-notes"
                        type="text"
                        value={notes}
                        onChange={(event) =>
                            setNotes(
                                event.target.value,
                            )
                        }
                        placeholder="Anything else worth recording"
                        className={
                            inputClassName
                        }
                    />
                </div>
            </div>

            {/* ============================================================== */}
            {/* PARTS REQUIRED                                               */}
            {/* ============================================================== */}

            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Parts required
                    </p>
                </div>

                <div className="grid grid-cols-[1fr_125px_240px] border-b border-gray-200 pb-1 text-[11px] font-semibold uppercase text-gray-400">
                    <span>Part</span>
                    <span>Qty</span>
                    <span>Availability</span>
                </div>

                {/* Selected Parts */}
                {parts.length > 0 &&
                    parts.map((part) => (
                        <div
                            key={part.id}
                            className="grid grid-cols-[1fr_125px_240px] items-center border-b border-gray-100 py-2 text-sm"
                        >
                            <span className="text-gray-800">
                                {part.name}
                            </span>

                            <div className="flex items-center gap-1">
                                {/* Minus */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        updateQuantity(
                                            part.id,
                                            -1,
                                        )
                                    }
                                    aria-label={`Decrease ${part.name} quantity`}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
                                >
                                    <Minus
                                        size={14}
                                    />
                                </button>

                                {/* Quantity */}
                                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-500 bg-white text-sm font-medium text-gray-900">
                                    {
                                        part.quantity
                                    }
                                </span>

                                {/* Plus */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        updateQuantity(
                                            part.id,
                                            1,
                                        )
                                    }
                                    disabled={
                                        part.quantity >=
                                        part.availability
                                    }
                                    aria-label={`Increase ${part.name} quantity`}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-gray-100"
                                >
                                    <Plus
                                        size={14}
                                    />
                                </button>
                            </div>

                            <span className="font-semibold text-green-700">
                                {
                                    part.availability
                                }{" "}
                                in stock
                            </span>
                        </div>
                    ))}

                {/* No Parts */}
                {parts.length === 0 && (
                    <div className="py-4 text-sm text-gray-400">
                        {selectedFleet
                            ? "No parts added yet. Add the parts required for this work order."
                            : "Enter a valid fleet code to load available parts."}
                    </div>
                )}

                {/* Add Part Selector */}
                {isAddingPart && (
                    <div className="mt-3 flex items-center gap-2">
                        <select
                            value={
                                selectedPartId
                            }
                            onChange={(event) =>
                                setSelectedPartId(
                                    event.target.value,
                                )
                            }
                            disabled={
                                !selectedFleet ||
                                selectableParts.length ===
                                0
                            }
                            className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                        >
                            <option value="">
                                Select part
                            </option>

                            {selectableParts.map(
                                (part) => (
                                    <option
                                        key={
                                            part.id
                                        }
                                        value={
                                            part.id
                                        }
                                    >
                                        {part.name}{" "}
                                        —{" "}
                                        {
                                            part.availability
                                        }{" "}
                                        in stock
                                    </option>
                                ),
                            )}
                        </select>

                        <button
                            type="button"
                            onClick={
                                handleAddPart
                            }
                            disabled={
                                !selectedPartId
                            }
                            className="h-9 rounded-md bg-[#FE5720] px-4 text-xs font-semibold text-white transition hover:bg-[#e64d1c] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            Add
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsAddingPart(
                                    false,
                                );
                                setSelectedPartId(
                                    "",
                                );
                            }}
                            className="h-9 rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Add Another Part */}
            <button
                type="button"
                onClick={() =>
                    setIsAddingPart(true)
                }
                disabled={
                    !selectedFleet ||
                    selectableParts.length ===
                    0
                }
                className="mt-2 ml-8 flex items-center gap-1 text-xs font-semibold text-[#FE5720] transition hover:text-[#e64d1c] disabled:cursor-not-allowed disabled:text-gray-300"
            >
                <Plus size={13} />
                Add another part
            </button>

            {/* ============================================================== */}
            {/* LABOUR BUNDLES                                                */}
            {/* ============================================================== */}

            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Labour bundles
                    </p>
                </div>

                <div className="grid grid-cols-[1fr_160px_140px] border-b border-gray-200 pb-1 text-[11px] font-semibold uppercase text-gray-400">
                    <span>Bundle</span>
                    <span>Asset class</span>
                    <span>Rate</span>
                </div>

                {labourBundles.length >
                    0 &&
                    labourBundles.map(
                        (bundle) => (
                            <div
                                key={
                                    bundle.id
                                }
                                className="grid grid-cols-[1fr_160px_140px] items-center border-b border-gray-100 py-3 text-sm"
                            >
                                <span className="text-gray-800">
                                    {
                                        bundle.name
                                    }
                                </span>

                                <span className="text-gray-700">
                                    {
                                        bundle.assetClass
                                    }
                                </span>

                                <div className="flex items-center justify-between">
                                    <span className="text-gray-700">
                                        Rs.{" "}
                                        {bundle.rate.toLocaleString()}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeLabourBundle(
                                                bundle.id,
                                            )
                                        }
                                        className="text-xs font-medium text-gray-400 hover:text-red-500"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ),
                    )}

                {labourBundles.length ===
                    0 && (
                        <div className="py-4 text-sm text-gray-400">
                            No labour bundle
                            added yet.
                        </div>
                    )}
                <p className="mt-3 text-xs text-gray-400">
                    Picked from Labour Rate
                    Cards — inactive bundles
                    aren&apos;t offered here.
                </p>


                {/* Labour Selector */}
                {isAddingLabourBundle && (
                    <div className="mt-3 flex items-center gap-2">
                        <select
                            value={
                                selectedLabourBundleId
                            }
                            onChange={(event) =>
                                setSelectedLabourBundleId(
                                    event.target.value,
                                )
                            }
                            className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                        >
                            <option value="">
                                Select labour bundle
                            </option>

                            {selectableLabourBundles.map(
                                (bundle) => (
                                    <option
                                        key={
                                            bundle.id
                                        }
                                        value={
                                            bundle.id
                                        }
                                    >
                                        {
                                            bundle.name
                                        }{" "}
                                        — Rs.{" "}
                                        {bundle.rate.toLocaleString()}
                                    </option>
                                ),
                            )}
                        </select>

                        <button
                            type="button"
                            onClick={
                                handleAddLabourBundle
                            }
                            disabled={
                                !selectedLabourBundleId
                            }
                            className="h-9 rounded-md bg-[#FE5720] px-4 text-xs font-semibold text-white transition hover:bg-[#e64d1c] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            Add
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsAddingLabourBundle(
                                    false,
                                );
                                setSelectedLabourBundleId(
                                    "",
                                );
                            }}
                            className="h-9 rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Add Another Bundle */}
            <button
                type="button"
                onClick={() =>
                    setIsAddingLabourBundle(
                        true,
                    )
                }
                disabled={
                    selectableLabourBundles.length ===
                    0
                }
                className="mt-2 ml-8 flex items-center gap-1 text-xs font-semibold text-[#FE5720] transition hover:text-[#e64d1c] disabled:cursor-not-allowed disabled:text-gray-300"
            >
                <Plus size={13} />
                Add another bundle
            </button>

            {/* ============================================================== */}
            {/* INFORMATION BOX                                               */}
            {/* ============================================================== */}

            <div className="mt-4 flex items-start gap-3 rounded-md border border-gray-300 bg-gray-100 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[11px] font-semibold text-white">
                    i
                </span>

                <p className="text-xs leading-5 text-gray-600">
                    Estimated cost: Rs.{" "}
                    {estimatedCost.toLocaleString()}{" "}
                    (Rs.{" "}
                    {partsCost.toLocaleString()}{" "}
                    parts + Rs.{" "}
                    {labourCost.toLocaleString()}{" "}
                    labour bundle) — recorded on
                    the work order as its Estimate
                    once logged.
                </p>
            </div>

            {/* ============================================================== */}
            {/* ACTION                                                         */}
            {/* ============================================================== */}

            <div className="mt-4 flex justify-end">
                <Button
                    type="button"
                    onClick={
                        handleSubmit
                    }
                    disabled={
                        isSaving
                    }
                    className="h-10 px-5"
                >
                    {isSaving
                        ? "Creating..."
                        : "Create Work Order"}
                </Button>
            </div>
        </OrganizationFormLayout>
    );
}