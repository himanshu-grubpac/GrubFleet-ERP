"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
    Building2,
    MapPin,
    UserRound,
    Phone,
    Mail,
    Plus,
    Trash2,
    Loader2,
} from "lucide-react";

import { useGrubpacAuth } from "@/lib/auth-context";

interface PointOfContact {
    id: string;
    name: string;
    contactNumber: string;
    email: string;
    isPrimary: boolean;
}

interface CustomerRegistrationFormProps {
    onSuccess?: (customer: unknown) => void;
    onCancel?: () => void;
    redirectOnSuccess?: boolean;
}

export default function CustomerRegistrationForm({
    onSuccess,
    onCancel,
    redirectOnSuccess = true,
}: CustomerRegistrationFormProps) {
    const router = useRouter();
    const { token, organizationId } = useGrubpacAuth();

    // ============================================================
    // CUSTOMER STATE
    // ============================================================

    const [companyName, setCompanyName] = useState("");
    const [address, setAddress] = useState("");

    const [pointsOfContact, setPointsOfContact] = useState<
        PointOfContact[]
    >([
        {
            id: crypto.randomUUID(),
            name: "",
            contactNumber: "",
            email: "",
            isPrimary: true,
        },
    ]);

    // ============================================================
    // UI STATE
    // ============================================================

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // ============================================================
    // ADD CONTACT
    // ============================================================

    const addContact = () => {
        setFormError(null);

        setPointsOfContact((previous) => [
            ...previous,
            {
                id: crypto.randomUUID(),
                name: "",
                contactNumber: "",
                email: "",
                isPrimary: false,
            },
        ]);
    };

    // ============================================================
    // REMOVE CONTACT
    // ============================================================

    const removeContact = (id: string) => {
        if (pointsOfContact.length === 1) {
            setFormError(
                "At least one point of contact is required.",
            );
            return;
        }

        const contactToRemove =
            pointsOfContact.find(
                (contact) => contact.id === id,
            );

        const wasPrimary =
            contactToRemove?.isPrimary;

        const remainingContacts =
            pointsOfContact.filter(
                (contact) => contact.id !== id,
            );

        if (
            wasPrimary &&
            remainingContacts.length > 0
        ) {
            remainingContacts[0] = {
                ...remainingContacts[0],
                isPrimary: true,
            };
        }

        setPointsOfContact(
            remainingContacts,
        );

        setFormError(null);
    };

    // ============================================================
    // UPDATE CONTACT
    // ============================================================

    const updateContact = (
        id: string,
        patch: Partial<PointOfContact>,
    ) => {
        setFormError(null);

        setPointsOfContact((previous) =>
            previous.map((contact) =>
                contact.id === id
                    ? {
                        ...contact,
                        ...patch,
                    }
                    : contact,
            ),
        );
    };

    // ============================================================
    // SET PRIMARY CONTACT
    // ============================================================

    const setPrimaryContact = (
        id: string,
    ) => {
        setPointsOfContact((previous) =>
            previous.map((contact) => ({
                ...contact,
                isPrimary:
                    contact.id === id,
            })),
        );
    };

    // ============================================================
    // SUBMIT
    // ============================================================

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setFormError(null);
        setIsSuccess(false);

        // --------------------------------------------------------
        // AUTH VALIDATION
        // --------------------------------------------------------

        if (!token || !organizationId) {
            setFormError(
                "Authentication or organization information is missing.",
            );
            return;
        }

        // --------------------------------------------------------
        // COMPANY VALIDATION
        // --------------------------------------------------------

        if (!companyName.trim()) {
            setFormError(
                "Company name is required.",
            );
            return;
        }

        // Address is intentionally optional.

        // --------------------------------------------------------
        // CONTACT VALIDATION
        // --------------------------------------------------------

        if (pointsOfContact.length === 0) {
            setFormError(
                "At least one point of contact is required.",
            );
            return;
        }

        const primaryContacts =
            pointsOfContact.filter(
                (contact) =>
                    contact.isPrimary,
            );

        if (
            primaryContacts.length !== 1
        ) {
            setFormError(
                "Please select exactly one primary contact.",
            );
            return;
        }

        for (const contact of pointsOfContact) {
            if (!contact.name.trim()) {
                setFormError(
                    "All contacts must have a name.",
                );
                return;
            }

            if (
                !contact.contactNumber.trim()
            ) {
                setFormError(
                    `Contact number is required for ${contact.name ||
                    "all contacts"
                    }.`,
                );
                return;
            }

            if (!contact.email.trim()) {
                setFormError(
                    `Email is required for ${contact.name ||
                    "all contacts"
                    }.`,
                );
                return;
            }

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailPattern.test(
                    contact.email.trim(),
                )
            ) {
                setFormError(
                    `Please enter a valid email for ${contact.name}.`,
                );
                return;
            }
        }

        // --------------------------------------------------------
        // REQUEST BODY
        // --------------------------------------------------------

        const payload = {
            organizationId,
            companyName:
                companyName.trim(),
            address: address.trim(),

            pointsOfContact:
                pointsOfContact.map(
                    (contact) => ({
                        id: contact.id,
                        name: contact.name.trim(),
                        contactNumber:
                            contact.contactNumber.trim(),
                        email:
                            contact.email.trim(),
                        isPrimary:
                            contact.isPrimary,
                    }),
                ),
        };

        try {
            setIsSubmitting(true);

            const configuredBaseUrl =
                process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
                    /\/$/,
                    "",
                );

            if (!configuredBaseUrl) {
                throw new Error(
                    "NEXT_PUBLIC_API_BASE_URL is not configured.",
                );
            }

            const apiUrl =
                configuredBaseUrl.endsWith(
                    "/api/v1",
                )
                    ? `${configuredBaseUrl}/fleet-leasing/clients`
                    : `${configuredBaseUrl}/api/v1/fleet-leasing/clients`;

            const response =
                await fetch(apiUrl, {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${token}`,
                    },

                    body: JSON.stringify(
                        payload,
                    ),
                });

            const responseData =
                await response
                    .json()
                    .catch(() => null);

            if (!response.ok) {
                const message =
                    responseData?.message ||
                    responseData?.error ||
                    `Failed to create customer (${response.status})`;

                throw new Error(message);
            }

            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            setIsSuccess(true);

            onSuccess?.(responseData);

            if (!redirectOnSuccess) {
                return;
            }

            setCompanyName("");
            setAddress("");

            setPointsOfContact([
                {
                    id: crypto.randomUUID(),
                    name: "",
                    contactNumber: "",
                    email: "",
                    isPrimary: true,
                },
            ]);

            setTimeout(() => {
                router.push(
                    "/fleet-leasing/customers",
                );
            }, 800);
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : "Failed to create customer.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================================
    // CANCEL
    // ============================================================

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }

        router.push(
            "/fleet-leasing/customers",
        );
    };

    // ============================================================
    // UI
    // ============================================================

    return (
        <form onSubmit={handleSubmit} className="w-full">
                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

                        {/* HEADER */}

                        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">

                            <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
                                New client record
                            </h1>

                        </div>

                        {/* ==================================================
                          COMPANY INFORMATION
                        ================================================== */}

                        <div className="px-4 py-4 sm:px-5">

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                                {/* COMPANY NAME */}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Company name
                                    </label>

                                    <div className="relative mt-1.5">

                                        <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(event) =>
                                                setCompanyName(event.target.value)
                                            }
                                            placeholder="e.g. Meridian Logistics Pvt Ltd"
                                            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                        />

                                    </div>
                                </div>

                                {/* ADDRESS */}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Address
                                    </label>

                                    <div className="relative mt-1.5">

                                        <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(event) =>
                                                setAddress(event.target.value)
                                            }
                                            placeholder="Optional"
                                            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                        />

                                    </div>
                                </div>

                            </div>

                        </div>

                        {/* ==================================================
                            POINT OF CONTACT
                        ================================================== */}

                        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">

                            {/* POC HEADER */}

                            <div className="mb-2.5 flex items-center justify-between gap-3">

                                <h2 className="text-xs font-semibold text-slate-800 sm:text-sm">
                                    Point of contact
                                </h2>

                                <button
                                    type="button"
                                    onClick={
                                        addContact
                                    }
                                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#FE5720] transition hover:text-[#d94412] hover:underline"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add another POC
                                </button>

                            </div>

                            {/* ==================================================
                                POC TABLE
                            ================================================== */}

                            <div className="overflow-hidden rounded-md border border-slate-200">

                                {/* DESKTOP HEADERS */}

                                <div className="hidden grid-cols-[1.15fr_1.15fr_1.15fr_28px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 md:grid">

                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        Name
                                    </span>

                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        Contact number
                                    </span>

                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        Email
                                    </span>

                                    <span />

                                </div>

                                {/* CONTACTS */}

                                <div className="divide-y divide-slate-100">

                                    {pointsOfContact.map(
                                        (
                                            contact,
                                            index,
                                        ) => (
                                            <div
                                                key={
                                                    contact.id
                                                }
                                                className="px-3 py-3"
                                            >

                                                {/* MOBILE TITLE */}

                                                <div className="mb-2 flex items-center justify-between md:hidden">

                                                    <span className="text-xs font-semibold text-slate-700">
                                                        Point of Contact{" "}
                                                        {index +
                                                            1}
                                                    </span>

                                                    {pointsOfContact.length >
                                                        1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeContact(
                                                                        contact.id,
                                                                    )
                                                                }
                                                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}

                                                </div>

                                                {/* FIELDS */}

                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_1.15fr_1.15fr_28px] md:items-start md:gap-2">

                                                    {/* NAME */}

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-medium text-slate-500 md:hidden">
                                                            Name
                                                        </label>

                                                        <div className="relative">

                                                            <UserRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                                                            <input
                                                                type="text"
                                                                value={
                                                                    contact.name
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateContact(
                                                                        contact.id,
                                                                        {
                                                                            name: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Point of contact"
                                                                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                                            />

                                                        </div>
                                                    </div>

                                                    {/* CONTACT NUMBER */}

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-medium text-slate-500 md:hidden">
                                                            Contact number
                                                        </label>

                                                        <div className="relative">

                                                            <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                                                            <input
                                                                type="tel"
                                                                value={
                                                                    contact.contactNumber
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateContact(
                                                                        contact.id,
                                                                        {
                                                                            contactNumber:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Phone number"
                                                                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                                            />

                                                        </div>
                                                    </div>

                                                    {/* EMAIL */}

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-medium text-slate-500 md:hidden">
                                                            Email
                                                        </label>

                                                        <div className="relative">

                                                            <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                                                            <input
                                                                type="email"
                                                                value={
                                                                    contact.email
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateContact(
                                                                        contact.id,
                                                                        {
                                                                            email: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="name@company.com"
                                                                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                                            />

                                                        </div>
                                                    </div>

                                                    {/* DELETE */}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeContact(
                                                                contact.id,
                                                            )
                                                        }
                                                        disabled={
                                                            pointsOfContact.length ===
                                                            1
                                                        }
                                                        className="hidden h-8 w-7 items-center justify-center self-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                                                        title="Remove contact"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>

                                                </div>

                                                {/* ==================================================
                                                    PRIMARY POC
                                                    ONLY SHOWN AFTER ADDING
                                                    ANOTHER POC
                                                ================================================== */}

                                                {pointsOfContact.length >
                                                    1 && (
                                                        <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2">

                                                            <input
                                                                type="radio"
                                                                name="primaryContact"
                                                                checked={
                                                                    contact.isPrimary
                                                                }
                                                                onChange={() =>
                                                                    setPrimaryContact(
                                                                        contact.id,
                                                                    )
                                                                }
                                                                className="h-3.5 w-3.5 accent-[#FE5720]"
                                                            />

                                                            <span className="text-[11px] font-medium text-slate-600">
                                                                Primary POC
                                                            </span>

                                                        </label>
                                                    )}

                                            </div>
                                        ),
                                    )}

                                </div>

                            </div>

                            {/* BOTTOM ADD */}

                            <button
                                type="button"
                                onClick={
                                    addContact
                                }
                                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#FE5720] hover:underline"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add another POC
                            </button>

                        </div>

                        {/* ==================================================
                            ERROR
                        ================================================== */}

                        {formError && (
                            <div className="border-t border-red-100 bg-red-50 px-4 py-2.5 sm:px-5">
                                <p className="text-xs font-medium text-red-600">
                                    {formError}
                                </p>
                            </div>
                        )}

                        {/* ==================================================
                            ACTIONS
                        ================================================== */}

                        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:px-5">

                            <button
                                type="button"
                                onClick={
                                    handleCancel
                                }
                                disabled={
                                    isSubmitting
                                }
                                className="h-9 rounded-md border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    isSuccess
                                }
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#FE5720] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#e94d12] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                            >
                                {isSubmitting && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )}

                                {isSubmitting
                                    ? "Saving..."
                                    : "Save client"}
                            </button>

                        </div>

                    </section>

                    {/* ==================================================
                        INFORMATION NOTE
                    ================================================== */}

                    <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:px-5">

                        <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
                            This is the shared Customer /
                            Client Register in Organisation
                            (Flow 39) — one record per
                            client, reused across every
                            lease contract. A client can
                            carry several POCs, each with
                            their own name, contact number
                            and email; one is marked Primary
                            and is what&apos;s used by
                            default.
                        </p>

                    </div>

        </form>
    );
}