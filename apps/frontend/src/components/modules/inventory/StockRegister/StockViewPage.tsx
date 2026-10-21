"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inventoryStockRegisterEditHref } from "@/lib/navigation/inventory-static-routes";
import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import {
    fetchStockRegisterDetailApi,
    updateSparePartStatusApi,
} from "@/lib/api/inventory/stock-register";
import {
    showApiErrorToast,
    showSparePartActivatedToast,
    showSparePartDeactivatedToast,
} from "@/lib/toast/show-toast";

import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type StockStatus = "active" | "inactive";

type StockLocation = {
    location: string;
    quantity: number;
};

type WorkOrderUsage = {
    workOrder: string;
    date: string;
    quantity: number;
    type: string;
    vehicle: string;
};

type StockRecord = {
    id: string;
    partName: string;
    partNumber: string;
    status: StockStatus;
    compatibleAssetClasses: string[];
    unitOfMeasure: string;
    retailMarkup: string;
    wholesaleMarkup: string;
    threshold: string;
    onHand: number;
    locationStock: StockLocation[];
    workOrderHistory: WorkOrderUsage[];
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockViewPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const stockId = useInventoryEntityId("partId");

    const detailQuery = useQuery({
        queryKey: [
            "inventory",
            "stock-register",
            organizationId,
            stockId,
        ],
        queryFn: () =>
            fetchStockRegisterDetailApi(
                organizationId!,
                stockId,
                token!,
            ),
        enabled:
            !!token &&
            !!organizationId &&
            !isAuthLoading &&
            !!stockId,
    });

    /* ---------------------------------------------------------------------- */
    /* Status Mutation                                                        */
    /* ---------------------------------------------------------------------- */

    const statusMutation = useMutation({
        mutationFn: (input: {
            isActive: boolean;
            reason?: string;
        }) =>
            updateSparePartStatusApi(
                organizationId!,
                stockId,
                input,
                token!,
            ),

        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: [
                    "inventory",
                    "stock-register",
                    organizationId,
                ],
            });

            if (variables.isActive) {
                showSparePartActivatedToast(
                    detailQuery.data?.partName ?? "Part",
                );
            } else {
                showSparePartDeactivatedToast(
                    detailQuery.data?.partName ?? "Part",
                );
            }
        },

        onError: (error) => {
            showApiErrorToast(error, "Could not update part status.");
        },
    });

    const canUpdate =
        permissions.has("inventory.update") ||
        permissions.has("inventory.manage");

    /* ---------------------------------------------------------------------- */
    /* Modal State                                                            */
    /* ---------------------------------------------------------------------- */

    const [showActivateModal, setShowActivateModal] =
        useState(false);

    const [showDeactivateModal, setShowDeactivateModal] =
        useState(false);

    const [deactivateReason, setDeactivateReason] =
        useState("");

    const [deactivateReasonError, setDeactivateReasonError] =
        useState("");

    const canConfirmDeactivate =
        deactivateReason.trim().length > 0 &&
        !statusMutation.isPending;

    /* ---------------------------------------------------------------------- */
    /* Loading and Error States                                               */
    /* ---------------------------------------------------------------------- */

    if (detailQuery.isLoading || isAuthLoading) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Loading part…
                </p>
            </div>
        );
    }

    if (detailQuery.isError || !detailQuery.data) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Stock record not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Stock Record                                                            */
    /* ---------------------------------------------------------------------- */

    const api = detailQuery.data;

    const stock: StockRecord = {
        id: api.id,
        partName: api.partName,
        partNumber: api.partNumber,
        status: api.status,
        compatibleAssetClasses: api.compatibleAssetClasses,
        unitOfMeasure: api.unitOfMeasure,
        retailMarkup: api.retailMarkup,
        wholesaleMarkup: api.wholesaleMarkup,
        threshold: api.threshold,
        onHand: api.onHand,
        locationStock: api.locationStock,
        workOrderHistory: [],
    };

    /* ---------------------------------------------------------------------- */
    /* Edit                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleEdit = () => {
        if (!canUpdate || stock.status !== "active") {
            return;
        }

        router.push(
            inventoryStockRegisterEditHref(stock.id),
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Activate                                                                */
    /* ---------------------------------------------------------------------- */

    const handleActivate = () => {
        if (!canUpdate || statusMutation.isPending) {
            return;
        }

        statusMutation.mutate(
            { isActive: true },
            {
                onSuccess: () => {
                    setShowActivateModal(false);
                },
            },
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                              */
    /* ---------------------------------------------------------------------- */

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();

        if (!reason) {
            setDeactivateReasonError("Reason is required.");
            return;
        }

        if (!canUpdate || statusMutation.isPending) {
            return;
        }

        statusMutation.mutate(
            {
                isActive: false,
                reason,
            },
            {
                onSuccess: () => {
                    setShowDeactivateModal(false);
                    setDeactivateReason("");
                    setDeactivateReasonError("");
                },
            },
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel Deactivate                                                       */
    /* ---------------------------------------------------------------------- */

    const handleCancelDeactivate = () => {
        if (statusMutation.isPending) {
            return;
        }

        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateReasonError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Compatible Classes                                                     */
    /* ---------------------------------------------------------------------- */

    const compatibleClass =
        stock.compatibleAssetClasses.length === 0
            ? "—"
            : stock.compatibleAssetClasses.length === 1
                ? stock.compatibleAssetClasses[0]
                : "Both classes";

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">
                {/* ========================================================== */}
                {/* HEADER                                                       */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {stock.partName}
                            </h1>

                            {stock.status === "active" ? (
                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[12px] font-medium text-[#FE5720]">
                                    Active
                                </span>
                            ) : (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-gray-500">
                                    Inactive
                                </span>
                            )}
                        </div>

                        <p className="mt-0.5 text-[12px] text-gray-500">
                            {stock.partNumber}
                            {" — "}
                            compatible with{" "}
                            {stock.compatibleAssetClasses.length > 1
                                ? "both classes"
                                : "one class"}
                            .
                        </p>
                    </div>

                    {/* ====================================================== */}
                    {/* ACTIONS                                                  */}
                    {/* ====================================================== */}

                    <div className="flex items-center gap-2">
                        {stock.status === "active" && (
                            <>
                                {/* Edit: Active parts only */}
                                {canUpdate && (
                                    <Button
                                        type="button"
                                        variant="neutral"
                                        onClick={handleEdit}
                                        className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                                    >
                                        Edit
                                    </Button>
                                )}

                                {/* Deactivate */}
                                {canUpdate && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => {
                                            setDeactivateReason("");
                                            setDeactivateReasonError("");
                                            setShowDeactivateModal(true);
                                        }}
                                        disabled={statusMutation.isPending}
                                        className="h-9"
                                    >
                                        Deactivate
                                    </Button>
                                )}
                            </>
                        )}

                        {stock.status === "inactive" && canUpdate && (
                            /* Activate: Inactive parts only */
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => setShowActivateModal(true)}
                                disabled={statusMutation.isPending}
                                className="h-9"
                            >
                                Activate
                            </Button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* MASTER RECORD                                                */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Master record
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="Part number"
                            value={stock.partNumber}
                        />

                        <InfoRow
                            label="Compatible class"
                            value={compatibleClass}
                        />

                        <InfoRow
                            label="Unit of measure"
                            value={stock.unitOfMeasure}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* PRICING                                                      */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Pricing
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="Retail markup"
                            value={`${stock.retailMarkup}%`}
                        />

                        <InfoRow
                            label="Wholesale markup"
                            value={`${stock.wholesaleMarkup}%`}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* STOCK                                                        */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Stock
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="On-hand (all locations)"
                            value={`${stock.onHand} ${getPluralizedUnit(
                                stock.unitOfMeasure,
                                stock.onHand,
                            )}`}
                        />

                        <InfoRow
                            label="Low stock threshold"
                            value={`${stock.threshold} ${getPluralizedUnit(
                                stock.unitOfMeasure,
                                Number(stock.threshold),
                            )}`}
                        />

                        {stock.locationStock.map((location) => (
                            <InfoRow
                                key={location.location}
                                label={location.location}
                                value={`${location.quantity} ${getPluralizedUnit(
                                    stock.unitOfMeasure,
                                    location.quantity,
                                )}`}
                            />
                        ))}
                    </div>
                </section>

                {/* ========================================================== */}
                {/* WORK ORDER USAGE HISTORY                                    */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Work order usage history
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                                            Work order
                                        </th>

                                        <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                                            Date
                                        </th>

                                        <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                                            Quantity
                                        </th>

                                        <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                                            Type / Vehicle
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {stock.workOrderHistory.length > 0 ? (
                                        stock.workOrderHistory.map((item) => (
                                            <tr
                                                key={item.workOrder}
                                                className="border-b border-gray-100 last:border-b-0"
                                            >
                                                <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">
                                                    {item.workOrder}
                                                </td>

                                                <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">
                                                    {item.date}
                                                </td>

                                                <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">
                                                    {item.quantity}{" "}
                                                    {getPluralizedUnit(
                                                        stock.unitOfMeasure,
                                                        item.quantity,
                                                    )}
                                                </td>

                                                <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">
                                                    {item.type}
                                                    {" — "}
                                                    {item.vehicle}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-8 text-center text-xs text-gray-400"
                                            >
                                                No work order usage history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>

            {/* ============================================================= */}
            {/* ACTIVATE CONFIRMATION — SHARED DIALOG                          */}
            {/* ============================================================= */}

            <ConfirmDialog
                open={showActivateModal}
                title="Activate this part?"
                message={`Are you sure you want to activate "${stock.partName}"? It will become available in the part register.`}
                confirmLabel="Activate"
                cancelLabel="Cancel"
                variant="default"
                isConfirmPending={statusMutation.isPending}
                confirmDisabled={!canUpdate}
                onClose={() => {
                    if (!statusMutation.isPending) {
                        setShowActivateModal(false);
                    }
                }}
                onConfirm={handleActivate}
            />

            {/* ============================================================= */}
            {/* DEACTIVATE MODAL — REASON REQUIRED                             */}
            {/* ============================================================= */}

            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div
                        className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-part-title"
                    >
                        {/* Modal Header */}

                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                                <AlertTriangle
                                    className="h-4 w-4 text-red-500"
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div>
                                <h2
                                    id="deactivate-part-title"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Deactivate this part?
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    This will deactivate{" "}
                                    <span className="font-medium text-gray-700">
                                        &quot;{stock.partName}&quot;
                                    </span>{" "}
                                    from the part register.
                                </p>
                            </div>
                        </div>

                        {/* Reason */}

                        <div className="mt-4">
                            <label
                                htmlFor="deactivate-reason"
                                className="mb-1.5 block text-xs font-medium text-gray-700"
                            >
                                Reason
                                <span className="ml-1 text-red-500">
                                    *
                                </span>
                            </label>

                            <textarea
                                id="deactivate-reason"
                                value={deactivateReason}
                                onChange={(event) => {
                                    const value = event.target.value;

                                    setDeactivateReason(value);

                                    if (value.trim()) {
                                        setDeactivateReasonError("");
                                    }
                                }}
                                placeholder="Enter reason for deactivation..."
                                rows={3}
                                disabled={statusMutation.isPending}
                                className={[
                                    "w-full resize-none rounded-md bg-white px-3 py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400",
                                    deactivateReasonError
                                        ? "border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                        : "border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-200",
                                ].join(" ")}
                            />

                            {deactivateReasonError && (
                                <p className="mt-1 text-xs text-red-500">
                                    {deactivateReasonError}
                                </p>
                            )}
                        </div>

                        {/* Modal Actions */}

                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleCancelDeactivate}
                                disabled={statusMutation.isPending}
                                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleDeactivate}
                                disabled={
                                    !canConfirmDeactivate || !canUpdate
                                }
                                className="h-9"
                            >
                                {statusMutation.isPending
                                    ? "Deactivating..."
                                    : "Deactivate"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Info Row                                                                   */
/* -------------------------------------------------------------------------- */

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
            <p className="w-1/2 text-[12px] font-medium text-gray-400">
                {label}
            </p>

            <p className="w-1/2 text-right text-[12px] font-medium text-gray-800">
                {value}
            </p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Unit Helper                                                                */
/* -------------------------------------------------------------------------- */

function getPluralizedUnit(
    unit: string,
    quantity: number,
): string {
    const normalizedUnit = unit.toLowerCase();

    if (quantity === 1) {
        return normalizedUnit;
    }

    if (normalizedUnit === "set") {
        return "sets";
    }

    if (normalizedUnit === "pair") {
        return "pairs";
    }

    if (normalizedUnit === "each") {
        return "each";
    }

    if (normalizedUnit === "kg") {
        return "kg";
    }

    if (normalizedUnit === "litre") {
        return "litres";
    }

    if (normalizedUnit === "box") {
        return "boxes";
    }

    return `${normalizedUnit}s`;
}