"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  showErrorToast,
  showVehicleAssignedToLeaseToast,
  VEHICLE_ASSIGN_ERROR,
} from "@/lib/toast/show-toast";
import { fetchAssetRegisterVehicleApi } from "@/lib/api/asset-register/vehicles";
import { bulkAssignAssetRegisterVehiclesApi } from "@/lib/api/asset-register/assignments";
import { fetchLeaseContractsList, fetchLeaseContractById } from "@/lib/api/lease-contracts";
import { formatAssetRegisterIsoDate } from "@/lib/api/asset-register/mappers";

type LeaseContractOption = {
    id: string;
    contractNumber: string;
    clientName: string;
    matchingLine: string;
    allocated: number;
    total: number;
};

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
            <p className="w-1/2 text-[10px] font-medium text-gray-400">{label}</p>
            <p className="w-1/2 text-right text-[10px] font-medium text-gray-800">
                {value}
            </p>
        </div>
    );
}

export default function AssetAssignmentViewPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { token, organizationId, isLoading: isAuthLoading, permissions } =
        useAuth();

    const vehicleId = String(params.id);

    const canAssign =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const vehicleQuery = useQuery({
        queryKey: ["asset-register", "vehicles", organizationId, vehicleId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterVehicleApi({
                token,
                organizationId,
                id: vehicleId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const leasesQuery = useQuery({
        queryKey: ["lease-contracts", "active", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchLeaseContractsList(token, organizationId, {
                page: 1,
                pageSize: 50,
                statusFilter: "active",
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const vehicle = vehicleQuery.data;

    const matchingLeaseListItems = useMemo(() => {
        if (!vehicle) return [];
        const className = vehicle.assetClassName.trim().toLowerCase();
        return (leasesQuery.data?.items ?? []).filter((contract) =>
            contract.assetClasses
                .toLowerCase()
                .split(",")
                .map((part) => part.trim())
                .some((part) => part === className || part.includes(className)),
        );
    }, [leasesQuery.data?.items, vehicle]);

    const [selectedLeaseContractId, setSelectedLeaseContractId] =
        useState("");
    const [isAssigned, setIsAssigned] = useState(false);

    useEffect(() => {
        if (matchingLeaseListItems.length > 0 && !selectedLeaseContractId) {
            setSelectedLeaseContractId(matchingLeaseListItems[0].id);
        }
    }, [matchingLeaseListItems, selectedLeaseContractId]);

    const leaseDetailQuery = useQuery({
        queryKey: [
            "lease-contracts",
            organizationId,
            selectedLeaseContractId,
            "assign-detail",
        ],
        queryFn: () => {
            if (!token || !organizationId || !selectedLeaseContractId) {
                throw new Error("Missing auth context");
            }
            return fetchLeaseContractById(
                token,
                organizationId,
                selectedLeaseContractId,
            );
        },
        enabled:
            !!token &&
            !!organizationId &&
            !isAuthLoading &&
            !!selectedLeaseContractId,
        ...dashboardListQueryOptions,
    });

    const selectedLeaseContract: LeaseContractOption | undefined =
        useMemo(() => {
            const listItem = matchingLeaseListItems.find(
                (item) => item.id === selectedLeaseContractId,
            );
            if (!listItem || !vehicle) return undefined;
            const detail = leaseDetailQuery.data;
            const line = detail?.assetLines.find(
                (assetLine) =>
                    assetLine.assetClass.trim().toLowerCase() ===
                    vehicle.assetClassName.trim().toLowerCase(),
            );
            const allocated =
                detail?.vehicles.filter(
                    (v) =>
                        v.assetClass.trim().toLowerCase() ===
                        vehicle.assetClassName.trim().toLowerCase(),
                ).length ?? 0;
            return {
                id: listItem.id,
                contractNumber: listItem.contractNumber,
                clientName: listItem.clientName,
                matchingLine: line?.assetClass ?? vehicle.assetClassName,
                allocated,
                total: line?.committedQuantity ?? 0,
            };
        }, [
            matchingLeaseListItems,
            selectedLeaseContractId,
            leaseDetailQuery.data,
            vehicle,
        ]);

    const assignMutation = useMutation({
        mutationFn: async () => {
            if (!token || !organizationId || !selectedLeaseContractId) {
                throw new Error("Missing auth context");
            }
            const detail = leaseDetailQuery.data;
            const organisationClientId = detail?.client?.id;
            return bulkAssignAssetRegisterVehiclesApi({
                token,
                body: {
                    organizationId,
                    leaseContractId: selectedLeaseContractId,
                    vehicleIds: [vehicleId],
                    organisationClientId,
                },
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "vehicles"],
            });
            setIsAssigned(true);
            showVehicleAssignedToLeaseToast();
        },
        onError: (error: Error) => {
            showErrorToast(error.message || VEHICLE_ASSIGN_ERROR);
        },
    });

    const handleCancel = () => {
        router.push("/asset-register/asset-assign");
    };

    const handleAssign = () => {
        if (!canAssign || !selectedLeaseContract || isAssigned) return;
        assignMutation.mutate();
    };

    if (vehicleQuery.isError) {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                Asset not found.{" "}
                <button
                    type="button"
                    className="text-[#FE5720] underline"
                    onClick={handleCancel}
                >
                    Back
                </button>
            </div>
        );
    }

    if (isAuthLoading || vehicleQuery.isLoading || !vehicle) {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                Loading vehicle…
            </div>
        );
    }

    if (vehicle.operationalStatus !== "available") {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                This vehicle is not available for assignment.
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">
                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Assign {vehicle.fleetCode}
                        </h1>
                        {isAssigned && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                Assigned
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                        Allocates this vehicle to a lease contract. This isn&apos;t
                        be undone from here once confirmed.
                    </p>
                </div>

                <section>
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Vehicle
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow label="Asset class" value={vehicle.assetClassName} />
                        <InfoRow
                            label="Registration number"
                            value={vehicle.registrationNumber}
                        />
                        <InfoRow
                            label="Odometer reading"
                            value={`${vehicle.odometer.toLocaleString("en-IN")} km`}
                        />
                        <InfoRow
                            label="Available since"
                            value={formatAssetRegisterIsoDate(
                                vehicle.registrationStartDate,
                            )}
                        />
                    </div>
                </section>

                <section className="mt-4">
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Assign To
                    </h2>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                        <label
                            htmlFor="lease-contract"
                            className="mb-1.5 block text-[10px] font-semibold text-gray-700"
                        >
                            Lease contract
                        </label>
                        {matchingLeaseListItems.length === 0 ? (
                            <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-xs text-gray-500">
                                No active lease contract available
                            </div>
                        ) : (
                            <select
                                id="lease-contract"
                                value={selectedLeaseContractId}
                                disabled={isAssigned}
                                onChange={(event) =>
                                    setSelectedLeaseContractId(event.target.value)
                                }
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-800 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                {matchingLeaseListItems.map((contract) => (
                                    <option key={contract.id} value={contract.id}>
                                        {contract.contractNumber} — {contract.clientName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedLeaseContract && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <InfoRow
                                label="Matching line"
                                value={selectedLeaseContract.matchingLine}
                            />
                            <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
                                <p className="w-1/2 text-[10px] font-medium text-gray-400">
                                    Current allocation
                                </p>
                                <p className="w-1/2 text-right text-[10px] font-semibold text-[#FE5720]">
                                    {selectedLeaseContract.allocated} of{" "}
                                    {selectedLeaseContract.total} allocated
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                <div className="mt-4 flex items-center gap-2">
                    <Button
                        type="button"
                        variant="neutral"
                        onClick={handleCancel}
                        disabled={isAssigned}
                        className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleAssign}
                        disabled={
                            !canAssign ||
                            !selectedLeaseContract ||
                            isAssigned ||
                            assignMutation.isPending
                        }
                        className="h-8 px-5 text-xs font-medium disabled:cursor-not-allowed"
                    >
                        {isAssigned ? "Assigned" : "Assign"}
                    </Button>
                </div>

                {isAssigned && selectedLeaseContract && (
                    <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
                        <p className="text-[10px] font-medium text-[#FE5720]">
                            Vehicle assigned successfully to{" "}
                            {selectedLeaseContract.contractNumber} —{" "}
                            {selectedLeaseContract.clientName}.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
