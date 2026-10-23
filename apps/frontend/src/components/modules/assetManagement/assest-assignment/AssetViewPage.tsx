"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, PackageSearch, Plus } from "lucide-react";
import { useAssetRegisterEntityId } from "@/lib/navigation/use-asset-register-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
    ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS,
    sanitizeTextValue,
} from "@/lib/forms/restricted-input";
import { useAuth } from "@/providers/auth-provider";
import { localTodayIsoDate } from "@/lib/format/date-format";
import { assetAssignmentQueryOptions } from "@/lib/query/asset-assignment-query-options";
import { invalidateAssetAssignmentCaches } from "@/lib/query/invalidate-asset-assignment-caches";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
    getApiErrorMessage,
    showErrorToast,
    showVehicleAssignedToLeaseToast,
    showVehicleUnassignedFromLeaseToast,
    VEHICLE_ASSIGN_ERROR,
    VEHICLE_UNASSIGN_ERROR,
} from "@/lib/toast/show-toast";
import { fetchAssetRegisterVehicleApi } from "@/lib/api/asset-register/vehicles";
import {
    bulkAssignAssetRegisterVehiclesApi,
    fetchAllAssignableLeaseContractsForVehicleApi,
    unassignAssetRegisterVehicleApi,
    type AssignableLeaseContractForVehicle,
} from "@/lib/api/asset-register/assignments";
import { formatAssetRegisterIsoDate } from "@/lib/api/asset-register/mappers";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { fleetLeaseContractDetailHref } from "@/lib/navigation/fleet-static-routes";
const ASSET_ASSIGN_LIST_HREF = "/asset-register/asset-assign/";
const LEASE_CONTRACTS_LIST_HREF = "/fleet-leasing/lease-contracts/";
const NEW_LEASE_CONTRACT_HREF = "/fleet-leasing/lease-contracts/new/";

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
            <p className="w-1/2 text-xs font-medium text-gray-400">{label}</p>
            <p className="w-1/2 truncate text-right text-xs font-semibold text-gray-800">
                {value || "—"}
            </p>
        </div>
    );
}

function NoDemandEmptyState({ assetClassName }: { assetClassName: string }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center text-gray-400">
                    <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                    No contract is waiting for this asset class
                </h3>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-gray-500">
                    No active lease contract has an open line for{" "}
                    <span className="font-semibold text-gray-700">
                        {assetClassName}
                    </span>
                    . Add this class to a contract&apos;s asset lines, then come
                    back to assign.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <Link href={LEASE_CONTRACTS_LIST_HREF}>
                        <Button
                            type="button"
                            variant="neutral"
                            className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50"
                        >
                            <FileText
                                className="mr-1.5 inline h-3.5 w-3.5"
                                aria-hidden
                            />
                            View lease contracts
                        </Button>
                    </Link>
                    <Link href={NEW_LEASE_CONTRACT_HREF}>
                        <Button
                            type="button"
                            variant="primary"
                            className="h-8 px-4 text-xs font-medium"
                        >
                            <Plus
                                className="mr-1 inline h-3.5 w-3.5"
                                aria-hidden
                            />
                            New lease contract
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function contractStatusLabel(status: string): string {
    if (status === "active") return "Active";
    if (status === "awaiting_assets") return "Awaiting assets";
    if (status === "approved") return "Approved";
    return status.replace(/_/g, " ");
}

export default function AssetAssignmentViewPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { token, organizationId, isLoading: isAuthLoading, permissions } =
        useAuth();

    const vehicleId = useAssetRegisterEntityId("vehicleId");

    const canAssign =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const [clientFilterId, setClientFilterId] = useState("");
    const [contractSearch, setContractSearch] = useState("");
    const debouncedContractSearch = useDebouncedValue(contractSearch, 300);

    const [selectedLeaseContractId, setSelectedLeaseContractId] = useState("");
    const [handoverDate, setHandoverDate] = useState("");
    const [odometerAtHandover, setOdometerAtHandover] = useState("");
    const [handoverLocation, setHandoverLocation] = useState("");
    const [assignNotes, setAssignNotes] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isLeavingAssignFlow, setIsLeavingAssignFlow] = useState(false);
    const assignSucceededRef = useRef(false);

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
        enabled: !!token && !!organizationId && !isAuthLoading && !!vehicleId,
        ...assetAssignmentQueryOptions,
    });

    const vehicle = vehicleQuery.data;

    useEffect(() => {
        if (vehicle && odometerAtHandover === "") {
            setOdometerAtHandover(String(vehicle.odometer));
        }
    }, [vehicle, odometerAtHandover]);

    const catalogContractsQuery = useQuery({
        queryKey: [
            "asset-register",
            "assignable-lease-contracts",
            "catalog",
            organizationId,
            vehicleId,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAllAssignableLeaseContractsForVehicleApi({
                token,
                organizationId,
                vehicleId,
            });
        },
        enabled:
            !!token && !!organizationId && !isAuthLoading && !!vehicleId,
        ...assetAssignmentQueryOptions,
    });

    const contractsQuery = useQuery({
        queryKey: [
            "asset-register",
            "assignable-lease-contracts",
            organizationId,
            vehicleId,
            debouncedContractSearch,
            clientFilterId,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAllAssignableLeaseContractsForVehicleApi({
                token,
                organizationId,
                vehicleId,
                search: debouncedContractSearch || undefined,
                organisationClientId: clientFilterId || undefined,
            });
        },
        enabled:
            !!token && !!organizationId && !isAuthLoading && !!vehicleId,
        ...assetAssignmentQueryOptions,
    });

    const clientFilterOptions = useMemo(() => {
        const items = catalogContractsQuery.data?.items ?? [];
        const byId = new Map<string, string>();
        for (const row of items) {
            if (row.organisationClientId && row.clientName) {
                byId.set(row.organisationClientId, row.clientName);
            }
        }
        const clientCount = byId.size;
        const allClientsLabel =
            clientCount > 0
                ? `All clients (${clientCount})`
                : "All clients";
        return [
            { value: "", label: allClientsLabel },
            ...[...byId.entries()].map(([value, label]) => ({ value, label })),
        ];
    }, [catalogContractsQuery.data?.items]);

    const contractItems = contractsQuery.data?.items ?? [];
    const hiddenOtherActiveCount =
        contractsQuery.data?.hiddenOtherActiveCount ?? 0;
    const showNoDemandEmptyState =
        contractsQuery.isSuccess &&
        !clientFilterId &&
        !debouncedContractSearch &&
        contractsQuery.data?.hasMatchingContractLine === false;

    const selectedContract: AssignableLeaseContractForVehicle | undefined =
        useMemo(
            () =>
                contractItems.find(
                    (row) => row.leaseContractId === selectedLeaseContractId,
                ),
            [contractItems, selectedLeaseContractId],
        );

    useEffect(() => {
        if (isLeavingAssignFlow || assignSucceededRef.current) {
            return;
        }
        if (vehicleQuery.isError) {
            router.replace(ASSET_ASSIGN_LIST_HREF);
            return;
        }
        if (vehicle && vehicle.operationalStatus !== "available") {
            router.replace(ASSET_ASSIGN_LIST_HREF);
        }
    }, [vehicle, vehicleQuery.isError, isLeavingAssignFlow, router]);

    useEffect(() => {
        if (showNoDemandEmptyState) {
            setSelectedLeaseContractId("");
            return;
        }
        const firstAssignable = contractItems.find((row) => row.assignable);
        if (firstAssignable && !selectedLeaseContractId) {
            setSelectedLeaseContractId(firstAssignable.leaseContractId);
        }
        if (
            selectedLeaseContractId &&
            !contractItems.some(
                (row) => row.leaseContractId === selectedLeaseContractId,
            )
        ) {
            setSelectedLeaseContractId(firstAssignable?.leaseContractId ?? "");
        }
    }, [contractItems, selectedLeaseContractId, showNoDemandEmptyState]);

    const parsedOdometer = Number.parseInt(odometerAtHandover, 10);
    const isOdometerValid =
        odometerAtHandover.trim() !== "" &&
        Number.isFinite(parsedOdometer) &&
        parsedOdometer >= 0;
    const isHandoverDateValid = handoverDate.trim().length > 0;
    const isSelectedAssignable = selectedContract?.assignable === true;

    const canSubmit =
        canAssign &&
        !showNoDemandEmptyState &&
        isSelectedAssignable &&
        isHandoverDateValid &&
        isOdometerValid &&
        !assignSucceededRef.current;

    const assignMutation = useMutation({
        mutationFn: async () => {
            if (!token || !organizationId || !selectedContract) {
                throw new Error("Missing auth context");
            }
            const organisationClientId =
                selectedContract.organisationClientId ??
                selectedContract.fleetClientId ??
                undefined;
            const locationTrim = handoverLocation.trim();
            const notesTrim = assignNotes.trim();
            return bulkAssignAssetRegisterVehiclesApi({
                token,
                body: {
                    organizationId,
                    leaseContractId: selectedContract.leaseContractId,
                    vehicleIds: [vehicleId],
                    organisationClientId,
                    handoverDate: handoverDate.trim(),
                    odometerAtHandover: parsedOdometer,
                    ...(locationTrim
                        ? { handoverLocation: locationTrim }
                        : {}),
                    ...(notesTrim ? { notes: notesTrim } : {}),
                },
            });
        },
        onSuccess: async (result) => {
            assignSucceededRef.current = true;
            setIsLeavingAssignFlow(true);
            setConfirmOpen(false);

            const contractId =
                result.contractId ??
                result.leaseContractId ??
                selectedContract?.leaseContractId ??
                "";
            const fleetCode =
                result.fleetCode?.trim() ||
                vehicle?.fleetCode?.trim() ||
                "Vehicle";
            const clientName =
                result.clientName?.trim() ||
                selectedContract?.clientName?.trim() ||
                "client";
            const contractNumber =
                result.contractNumber?.trim() ||
                selectedContract?.contractNumber?.trim() ||
                "Contract";
            const remainingToAssignOnLine = result.remainingToAssignOnLine;

            await invalidateAssetAssignmentCaches(
                queryClient,
                organizationId,
                contractId,
            );
            router.replace(ASSET_ASSIGN_LIST_HREF);

            showVehicleAssignedToLeaseToast({
                fleetCode,
                clientName,
                contractNumber,
                remainingToAssignOnLine,
                onViewContract: contractId
                    ? () => {
                          router.push(fleetLeaseContractDetailHref(contractId));
                      }
                    : undefined,
                onUndo:
                    token && organizationId && canAssign && vehicleId
                        ? async () => {
                              try {
                                  await unassignAssetRegisterVehicleApi({
                                      token,
                                      organizationId,
                                      vehicleId,
                                  });
                                  await invalidateAssetAssignmentCaches(
                                      queryClient,
                                      organizationId,
                                      contractId,
                                  );
                                  showVehicleUnassignedFromLeaseToast(fleetCode);
                              } catch (error) {
                                  showErrorToast(
                                      getApiErrorMessage(
                                          error,
                                          VEHICLE_UNASSIGN_ERROR,
                                      ),
                                  );
                              }
                          }
                        : undefined,
            });
        },
        onError: (error: Error) => {
            showErrorToast(getApiErrorMessage(error, VEHICLE_ASSIGN_ERROR));
            },
        });

    if (
        isLeavingAssignFlow ||
        assignSucceededRef.current ||
        (vehicleQuery.isError && !vehicleQuery.isLoading) ||
        (vehicle && vehicle.operationalStatus !== "available")
    ) {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                Returning to assignment list…
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

    const dateRangeLabel = (row: AssignableLeaseContractForVehicle) => {
        if (row.startDate && row.endDate) {
            return `${formatCalendarDateEnIn(row.startDate)} – ${formatCalendarDateEnIn(row.endDate)}`;
        }
        if (row.startDate) {
            return `From ${formatCalendarDateEnIn(row.startDate)}`;
        }
        return "—";
    };

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">
                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Assign {vehicle.fleetCode}
                        </h1>
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[13px] font-medium text-green-700">
                            Available
                            </span>
                    </div>
                    <p className="mt-0.5 text-[14px] text-gray-500">
                        Choose an active lease contract with open capacity for
                        this asset class, then confirm handover details.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                <section>
                        <h2 className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-gray-400">
                        Vehicle
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <InfoRow label="Fleet code" value={vehicle.fleetCode} />
                            <InfoRow
                                label="Registration"
                                value={vehicle.registrationNumber}
                            />
                        <InfoRow
                            label="Asset class"
                                value={vehicle.assetClassName}
                            />
                            <InfoRow
                                label="Chassis number"
                                value={vehicle.chassisNumber}
                            />
                        <InfoRow
                                label="Model year"
                                value={String(vehicle.modelYear)}
                            />
                        <InfoRow
                                label="Odometer"
                                value={`${vehicle.odometer.toLocaleString("en-IN")} km`}
                            />
                        <InfoRow
                                label="Insurance valid till"
                                value={formatAssetRegisterIsoDate(
                                    vehicle.insuranceEndDate,
                                )}
                        />
                    </div>
                </section>

                    <section>
                        <h2 className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-gray-400">
                            Choose lease contract
                    </h2>

                        {showNoDemandEmptyState ? (
                            <NoDemandEmptyState
                                assetClassName={vehicle.assetClassName}
                            />
                        ) : (
                            <>
                        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                            Showing contracts with an asset line for{" "}
                            <span className="font-semibold">
                                {vehicle.assetClassName}
                            </span>
                            .{" "}
                            {hiddenOtherActiveCount > 0 ? (
                                <>
                                    {hiddenOtherActiveCount} other active
                                    contract
                                    {hiddenOtherActiveCount === 1 ? "" : "s"}{" "}
                                    without this class are hidden.
                                </>
                            ) : (
                                <>No other active contracts are hidden.</>
                            )}
                        </div>

                        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                            <select
                                value={clientFilterId}
                                onChange={(event) =>
                                    setClientFilterId(event.target.value)
                                }
                                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-800"
                                aria-label="Filter by client"
                            >
                                {clientFilterOptions.map((option) => (
                                        <option
                                        key={option.value || "all"}
                                        value={option.value}
                                    >
                                        {option.label}
                                        </option>
                                ))}
                            </select>
                            <RestrictedInput
                                restrictedKind="text"
                                maxLength={
                                    ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.assignableContractSearch
                                }
                                value={contractSearch}
                                onChange={(value) => setContractSearch(value)}
                                placeholder="Search contract number"
                                className="h-9 flex-1 text-xs"
                            />
                        </div>

                        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-200 bg-white">
                            {contractsQuery.isLoading ? (
                                <p className="px-3 py-4 text-xs text-gray-500">
                                    Loading contracts…
                                </p>
                            ) : contractItems.length === 0 ? (
                                <p className="px-3 py-4 text-xs text-gray-500">
                                    No lease contracts with a matching asset
                                    line for this class.
                                </p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {contractItems.map((row) => {
                                        const disabled = !row.assignable;
                                        const checked =
                                            selectedLeaseContractId ===
                                            row.leaseContractId;
                                        return (
                                            <li key={row.leaseContractId}>
                                                <label
                                                    className={`flex cursor-pointer gap-3 px-3 py-3 ${
                                                        disabled
                                                            ? "cursor-not-allowed bg-gray-50 opacity-70"
                                                            : "hover:bg-orange-50/40"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="lease-contract"
                                                        className="mt-1"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => {
                                                            if (!disabled) {
                                                                setSelectedLeaseContractId(
                                                                    row.leaseContractId,
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {row.clientName}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {row.contractNumber}
                                                            </span>
                                                            <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                                                                {contractStatusLabel(
                                                                    row.status,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                            {dateRangeLabel(row)}
                                                            {row.location
                                                                ? ` · ${row.location}`
                                                                : ""}
                                                        </p>
                                                        <p className="mt-1 text-xs font-medium text-gray-700">
                                                            {row.allocatedCount}{" "}
                                                            of{" "}
                                                            {row.committedQuantity}{" "}
                                                            assigned
                                                            {!disabled ? (
                                                                <span className="text-[#FE5720]">
                                                                    {" "}
                                                                    ·{" "}
                                                                    {
                                                                        row.remainingToAssign
                                                                    }{" "}
                                                                    to assign
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">
                                                                    {" "}
                                                                    · fully
                                                                    assigned
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div className="mt-3 grid gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="handover-date"
                                    className="mb-1 block text-xs font-semibold text-gray-700"
                                >
                                    Handover date *
                                </label>
                                <input
                                    id="handover-date"
                                    type="date"
                                    max={localTodayIsoDate()}
                                    value={handoverDate}
                                    onChange={(event) =>
                                        setHandoverDate(event.target.value)
                                    }
                                    className="h-9 w-full rounded-md border border-gray-300 px-2 text-xs"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="handover-odometer"
                                    className="mb-1 block text-xs font-semibold text-gray-700"
                                >
                                    Odometer at handover *
                                </label>
                                <RestrictedInput
                                    id="handover-odometer"
                                    restrictedKind="digits"
                                    maxLength={
                                        ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.odometerAtHandoverMaxDigits
                                    }
                                    value={odometerAtHandover}
                                    onChange={(value) =>
                                        setOdometerAtHandover(value)
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="handover-location"
                                    className="mb-1 block text-xs font-semibold text-gray-700"
                                >
                                    Handover location
                                    <span className="ml-1 font-normal text-gray-400">
                                        (optional)
                                    </span>
                                </label>
                                <RestrictedInput
                                    id="handover-location"
                                    restrictedKind="text"
                                    maxLength={
                                        ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.handoverLocation
                                    }
                                    value={handoverLocation}
                                    onChange={setHandoverLocation}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="assign-notes"
                                    className="mb-1 block text-xs font-semibold text-gray-700"
                                >
                                    Notes
                                    <span className="ml-1 font-normal text-gray-400">
                                        (optional)
                                    </span>
                                </label>
                                <textarea
                                    id="assign-notes"
                                    maxLength={
                                        ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.notes
                                    }
                                    value={assignNotes}
                                    onChange={(event) =>
                                        setAssignNotes(
                                            sanitizeTextValue(
                                                event.target.value,
                                                ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.notes,
                                            ),
                                        )
                                    }
                                    rows={3}
                                    placeholder="Handover or assignment notes"
                                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                                />
                            </div>
                        </div>
                            </>
                    )}
                </section>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
                    <Link href={ASSET_ASSIGN_LIST_HREF}>
                    <Button
                        type="button"
                        variant="neutral"
                            className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700"
                    >
                            Back to list
                    </Button>
                    </Link>
                    <Button
                        type="button"
                        variant="primary"
                        disabled={!canSubmit || assignMutation.isPending}
                        onClick={() => setConfirmOpen(true)}
                        className="h-8 px-5 text-xs font-medium disabled:cursor-not-allowed"
                    >
                        {selectedContract
                            ? `Assign to ${selectedContract.contractNumber}`
                            : "Assign to contract"}
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title="Assign vehicle to lease?"
                message={
                    selectedContract
                        ? `This will assign ${vehicle.fleetCode} to ${selectedContract.contractNumber} (${selectedContract.clientName}) with handover on ${handoverDate || "—"}.`
                        : "Select a contract with open capacity."
                }
                confirmLabel="Assign"
                confirmDisabled={!canSubmit}
                isConfirmPending={assignMutation.isPending}
                onConfirm={() => assignMutation.mutate()}
            />
        </div>
    );
}
