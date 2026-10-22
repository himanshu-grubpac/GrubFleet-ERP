"use client";

import type {
    BulkAssignCatalogClient,
    BulkAssignCatalogContract,
    BulkAssignCatalogLine,
} from "@/lib/api/asset-register/assignments";
import {
    contractDateRangeLabel,
    contractStatusLabel,
    lineStatusPill,
} from "./bulk-assign-wizard.util";

type ContractStepProps = {
    clients: BulkAssignCatalogClient[];
    clientsLoading: boolean;
    selectedClientId: string;
    onClientChange: (clientId: string) => void;
    contracts: BulkAssignCatalogContract[];
    contractsLoading: boolean;
    selectedContractId: string;
    onContractChange: (contractId: string) => void;
    selectedLineId: string;
    onLineChange: (lineId: string) => void;
};

export default function ContractStep({
    clients,
    clientsLoading,
    selectedClientId,
    onClientChange,
    contracts,
    contractsLoading,
    selectedContractId,
    onContractChange,
    selectedLineId,
    onLineChange,
}: ContractStepProps) {
    const selectedClient = clients.find(
        (c) => c.organisationClientId === selectedClientId,
    );

    const selectedContract = contracts.find(
        (c) => c.leaseContractId === selectedContractId,
    );

    const lines = selectedContract?.assetLines ?? [];

    return (
        <div className="space-y-5">
            <div>
                <label
                    htmlFor="bulk-assign-client"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    1 Client *
                </label>
                <select
                    id="bulk-assign-client"
                    value={selectedClientId}
                    onChange={(event) => onClientChange(event.target.value)}
                    disabled={clientsLoading}
                    className="h-9 w-full max-w-md rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800"
                >
                    <option value="">
                        {clientsLoading ? "Loading clients…" : "Select client"}
                    </option>
                    {clients.map((client) => (
                        <option
                            key={client.organisationClientId}
                            value={client.organisationClientId}
                        >
                            {client.clientName}
                        </option>
                    ))}
                </select>
                {selectedClient ? (
                    <p className="mt-1 text-xs text-gray-500">
                        {selectedClient.activeContractCount} active contract
                        {selectedClient.activeContractCount === 1 ? "" : "s"} ·{" "}
                        {selectedClient.openAssetClassLineCount} open asset-class
                        line
                        {selectedClient.openAssetClassLineCount === 1 ? "" : "s"}
                    </p>
                ) : null}
            </div>

            {selectedClientId ? (
                <div>
                    <h3 className="mb-2 text-xs font-semibold text-gray-700">
                        2 Lease contract
                    </h3>
                    <div className="max-h-[240px] overflow-y-auto rounded-lg border border-gray-200 bg-white">
                        {contractsLoading ? (
                            <p className="px-3 py-4 text-xs text-gray-500">
                                Loading contracts…
                            </p>
                        ) : contracts.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-gray-500">
                                No active contracts with open lines for this client.
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {contracts.map((row) => {
                                    const checked =
                                        selectedContractId === row.leaseContractId;
                                    const hasOpenLine = row.unitsStillToAssign > 0;
                                    return (
                                        <li key={row.leaseContractId}>
                                            <label
                                                className={`flex cursor-pointer gap-3 px-3 py-3 ${
                                                    !hasOpenLine
                                                        ? "cursor-not-allowed bg-gray-50 opacity-70"
                                                        : "hover:bg-orange-50/40"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="bulk-assign-contract"
                                                    className="mt-1"
                                                    checked={checked}
                                                    disabled={!hasOpenLine}
                                                    onChange={() => {
                                                        if (hasOpenLine) {
                                                            onContractChange(
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
                                                        {contractDateRangeLabel(row)}
                                                        {row.location
                                                            ? ` · ${row.location}`
                                                            : ""}
                                                        · {row.lineCount} line
                                                        {row.lineCount === 1
                                                            ? ""
                                                            : "s"}
                                                    </p>
                                                    <p className="mt-1 text-xs font-medium text-gray-700">
                                                        {row.unitsStillToAssign}{" "}
                                                        unit
                                                        {row.unitsStillToAssign === 1
                                                            ? ""
                                                            : "s"}{" "}
                                                        still to assign
                                                    </p>
                                                </div>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}

            {selectedContract ? (
                <div>
                    <h3 className="mb-2 text-xs font-semibold text-gray-700">
                        3 Asset-class line
                    </h3>
                    <p className="mb-2 text-xs text-gray-500">
                        Pick the line you&apos;re fulfilling for this batch.
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                        <table className="min-w-full text-left text-xs">
                            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2" />
                                    <th className="px-3 py-2">Asset class</th>
                                    <th className="px-3 py-2">Reserved</th>
                                    <th className="px-3 py-2">Assigned</th>
                                    <th className="px-3 py-2">To assign</th>
                                    <th className="px-3 py-2">Available now</th>
                                    <th className="px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {lines.map((line) => (
                                    <LineTableRow
                                        key={line.lineId}
                                        line={line}
                                        checked={selectedLineId === line.lineId}
                                        onSelect={() => onLineChange(line.lineId)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function LineTableRow({
    line,
    checked,
    onSelect,
}: {
    line: BulkAssignCatalogLine;
    checked: boolean;
    onSelect: () => void;
}) {
    const pill = lineStatusPill(line);
    const disabled = !line.selectable;

    return (
        <tr
            className={
                disabled ? "bg-gray-50 text-gray-400" : "hover:bg-orange-50/30"
            }
        >
            <td className="px-3 py-2">
                <input
                    type="radio"
                    name="bulk-assign-line"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                        if (!disabled) onSelect();
                    }}
                />
            </td>
            <td className="px-3 py-2 font-medium text-gray-800">
                {line.assetClassName}
            </td>
            <td className="px-3 py-2">{line.committedQuantity}</td>
            <td className="px-3 py-2">{line.allocatedCount}</td>
            <td className="px-3 py-2 font-semibold text-gray-900">
                {line.remainingToAssign}
            </td>
            <td className="px-3 py-2">{line.availableNow}</td>
            <td className="px-3 py-2">
                <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${pill.className}`}
                >
                    {pill.label}
                </span>
            </td>
        </tr>
    );
}
