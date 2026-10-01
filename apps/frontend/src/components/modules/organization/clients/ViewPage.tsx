"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Truck } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

type ClientStatus = "active" | "inactive";

type ClientContact = {
    id: string;
    name: string;
    phone: string;
    email: string;
    primary?: boolean;
};

type ClientContract = {
    id: string;
    contractNumber: string;
    startDate: string;
    endDate: string;
    status: "Active" | "Completed" | "Draft";
};

type Client = {
    id: string;
    companyName: string;
    address: string;
    status: ClientStatus;
    contacts: ClientContact[];
    contracts: ClientContract[];
};

/*
 * ============================================================
 * MOCK CLIENT DATA
 * ============================================================
 */

const mockClients: Client[] = [
    {
        id: "client-001",
        companyName: "Northgate Freight Services",
        address: "Vikhroli, Mumbai",
        status: "active",

        contacts: [
            {
                id: "contact-001",
                name: "Priya Menon",
                phone: "+91 99870 66123",
                email:
                    "priya.menon@northgatefreight.example",
                primary: true,
            },
        ],

        contracts: [],
    },

    {
        id: "client-002",
        companyName: "Metro Logistics Pvt. Ltd.",
        address: "Andheri East, Mumbai",
        status: "active",

        contacts: [
            {
                id: "contact-002",
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                email:
                    "rahul.sharma@metrologistics.example",
                primary: true,
            },
        ],

        contracts: [
            {
                id: "contract-001",
                contractNumber: "LC-2026-001",
                startDate: "01 Apr 2026",
                endDate: "31 Mar 2027",
                status: "Active",
            },
        ],
    },
];

/*
 * ============================================================
 * CLIENT VIEW PAGE
 * ============================================================
 */

export default function ViewPage() {
    const params = useParams();
    const router = useRouter();

    const clientId = params.id as string;

    /*
     * Find client from mock data.
     */

    const initialClient =
        mockClients.find(
            (client) => client.id === clientId,
        ) ?? mockClients[0];

    /*
     * Local state.
     *
     * Later this will be replaced with API data.
     */

    const [client, setClient] =
        useState<Client>(initialClient);

    /*
     * Deactivate modal
     */

    const [deactivateOpen, setDeactivateOpen] =
        useState(false);

    const [deactivateReason, setDeactivateReason] =
        useState("");

    const [statusError, setStatusError] =
        useState<string | null>(null);

    const isActive = client.status === "active";

    /*
     * ============================================================
     * EDIT
     * ============================================================
     */

    const handleEdit = () => {
        router.push(
            `/organization/clients/${clientId}/edit`,
        );
    };

    /*
     * ============================================================
     * ACTIVATE / DEACTIVATE
     * ============================================================
     */

    const handleToggleStatus = () => {
        setStatusError(null);

        /*
         * Active → open deactivate modal
         */

        if (client.status === "active") {
            setDeactivateOpen(true);
            return;
        }

        /*
         * Inactive → activate
         *
         * Mock for now.
         * API will be added later.
         */

        setClient((current) => ({
            ...current,
            status: "active",
        }));
    };

    /*
     * ============================================================
     * CONFIRM DEACTIVATE
     * ============================================================
     */

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();

        if (!reason) {
            setStatusError(
                "Please enter a deactivation reason.",
            );
            return;
        }

        /*
         * Mock status update.
         *
         * Later replace this with API call.
         */

        setClient((current) => ({
            ...current,
            status: "inactive",
        }));

        setDeactivateOpen(false);
        setDeactivateReason("");
        setStatusError(null);
    };

    /*
     * ============================================================
     * CANCEL DEACTIVATE
     * ============================================================
     */

    const handleCancelDeactivate = () => {
        setDeactivateOpen(false);
        setDeactivateReason("");
        setStatusError(null);
    };

    return (
        <div className="min-h-screen bg-[#f7f7f7]">



            {/* =====================================================
                Main Content
            ====================================================== */}

            <main className="px-6 py-3">

                {/* =================================================
                    Header
                ================================================== */}

                <div className="mb-3 flex items-center justify-between">

                    <h1 className="text-[15px] font-semibold text-gray-900">
                        {client.companyName}
                    </h1>

                    <div className="flex items-center gap-2">

                        {/* Edit */}

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleEdit}
                            disabled={!isActive}
                        >
                            Edit
                        </Button>

                        {/* Deactivate / Activate */}

                        <Button
                            type="button"
                            onClick={handleToggleStatus}
                        >
                            {isActive
                                ? "Deactivate"
                                : "Activate"}
                        </Button>

                    </div>

                </div>

                {/* =================================================
                    Client Summary
                ================================================== */}

                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">

                    <div className="grid grid-cols-2 gap-6">

                        {/* Address */}

                        <div>

                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                Address
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-900">
                                {client.address}
                            </p>

                        </div>

                        {/* Total Contracts */}

                        <div>

                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                Total Contracts
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-900">
                                {client.contracts.length}
                            </p>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    Points of Contact
                ================================================== */}

                <section className="mt-1">

                    <h2 className="text-[13px] font-semibold text-gray-900">
                        Points of contact
                    </h2>

                    <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">

                        {/* Table Header */}

                        <div className="grid grid-cols-[1.1fr_0.8fr_1.7fr_100px] border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">

                            <span>
                                Name
                            </span>

                            <span>
                                Contact number
                            </span>

                            <span>
                                Email
                            </span>

                            <span />

                        </div>

                        {/* Contact Rows */}

                        {client.contacts.length > 0 ? (

                            client.contacts.map(
                                (contact) => (
                                    <div
                                        key={contact.id}
                                        className="grid grid-cols-[1.1fr_0.8fr_1.7fr_100px] items-center px-4 py-3 text-xs"
                                    >

                                        <div className="font-semibold text-gray-900">
                                            {contact.name}
                                        </div>

                                        <div className="text-gray-600">
                                            {contact.phone}
                                        </div>

                                        <div className="text-gray-600">
                                            {contact.email}
                                        </div>

                                        <div className="flex justify-end">

                                            {contact.primary && (
                                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                                                    Primary
                                                </span>
                                            )}

                                        </div>

                                    </div>
                                ),
                            )

                        ) : (

                            <div className="px-4 py-5 text-xs text-gray-500">
                                No contacts available.
                            </div>

                        )}

                    </div>

                </section>

                {/* =================================================
                    Contract History
                ================================================== */}

                <section className="mt-2">

                    <h2 className="text-[13px] font-semibold text-gray-900">
                        Contract history
                    </h2>

                    {client.contracts.length === 0 ? (

                        <div className="mt-3 flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white">

                            <Truck className="mb-2 h-7 w-7 text-gray-400" />

                            <p className="text-xs font-semibold text-gray-900">
                                No contracts yet for this client
                            </p>

                            <p className="mt-1 text-[10px] text-gray-500">
                                Selectable from New Lease Contract
                                (Flow 01) whenever one starts.
                            </p>

                        </div>

                    ) : (

                        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">

                            <div className="grid grid-cols-5 border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">

                                <span>
                                    Contract
                                </span>

                                <span>
                                    Start date
                                </span>

                                <span>
                                    End date
                                </span>

                                <span>
                                    Status
                                </span>

                                <span />

                            </div>

                            {client.contracts.map(
                                (contract) => (
                                    <div
                                        key={contract.id}
                                        className="grid grid-cols-5 items-center px-4 py-3 text-xs"
                                    >

                                        <span className="font-semibold text-gray-900">
                                            {
                                                contract.contractNumber
                                            }
                                        </span>

                                        <span className="text-gray-600">
                                            {
                                                contract.startDate
                                            }
                                        </span>

                                        <span className="text-gray-600">
                                            {
                                                contract.endDate
                                            }
                                        </span>

                                        <span>

                                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                                                {
                                                    contract.status
                                                }
                                            </span>

                                        </span>

                                        <span className="text-right">

                                            <Link
                                                href={`/fleet-leasing/contracts/${contract.id}`}
                                                className="text-[#FE5720] hover:underline"
                                            >
                                                View
                                            </Link>

                                        </span>

                                    </div>
                                ),
                            )}

                        </div>

                    )}

                </section>

            </main>

            {/* =====================================================
                Deactivate Modal
            ====================================================== */}

            {deactivateOpen && (

                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">

                    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">

                        <h2 className="text-base font-semibold text-gray-900">
                            Deactivate{" "}
                            {client.companyName}?
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            This client will no longer be
                            available for new lease contracts.
                        </p>

                        <textarea
                            value={deactivateReason}
                            onChange={(event) => {
                                setDeactivateReason(
                                    event.target.value,
                                );

                                setStatusError(null);
                            }}
                            rows={3}
                            className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#FE5720]"
                            placeholder="Reason for deactivation"
                        />

                        {statusError && (
                            <p className="mt-2 text-sm text-red-600">
                                {statusError}
                            </p>
                        )}

                        <div className="mt-4 flex justify-end gap-2">

                            <button
                                type="button"
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={
                                    handleCancelDeactivate
                                }
                            >
                                Cancel
                            </button>

                            <Button
                                type="button"
                                onClick={handleDeactivate}
                            >
                                Deactivate
                            </Button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}