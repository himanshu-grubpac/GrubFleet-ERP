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
    AlertCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
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

        const contactToRemove = pointsOfContact.find(
            (contact) => contact.id === id,
        );

        const wasPrimary = contactToRemove?.isPrimary;

        const remainingContacts = pointsOfContact.filter(
            (contact) => contact.id !== id,
        );

        // If primary contact was removed,
        // make the first remaining contact primary.
        if (wasPrimary && remainingContacts.length > 0) {
            remainingContacts[0] = {
                ...remainingContacts[0],
                isPrimary: true,
            };
        }

        setPointsOfContact(remainingContacts);
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

    const setPrimaryContact = (id: string) => {
        setPointsOfContact((previous) =>
            previous.map((contact) => ({
                ...contact,
                isPrimary: contact.id === id,
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
            setFormError("Company name is required.");
            return;
        }

        if (!address.trim()) {
            setFormError("Address is required.");
            return;
        }

        // --------------------------------------------------------
        // CONTACT VALIDATION
        // --------------------------------------------------------

        if (pointsOfContact.length === 0) {
            setFormError(
                "At least one point of contact is required.",
            );
            return;
        }

        const primaryContacts = pointsOfContact.filter(
            (contact) => contact.isPrimary,
        );

        if (primaryContacts.length !== 1) {
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

            if (!contact.contactNumber.trim()) {
                setFormError(
                    `Contact number is required for ${contact.name || "all contacts"}.`,
                );
                return;
            }

            if (!contact.email.trim()) {
                setFormError(
                    `Email is required for ${contact.name || "all contacts"}.`,
                );
                return;
            }

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(contact.email.trim())) {
                setFormError(
                    `Please enter a valid email for ${contact.name}.`,
                );
                return;
            }
        }

        // --------------------------------------------------------
        // REQUEST BODY
        // Exactly follows the Customer API structure.
        // --------------------------------------------------------

        const payload = {
            organizationId,
            companyName: companyName.trim(),
            address: address.trim(),

            pointsOfContact: pointsOfContact.map(
                (contact) => ({
                    id: contact.id,
                    name: contact.name.trim(),
                    contactNumber:
                        contact.contactNumber.trim(),
                    email: contact.email.trim(),
                    isPrimary: contact.isPrimary,
                }),
            ),
        };

        try {
            setIsSubmitting(true);

            // ----------------------------------------------------
            // API BASE URL
            //
            // Supports either:
            // NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
            //
            // or:
            // NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
            // ----------------------------------------------------

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
                configuredBaseUrl.endsWith("/api/v1")
                    ? `${configuredBaseUrl}/fleet-leasing/clients`
                    : `${configuredBaseUrl}/api/v1/fleet-leasing/clients`;

            // ----------------------------------------------------
            // POST /api/v1/fleet-leasing/clients
            // ----------------------------------------------------

            const response = await fetch(apiUrl, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify(payload),
            });

            const responseData = await response
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

            // Reset form
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

            // Redirect after successful creation
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
        router.push("/fleet-leasing/customers");
    };

    // ============================================================
    // UI
    // ============================================================

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6 pb-12"
        >
            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <div className="border-b border-slate-200 pb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Create Corporate Customer
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Register a corporate customer and its
                    points of contact.
                </p>
            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {formError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />

                    <span>{formError}</span>
                </div>
            )}

            {/* ==================================================
                SUCCESS
            ================================================== */}

            {isSuccess && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

                    <span>
                        Corporate customer created
                        successfully! Redirecting…
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* ==================================================
                    LEFT / MAIN COLUMN
                ================================================== */}

                <div className="space-y-6 lg:col-span-2">
                    {/* ==================================================
                        COMPANY INFORMATION
                    ================================================== */}

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Building2 className="h-5 w-5 text-[#FE5720]" />

                            <h2 className="text-base font-semibold text-slate-900">
                                Company Information
                            </h2>
                        </div>

                        <div className="mt-5 space-y-5">
                            {/* Company Name */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Company Name
                                    <span className="ml-1 text-red-500">
                                        *
                                    </span>
                                </label>

                                <div className="relative mt-1.5">
                                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(event) =>
                                            setCompanyName(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        placeholder="e.g. ABC Technologies Pvt. Ltd."
                                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Address
                                    <span className="ml-1 text-red-500">
                                        *
                                    </span>
                                </label>

                                <div className="relative mt-1.5">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                                    <textarea
                                        rows={4}
                                        value={address}
                                        onChange={(event) =>
                                            setAddress(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        placeholder="Enter the company's registered/business address"
                                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ==================================================
                        POINTS OF CONTACT
                    ================================================== */}

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <UserRound className="h-5 w-5 text-[#FE5720]" />

                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Points of Contact
                                    </h2>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Add the people who can be
                                        contacted for this
                                        customer.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addContact}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <Plus className="h-3.5 w-3.5" />

                                Add Contact
                            </button>
                        </div>

                        <div className="mt-5 space-y-4">
                            {pointsOfContact.map(
                                (contact, index) => (
                                    <div
                                        key={contact.id}
                                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-5"
                                    >
                                        {/* Contact Header */}
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                                                    {index + 1}
                                                </span>

                                                <span className="text-sm font-semibold text-slate-800">
                                                    Contact{" "}
                                                    {index +
                                                        1}
                                                </span>

                                                {contact.isPrimary && (
                                                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#FE5720]">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>

                                            {pointsOfContact.length >
                                                1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeContact(
                                                                contact.id,
                                                            )
                                                        }
                                                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                        title="Remove contact"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {/* Name */}
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Name
                                                    <span className="ml-1 text-red-500">
                                                        *
                                                    </span>
                                                </label>

                                                <div className="relative mt-1.5">
                                                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                                                        placeholder="Full name"
                                                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Contact Number */}
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Contact Number
                                                    <span className="ml-1 text-red-500">
                                                        *
                                                    </span>
                                                </label>

                                                <div className="relative mt-1.5">
                                                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                                                        placeholder="e.g. 9876543210"
                                                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Email
                                                    <span className="ml-1 text-red-500">
                                                        *
                                                    </span>
                                                </label>

                                                <div className="relative mt-1.5">
                                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                                                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Primary Contact */}
                                        <div className="mt-4 border-t border-slate-200 pt-4">
                                            <label className="flex cursor-pointer items-center gap-2">
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
                                                    className="h-4 w-4 border-slate-300 text-[#FE5720] focus:ring-[#FE5720]"
                                                />

                                                <span className="text-sm font-medium text-slate-700">
                                                    Primary
                                                    contact
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                </div>

                {/* ==================================================
                    RIGHT COLUMN
                ================================================== */}

                <div className="space-y-6">
                    {/* Registration Summary */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Customer Summary
                        </h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <p className="text-xs text-slate-400">
                                    Company
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                    {companyName ||
                                        "Not provided"}
                                </p>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-xs text-slate-400">
                                    Contacts
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                    {
                                        pointsOfContact.length
                                    }{" "}
                                    contact
                                    {pointsOfContact.length !==
                                        1
                                        ? "s"
                                        : ""}
                                </p>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-xs text-slate-400">
                                    Primary Contact
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                    {pointsOfContact.find(
                                        (contact) =>
                                            contact.isPrimary,
                                    )?.name ||
                                        "Not provided"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Organization info */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Organization
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                            The customer will automatically be
                            registered under the currently
                            authenticated organization.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={
                                isSubmitting ||
                                isSuccess
                            }
                            leftIcon={
                                isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : undefined
                            }
                            className="w-full justify-center bg-[#FE5720] text-white hover:bg-[#e94d1c]"
                        >
                            {isSubmitting
                                ? "Creating Customer…"
                                : "Create Corporate Customer"}
                        </Button>

                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}