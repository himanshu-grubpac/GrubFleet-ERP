// CreateClientPage.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationAddressForm, {
    type OrganizationAddress,
} from "@/components/common/OrganizationAddressForm";
import {
    hasValidationErrors,
    validateEmail,
    validateOrganizationAddress,
    validatePhone,
    type OrganizationValidationErrors,
} from "@/components/common/OrganizationValidation";
import { ORGANISATION_CLIENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";

export type PointOfContact = {
    id: string;
    name: string;
    contactNumber: string;
    email: string;
    isPrimary: boolean;
};

export type ClientFormData = {
    companyName: string;
    address: OrganizationAddress;
    pointsOfContact: PointOfContact[];
};

type CreateClientFormProps = {
    onCancel?: () => void;

    onSaved?: (
        client: ClientFormData
    ) => void | Promise<void>;

    initialData?: Partial<ClientFormData>;

    /** When embedded in another flow (e.g. lease wizard), skip page shell layout. */
    variant?: "standalone" | "embedded";
};

const createEmptyContact = (
    isPrimary = false
): PointOfContact => ({
    id: crypto.randomUUID(),
    name: "",
    contactNumber: "",
    email: "",
    isPrimary,
});

export default function CreateClientPage({
    onCancel,
    onSaved,
    initialData,
    variant = "standalone",
}: CreateClientFormProps) {
    const router = useRouter();

    const isEditMode = Boolean(initialData);

    const [companyName, setCompanyName] = useState(
        initialData?.companyName ?? ""
    );

    const [address, setAddress] =
        useState<OrganizationAddress>({
            line1: initialData?.address?.line1 ?? "",
            line2: initialData?.address?.line2 ?? "",
            city: initialData?.address?.city ?? "",
            state: initialData?.address?.state ?? "",
            district: initialData?.address?.district ?? "",
            pincode: initialData?.address?.pincode ?? "",
            country: initialData?.address?.country ?? "",
        });

    const [pointsOfContact, setPointsOfContact] =
        useState<PointOfContact[]>(
            initialData?.pointsOfContact?.length
                ? initialData.pointsOfContact
                : [createEmptyContact(true)]
        );

    const [errors, setErrors] = useState<
        Record<string, string>
    >({});

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!initialData) {
            return;
        }

        setCompanyName(
            initialData.companyName ?? ""
        );

        setAddress({
            line1: initialData.address?.line1 ?? "",
            line2: initialData.address?.line2 ?? "",
            city: initialData.address?.city ?? "",
            state: initialData.address?.state ?? "",
            district: initialData.address?.district ?? "",
            pincode: initialData.address?.pincode ?? "",
            country: initialData.address?.country ?? "",
        });

        setPointsOfContact(
            initialData.pointsOfContact?.length
                ? initialData.pointsOfContact
                : [createEmptyContact(true)]
        );
    }, [initialData]);

    const updateContact = (
        id: string,
        field: keyof PointOfContact,
        value: string | boolean
    ) => {
        setPointsOfContact((current) =>
            current.map((contact) =>
                contact.id === id
                    ? {
                        ...contact,
                        [field]: value,
                    }
                    : contact
            )
        );
    };

    const addContact = () => {
        setPointsOfContact((current) => [
            ...current,
            createEmptyContact(false),
        ]);
    };

    const removeContact = (id: string) => {
        setPointsOfContact((current) => {
            const filtered = current.filter(
                (contact) => contact.id !== id
            );

            if (filtered.length === 0) {
                return [createEmptyContact(true)];
            }

            if (
                !filtered.some(
                    (contact) => contact.isPrimary
                )
            ) {
                filtered[0] = {
                    ...filtered[0],
                    isPrimary: true,
                };
            }

            return filtered;
        });
    };

    const makePrimary = (id: string) => {
        setPointsOfContact((current) =>
            current.map((contact) => ({
                ...contact,
                isPrimary: contact.id === id,
            }))
        );
    };

    const validate = () => {
        const nextErrors: Record<string, string> =
            {};

        if (!companyName.trim()) {
            nextErrors.companyName =
                "Company name is required.";
        }

        const addressValidationErrors =
            validateOrganizationAddress(address);
        Object.entries(addressValidationErrors).forEach(
            ([field, message]) => {
                nextErrors[field] = message;
            },
        );

        pointsOfContact.forEach((contact, index) => {
            if (!contact.name.trim()) {
                nextErrors[`contact-${index}-name`] =
                    "Name is required.";
            }

            const phoneError = validatePhone(
                contact.contactNumber,
                "Contact number",
            );
            if (phoneError) {
                nextErrors[`contact-${index}-contactNumber`] =
                    phoneError;
            }

            const emailError = validateEmail(contact.email, "Email");
            if (emailError) {
                nextErrors[`contact-${index}-email`] = emailError;
            }
        });

        if (
            pointsOfContact.length > 1 &&
            !pointsOfContact.some(
                (contact) => contact.isPrimary
            )
        ) {
            nextErrors.primaryContact =
                "Select a primary contact.";
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    };

    const canSubmit = useMemo(() => {
        if (saving) {
            return false;
        }

        const draftErrors: OrganizationValidationErrors = {};

        if (!companyName.trim()) {
            draftErrors.companyName = "Company name is required.";
        }

        const addressValidationErrors =
            validateOrganizationAddress(address);
        Object.entries(addressValidationErrors).forEach(([field, message]) => {
            draftErrors[field] = message;
        });

        pointsOfContact.forEach((contact, index) => {
            if (!contact.name.trim()) {
                draftErrors[`contact-${index}-name`] = "Name is required.";
            }

            const phoneError = validatePhone(
                contact.contactNumber,
                "Contact number",
            );
            if (phoneError) {
                draftErrors[`contact-${index}-contactNumber`] = phoneError;
            }

            const emailError = validateEmail(contact.email, "Email");
            if (emailError) {
                draftErrors[`contact-${index}-email`] = emailError;
            }
        });

        if (
            pointsOfContact.length > 1 &&
            !pointsOfContact.some((contact) => contact.isPrimary)
        ) {
            draftErrors.primaryContact = "Select a primary contact.";
        }

        return !hasValidationErrors(draftErrors);
    }, [address, companyName, pointsOfContact, saving]);

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        setSaving(true);

        try {
            const payload: ClientFormData = {
                companyName: companyName.trim(),

                address: {
                    line1: address.line1.trim(),
                    line2: address.line2.trim(),
                    city: address.city.trim(),
                    state: address.state.trim(),
                    district: address.district.trim(),
                    pincode: address.pincode.trim(),
                    country: address.country.trim(),
                },

                pointsOfContact: pointsOfContact.map((contact) => ({
                    ...contact,
                    name: contact.name.trim(),
                    contactNumber: contact.contactNumber.trim(),
                    email: contact.email.trim(),
                    isPrimary:
                        pointsOfContact.length === 1
                            ? true
                            : contact.isPrimary,
                })),
            };

            if (onSaved) {
                await onSaved(payload);
            } else {
                router.push("/organization/clients");
            }
        } catch (error) {
            console.error("Failed to save client:", error);
        } finally {
            setSaving(false);
        }
    };

    const actionButtons = (
        <div className="flex items-center gap-3">
            <Button
                type="button"
                variant="outline"
                onClick={
                    onCancel ??
                    (() => router.push("/organization/clients"))
                }
                disabled={saving}
            >
                Cancel
            </Button>

            <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
            >
                {saving
                    ? "Saving..."
                    : isEditMode
                      ? "Save Changes"
                      : "Save Client"}
            </Button>
        </div>
    );

    const formBody = (
            <div className="space-y-6">
                {/* Company Information */}
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Client Information
                    </h2>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Company Name{" "}
                            <span className="text-red-500">
                                *
                            </span>
                        </label>

                        <RestrictedInput
                            restrictedKind="name"
                            maxLength={
                                ORGANISATION_CLIENT_INPUT_LIMITS.clientName
                            }
                            value={companyName}
                            onChange={setCompanyName}
                            placeholder="Enter company name"
                            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FE5720] ${errors.companyName
                                ? "border-red-500"
                                : "border-gray-300"
                                }`}
                        />

                        {errors.companyName && (
                            <p className="mt-1 text-xs text-red-500">
                                {
                                    errors.companyName
                                }
                            </p>
                        )}
                    </div>
                </section>

                {/* Address */}
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <OrganizationAddressForm
                        value={address}
                        onChange={setAddress}
                        errors={errors}
                        title="Address"
                        required
                    />
                </section>

                {/* Points of Contact */}
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">
                                Points of contact
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                Add the people who should
                                be contacted for this
                                client.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={addContact}
                        >
                            Add contact
                        </Button>
                    </div>

                    {errors.primaryContact && (
                        <p className="mt-3 text-xs text-red-500">
                            {
                                errors.primaryContact
                            }
                        </p>
                    )}

                    <div className="mt-5 space-y-4">
                        {pointsOfContact.map(
                            (contact, index) => (
                                <div
                                    key={contact.id}
                                    className="rounded-lg border border-gray-200 p-4"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-900">
                                            Contact{" "}
                                            {index + 1}
                                        </div>

                                        {pointsOfContact.length >
                                            1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeContact(
                                                            contact.id
                                                        )
                                                    }
                                                    className="text-xs text-gray-500 hover:text-red-500"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {/* Name */}
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                                Name{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>

                                            <RestrictedInput
                                                restrictedKind="name"
                                                maxLength={
                                                    ORGANISATION_CLIENT_INPUT_LIMITS.pocName
                                                }
                                                value={contact.name}
                                                onChange={(name) =>
                                                    updateContact(
                                                        contact.id,
                                                        "name",
                                                        name,
                                                    )
                                                }
                                                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FE5720] ${errors[
                                                    `contact-${index}-name`
                                                ]
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                                    }`}
                                                placeholder="Enter contact name"
                                            />

                                            {errors[
                                                `contact-${index}-name`
                                            ] && (
                                                    <p className="mt-1 text-xs text-red-500">
                                                        {
                                                            errors[
                                                            `contact-${index}-name`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                        </div>

                                        {/* Contact Number */}
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                                Contact number{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>

                                            <RestrictedInput
                                                restrictedKind="phone"
                                                maxLength={
                                                    ORGANISATION_CLIENT_INPUT_LIMITS.pocPhone
                                                }
                                                value={contact.contactNumber}
                                                onChange={(contactNumber) =>
                                                    updateContact(
                                                        contact.id,
                                                        "contactNumber",
                                                        contactNumber,
                                                    )
                                                }
                                                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FE5720] ${errors[
                                                    `contact-${index}-contactNumber`
                                                ]
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                                    }`}
                                                placeholder={getInternationalPhonePlaceholder()}
                                            />

                                            {errors[
                                                `contact-${index}-contactNumber`
                                            ] && (
                                                    <p className="mt-1 text-xs text-red-500">
                                                        {
                                                            errors[
                                                            `contact-${index}-contactNumber`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                                Email{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>

                                            <RestrictedInput
                                                restrictedKind="email"
                                                maxLength={
                                                    ORGANISATION_CLIENT_INPUT_LIMITS.pocEmail
                                                }
                                                value={contact.email}
                                                onChange={(email) =>
                                                    updateContact(
                                                        contact.id,
                                                        "email",
                                                        email,
                                                    )
                                                }
                                                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FE5720] ${errors[
                                                    `contact-${index}-email`
                                                ]
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                                    }`}
                                                placeholder="name@company.com"
                                            />

                                            {errors[
                                                `contact-${index}-email`
                                            ] && (
                                                    <p className="mt-1 text-xs text-red-500">
                                                        {
                                                            errors[
                                                            `contact-${index}-email`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                        </div>

                                        {pointsOfContact.length > 1 ? (
                                            <div className="flex items-center pt-7">
                                                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="radio"
                                                        name="primary-contact"
                                                        checked={
                                                            contact.isPrimary
                                                        }
                                                        onChange={() =>
                                                            makePrimary(
                                                                contact.id,
                                                            )
                                                        }
                                                        className="h-4 w-4 accent-[#FE5720]"
                                                    />
                                                    Primary
                                                </label>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>
            </div>
    );

    if (variant === "embedded") {
        return (
            <div className="space-y-4">
                {formBody}
                <div className="flex justify-end border-t border-slate-200 pt-4">
                    {actionButtons}
                </div>
            </div>
        );
    }

    return (
        <OrganizationFormLayout
            title={isEditMode ? "Edit Client" : "Add Client"}
            description="Shared customer register — selected from here at New Lease Contract (Flow 01) instead of typed in per contract"
            actions={actionButtons}
        >
            {formBody}
        </OrganizationFormLayout>
    );
}