"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import { organisationSupplierEditHref } from "@/lib/navigation/organisation-static-routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateSupplierCaches } from "@/lib/query/invalidate-domain-caches";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { formatPhoneDisplay } from "@/lib/format/phone-format";
import {
    fetchOrganisationSupplierByIdApi,
    updateOrganisationSupplierStatusApi,
    type OrganisationSupplierTypeKey,
} from "@/lib/api/organisation/suppliers";
import {
    DashboardDetailErrorShell,
    DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";
import {
    SUPPLIER_STATUS_UPDATE_ERROR,
    showErrorToast,
    showSupplierActivatedToast,
    showSupplierDeactivatedToast,
} from "@/lib/toast/show-toast";

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SupplierViewPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const supplierId = useOrganisationEntityId("supplierId");

    const canUpdate =
        permissions.has("organisation.update") ||
        permissions.has("organisation.manage");

    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [activateOpen, setActivateOpen] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    const supplierQuery = useQuery({
        queryKey: ["organization", "supplier", organizationId, supplierId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationSupplierByIdApi(
                token,
                organizationId,
                supplierId,
            );
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
    });

    const statusMutation = useMutation({
        mutationFn: async (input: {
            action: "activate" | "deactivate";
            reason?: string;
        }) => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return updateOrganisationSupplierStatusApi(
                token,
                organizationId,
                supplierId,
                input,
            );
        },
        onSuccess: (data) => {
            void invalidateSupplierCaches(queryClient);
            setDeactivateOpen(false);
            setActivateOpen(false);
            setStatusError(null);
            if (data.status === "active") {
                showSupplierActivatedToast(data.name);
            } else {
                showSupplierDeactivatedToast(data.name);
            }
        },
        onError: (error: Error) => {
            const message = error.message || SUPPLIER_STATUS_UPDATE_ERROR;
            setStatusError(message);
            showErrorToast(message);
        },
    });

    const handleEdit = () => {
        navigateToEntityShell(router, organisationSupplierEditHref(supplierId), supplierId, 'push');
    };

    const handleToggleStatus = () => {
        const supplier = supplierQuery.data;
        if (!supplier || !canUpdate) {
            return;
        }
        setStatusError(null);
        if (supplier.status === "active") {
            setDeactivateOpen(true);
            return;
        }
        setActivateOpen(true);
    };

    if (isAuthLoading || supplierQuery.isLoading) {
        return (
            <div className="px-5 py-4">
                <DashboardPageLoadingShell label="Loading supplier…" />
            </div>
        );
    }

    if (supplierQuery.isError || !supplierQuery.data) {
        return (
            <div className="px-5 py-4">
                <DashboardDetailErrorShell
                    title="Failed to load supplier"
                    error={supplierQuery.error}
                    fallbackMessage="Failed to load supplier."
                    onRetry={() => void supplierQuery.refetch()}
                />
            </div>
        );
    }

    const supplier = supplierQuery.data;
    const isActive = supplier.status === "active";
    const linkedSection = supplier.linkedSections.linked;
    const linkedItems = linkedSection.items ?? [];
    const linkedColumns = getSupplierLinkedTableColumns(supplier.supplierType);

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">

                {/* ========================================================== */}
                {/* Header                                                     */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">

                    {/* Supplier Name + Status */}

                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            {supplier.name}
                        </h1>

                        {isActive ? (
                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[14px] font-medium text-[#FE5720]">
                                {supplier.type}
                            </span>
                        ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[14px] font-medium text-gray-500">
                                Inactive
                            </span>
                        )}
                    </div>

                    {/* ====================================================== */}
                    {/* Actions                                                  */}
                    {/* ====================================================== */}

                    {canUpdate ? (
                        <div className="flex items-center gap-2">

                            {isActive ? (
                                <Button
                                    type="button"
                                    variant="neutral"
                                    onClick={handleEdit}
                                    className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                                >
                                    Edit
                                </Button>
                            ) : null}

                            {isActive ? (
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleToggleStatus}
                                    className="h-9"
                                >
                                    Deactivate
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleToggleStatus}
                                    className="h-9"
                                >
                                    Activate
                                </Button>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* ========================================================== */}
                {/* Supplier Information                                       */}
                {/* ========================================================== */}

                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">

                    {/* First Row */}

                    <div className="grid grid-cols-4 gap-6">

                        <InfoItem
                            label="CONTACT PERSON"
                            value={supplier.contactPerson}
                        />

                        <InfoItem
                            label="PHONE"
                            value={formatPhoneDisplay(supplier.phone)}
                        />

                        <InfoItem
                            label="EMAIL"
                            value={supplier.email}
                        />

                        <InfoItem
                            label="AGREEMENT REFERENCE"
                            value={supplier.agreementReference || "—"}
                        />
                    </div>

                    {/* Address */}

                    <div className="mt-3">
                        <p className="text-[14px] font-medium text-gray-400">
                            ADDRESS
                        </p>

                        <p className="mt-0.5 text-xs text-gray-600">
                            {supplier.address || "—"}
                        </p>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Linked section (title + columns from API / supplier type)  */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        {linkedSection.title}
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    {linkedColumns.map((column) => (
                                        <th
                                            key={column.key}
                                            className="px-3 py-2 text-[12px] font-medium text-gray-400"
                                        >
                                            {column.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {linkedItems.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={linkedColumns.length}
                                            className="px-3 py-6 text-center text-[12px] text-gray-500"
                                        >
                                            No linked records yet.
                                        </td>
                                    </tr>
                                ) : (
                                    linkedItems.map((item, index) => (
                                        <tr
                                            key={String(item.id ?? index)}
                                            className="border-b border-gray-100 last:border-0"
                                        >
                                            {linkedColumns.map((column) => (
                                                <td
                                                    key={column.key}
                                                    className="px-3 py-2.5 text-xs text-gray-700"
                                                >
                                                    {formatLinkedCellValue(
                                                        item[column.fieldKey],
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <ConfirmDialog
                open={activateOpen}
                title="Activate supplier?"
                message={`${supplier.name} will be marked active in the supplier register.`}
                confirmLabel="Activate"
                isConfirmPending={statusMutation.isPending}
                onClose={() => {
                    if (!statusMutation.isPending) {
                        setActivateOpen(false);
                        setStatusError(null);
                    }
                }}
                onConfirm={() => {
                    void statusMutation.mutateAsync({ action: "activate" });
                }}
            />

            <ReasonRequiredDialog
                open={deactivateOpen}
                title="Deactivate supplier?"
                description={
                    <>
                        <span className="font-medium text-gray-900">
                            {supplier.name}
                        </span>{" "}
                        will be marked inactive. Provide a reason — it is
                        recorded in the audit log.
                    </>
                }
                reasonLabel="Reason for deactivation"
                reasonPlaceholder="Enter reason for deactivation..."
                confirmLabel="Deactivate"
                pendingLabel="Deactivating..."
                isPending={statusMutation.isPending}
                error={statusError}
                onClose={() => {
                    setDeactivateOpen(false);
                    setStatusError(null);
                }}
                onConfirm={(reason) => {
                    void statusMutation.mutateAsync({
                        action: "deactivate",
                        reason,
                    });
                }}
            />
        </div>
    );
}

type LinkedTableColumn = {
    key: string;
    header: string;
    fieldKey: string;
};

function getSupplierLinkedTableColumns(
    supplierType: OrganisationSupplierTypeKey,
): LinkedTableColumn[] {
    switch (supplierType) {
        case "driver":
            return [
                { key: "driver", header: "DRIVER", fieldKey: "driver" },
                {
                    key: "license",
                    header: "LICENSE NO.",
                    fieldKey: "licenseNo",
                },
                {
                    key: "vehicle",
                    header: "ASSIGNED VEHICLE",
                    fieldKey: "assignedVehicle",
                },
                { key: "status", header: "STATUS", fieldKey: "status" },
            ];
        case "bike":
            return [
                { key: "vehicle", header: "VEHICLE", fieldKey: "vehicle" },
                { key: "code", header: "CODE", fieldKey: "code" },
                { key: "status", header: "STATUS", fieldKey: "status" },
            ];
        case "compliance":
            return [
                { key: "renewal", header: "RENEWAL", fieldKey: "renewal" },
                { key: "due", header: "DUE DATE", fieldKey: "dueDate" },
                { key: "status", header: "STATUS", fieldKey: "status" },
            ];
        case "spare_parts":
        default:
            return [
                { key: "part", header: "PART", fieldKey: "part" },
                { key: "category", header: "CATEGORY", fieldKey: "category" },
                {
                    key: "lastBatch",
                    header: "LAST BATCH RECEIVED",
                    fieldKey: "lastBatchReceived",
                },
                {
                    key: "onHand",
                    header: "ON-HAND QTY",
                    fieldKey: "onHandQty",
                },
            ];
    }
}

function formatLinkedCellValue(value: string | number | undefined): string {
    if (value === undefined || value === null || value === "") {
        return "—";
    }
    return String(value);
}

/* -------------------------------------------------------------------------- */
/* Info Item                                                                  */
/* -------------------------------------------------------------------------- */

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[12px] font-medium text-gray-400">
                {label}
            </p>

            <p className="mt-0.5 text-[12px] font-medium text-gray-800">
                {value}
            </p>
        </div>
    );
}
