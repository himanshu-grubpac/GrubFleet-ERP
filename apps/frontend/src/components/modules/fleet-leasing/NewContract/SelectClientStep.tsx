"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useGrubpacAuth } from "@/lib/auth-context";

import {
    fetchFleetClients,
    type FleetClientListItem,
} from "@/lib/api/lease-contracts";

interface SelectClientStepProps {
    onClientSelected: (
        client: FleetClientListItem,
    ) => void;

    onAddNewClient: () => void;
}

export default function SelectClientStep({
    onClientSelected,
    onAddNewClient,
}: SelectClientStepProps) {
    const {
        token,
        organizationId,
    } = useGrubpacAuth();

    const [search, setSearch] = useState("");

    // ============================================================
    // GET CLIENTS
    // ============================================================

    const clientsQuery = useQuery({
        queryKey: [
            "fleet-leasing-clients",
            organizationId,
            search.trim(),
        ],

        queryFn: () => {
            if (
                !token ||
                !organizationId
            ) {
                throw new Error(
                    "Authentication or organization information is missing.",
                );
            }

            return fetchFleetClients(
                token,
                organizationId,
                {
                    search:
                        search.trim() ||
                        undefined,
                },
            );
        },

        enabled: Boolean(
            token &&
            organizationId,
        ),

        staleTime: 30_000,

        refetchOnWindowFocus: false,
    });

    // ============================================================
    // LOCAL SEARCH FILTER
    // ============================================================

    const filteredClients =
        useMemo(() => {
            const clients = clientsQuery.data?.items ?? [];
            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return clients;
            }

            return clients.filter(
                (client) =>
                    client.companyName
                        ?.toLowerCase()
                        .includes(
                            value,
                        ) ||
                    client.clientCode
                        ?.toLowerCase()
                        .includes(
                            value,
                        ),
            );
        }, [
            clientsQuery.data?.items,
            search,
        ]);

    return (
        <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                                Select client
                            </h1>

                            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                                Search by name, or pick from the list below.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onAddNewClient}
                            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#FE5720] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#e94d1c] focus:outline-none focus:ring-2 focus:ring-[#FE5720]/30 sm:w-auto sm:text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Add new client
                        </button>

                    </div>

                    {/* SEARCH */}

                    <div className="relative mb-4">

                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search clients by name..."
                            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10 placeholder:text-slate-400"
                        />

                    </div>

                    {/* =================================================
                        CLIENT TABLE
                    ================================================== */}

                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

                        {/* LOADING */}

                        {clientsQuery.isLoading && (
                            <div className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500">

                                <Loader2 className="h-4 w-4 animate-spin text-[#FE5720]" />

                                Loading clients...

                            </div>
                        )}

                        {/* ERROR */}

                        {clientsQuery.isError && (
                            <div className="px-5 py-10 text-center">

                                <p className="text-sm font-medium text-red-600">
                                    Failed to load clients.
                                </p>

                                <p className="mt-1.5 text-xs text-slate-500">
                                    {clientsQuery.error instanceof Error
                                        ? clientsQuery.error.message
                                        : "Please try again."}
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        clientsQuery.refetch()
                                    }
                                    className="mt-3 text-xs font-semibold text-[#FE5720] hover:underline"
                                >
                                    Try again
                                </button>

                            </div>
                        )}

                        {/* EMPTY */}

                        {!clientsQuery.isLoading &&
                            !clientsQuery.isError &&
                            filteredClients.length === 0 && (
                                <div className="flex min-h-[160px] flex-col items-center justify-center px-5 text-center">

                                    <p className="text-sm font-semibold text-slate-700">
                                        {search.trim()
                                            ? `No results match "${search.trim()}".`
                                            : "No clients found."}
                                    </p>

                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Add them as a new client to continue.
                                    </p>

                                </div>
                            )}

                        {/* TABLE */}

                        {!clientsQuery.isLoading &&
                            !clientsQuery.isError &&
                            filteredClients.length > 0 && (
                                <div className="w-full">

                                    {/* TABLE HEADER */}

                                    <div className="hidden grid-cols-[1.45fr_1fr_0.55fr] border-b border-slate-100 bg-slate-50 px-4 py-3 sm:grid">

                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Client
                                        </span>

                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Primary POC
                                        </span>

                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Contacts
                                        </span>

                                    </div>

                                    {/* TABLE ROWS */}

                                    {filteredClients.map(
                                        (client) => (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onClick={() =>
                                                    onClientSelected(
                                                        client,
                                                    )
                                                }
                                                className="grid w-full grid-cols-1 gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-orange-50/40 focus:bg-orange-50/40 focus:outline-none sm:grid-cols-[1.45fr_1fr_0.55fr] sm:items-center sm:gap-0 sm:py-3.5"
                                            >

                                                {/* CLIENT */}

                                                <div className="min-w-0">

                                                    <span className="block text-sm font-semibold text-slate-800 sm:truncate">
                                                        {client.companyName}
                                                    </span>

                                                    {client.clientCode && (
                                                        <span className="mt-0.5 block text-xs text-slate-400">
                                                            {client.clientCode}
                                                        </span>
                                                    )}

                                                </div>

                                                {/* PRIMARY POC */}

                                                <div className="flex items-center justify-between sm:block">

                                                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">
                                                        Primary POC
                                                    </span>

                                                    <span className="truncate text-sm text-slate-600">
                                                        —
                                                    </span>

                                                </div>

                                                {/* CONTACTS */}

                                                <div className="flex items-center justify-between sm:block">

                                                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">
                                                        Contacts
                                                    </span>

                                                    <span className="text-sm text-slate-600">
                                                        —
                                                    </span>

                                                </div>

                                            </button>
                                        ),
                                    )}

                                </div>
                            )}

                    </div>

        </>
    );
}