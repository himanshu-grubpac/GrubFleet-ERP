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

    const [search, setSearch] =
        useState("");

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

    const clients =
        clientsQuery.data
            ?.items ?? [];

    // ============================================================
    // LOCAL SEARCH FILTER
    // ============================================================

    const filteredClients =
        useMemo(() => {
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
            clients,
            search,
        ]);

    return (
        <div className="min-h-full bg-[#f5f5f5]">

            {/* =====================================================
                STEPPER
            ====================================================== */}

            <div className="border-b border-slate-200 bg-white px-6 py-3">
                <div className="mx-auto max-w-7xl">

                    <div className="mx-auto flex max-w-[420px] items-start justify-between">

                        <Step
                            number={1}
                            label="Client"
                            active
                        />

                        <StepConnector />

                        <Step
                            number={2}
                            label="Asset Lines"
                        />

                        <StepConnector />

                        <Step
                            number={3}
                            label="Terms"
                        />

                        <StepConnector />

                        <Step
                            number={4}
                            label="Review"
                        />

                    </div>
                </div>
            </div>

            {/* =====================================================
                CONTENT
            ====================================================== */}

            <main className="mx-auto max-w-7xl px-6 py-3">

                <div className="max-w-[662px]">

                    {/* HEADER */}

                    <div className="mb-4 flex items-start justify-between gap-4">

                        <div>
                            <h1 className="text-[15px] font-semibold text-slate-900">
                                Select client
                            </h1>

                            <p className="mt-0.5 text-[10px] text-slate-500">
                                Search by name, or pick from the list below.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                onAddNewClient
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2f6df6] px-3 text-[10px] font-semibold text-white transition hover:bg-[#255edb]"
                        >
                            <Plus className="h-3 w-3" />

                            Add new client
                        </button>

                    </div>

                    {/* SEARCH */}

                    <div className="relative mb-3">

                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(
                                event,
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Search clients by name..."
                            className="h-8 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2f6df6] focus:ring-1 focus:ring-[#2f6df6]/20"
                        />

                    </div>

                    {/* =================================================
                        CLIENT TABLE
                    ================================================== */}

                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">

                        {/* LOADING */}

                        {clientsQuery.isLoading && (
                            <div className="flex h-28 items-center justify-center gap-2 text-[10px] text-slate-500">

                                <Loader2 className="h-3.5 w-3.5 animate-spin" />

                                Loading clients...

                            </div>
                        )}

                        {/* ERROR */}

                        {clientsQuery.isError && (
                            <div className="px-4 py-8 text-center">

                                <p className="text-[10px] font-medium text-red-600">
                                    Failed to load clients.
                                </p>

                                <p className="mt-1 text-[9px] text-slate-500">
                                    {clientsQuery.error instanceof Error
                                        ? clientsQuery.error.message
                                        : "Please try again."}
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        clientsQuery.refetch()
                                    }
                                    className="mt-2 text-[9px] font-semibold text-[#FE5720] hover:underline"
                                >
                                    Try again
                                </button>

                            </div>
                        )}

                        {/* EMPTY */}

                        {!clientsQuery.isLoading &&
                            !clientsQuery.isError &&
                            filteredClients.length ===
                            0 && (
                                <div className="flex h-28 flex-col items-center justify-center">

                                    <p className="text-[10px] font-semibold text-slate-600">
                                        {search.trim()
                                            ? `No results match "${search.trim()}".`
                                            : "No clients found."}
                                    </p>

                                    <p className="mt-1 text-[9px] text-slate-400">
                                        Add them as a new client to continue.
                                    </p>

                                </div>
                            )}

                        {/* TABLE */}

                        {!clientsQuery.isLoading &&
                            !clientsQuery.isError &&
                            filteredClients.length >
                            0 && (
                                <>
                                    {/* TABLE HEADER */}

                                    <div className="grid grid-cols-[1.45fr_1fr_0.55fr] border-b border-slate-100 px-3 py-2">

                                        <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                            Client
                                        </span>

                                        <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                            Primary POC
                                        </span>

                                        <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                            Contacts
                                        </span>

                                    </div>

                                    {/* TABLE ROWS */}

                                    {filteredClients.map(
                                        (
                                            client,
                                        ) => (
                                            <button
                                                key={
                                                    client.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    onClientSelected(
                                                        client,
                                                    )
                                                }
                                                className="grid w-full grid-cols-[1.45fr_1fr_0.55fr] border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50"
                                            >

                                                {/* CLIENT */}

                                                <span className="truncate pr-3 text-[9px] font-medium text-slate-700">
                                                    {
                                                        client.companyName
                                                    }
                                                </span>

                                                {/* PRIMARY POC */}

                                                <span className="truncate pr-3 text-[9px] text-slate-600">
                                                    —
                                                </span>

                                                {/* CONTACTS */}

                                                <span className="text-[9px] text-slate-600">
                                                    —
                                                </span>

                                            </button>
                                        ),
                                    )}

                                </>
                            )}

                    </div>

                </div>

            </main>

        </div>
    );
}

/* ================================================================
   STEPPER
================================================================ */

function Step({
    number,
    label,
    active = false,
}: {
    number: number;
    label: string;
    active?: boolean;
}) {
    return (
        <div className="flex min-w-[55px] flex-col items-center">

            <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${active
                        ? "bg-[#2f6df6] text-white"
                        : "border border-slate-300 bg-white text-slate-400"
                    }`}
            >
                {number}
            </div>

            <span
                className={`mt-1 text-[8px] ${active
                        ? "font-semibold text-[#2f6df6]"
                        : "text-slate-400"
                    }`}
            >
                {label}
            </span>

        </div>
    );
}

/* ================================================================
   STEPPER CONNECTOR
================================================================ */

function StepConnector() {
    return (
        <div className="mt-[10px] h-px flex-1 bg-slate-200" />
    );
}