// CreateClientPage.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationAddressForm, {
    type OrganizationAddress,
} from "@/components/common/OrganizationAddressForm";

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

        if (!address.line1.trim()) {
            nextErrors.line1 =
                "Address Line 1 is required.";
        }

        if (!address.city.trim()) {
            nextErrors.city = "City is required.";
        }

        if (!address.state.trim()) {
            nextErrors.state = "State is required.";
        }

        if (!address.district.trim()) {
            nextErrors.district =
                "District is required.";
        }

        if (!address.pincode.trim()) {
            nextErrors.pincode =
                "Pincode is required.";
        } else if (
            !/^\d{6}$/.test(address.pincode)
        ) {
            nextErrors.pincode =
                "Pincode must be 6 digits.";
        }

        pointsOfContact.forEach((contact, index) => {
            if (!contact.name.trim()) {
                nextErrors[`contact-${index}-name`] =
                    "Name is required.";
            }

            if (!contact.contactNumber.trim()) {
                nextErrors[
                    `contact-${index}-contactNumber`
                ] = "Contact number is required.";
            }

            if (!contact.email.trim()) {
                nextErrors[
                    `contact-${index}-email`
                ] = "Email is required.";
            }
        });

        if (
            pointsOfContact.length > 0 &&
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


                pointsOfContact:
                    pointsOfContact.map(
                        (contact) => ({
                            ...contact,
                            name: contact.name.trim(),
                            contactNumber:
                                contact.contactNumber.trim(),
                            email: contact.email.trim(),
                        })
                    ),
            };

            /*
             * API call can be added here later.
             *
             * Example:
             *
             * const savedClient =
             *     await createClientApi(payload);
             */

            const savedClient = payload;

            /*
             * When EditPage provides onSaved,
             * let EditPage handle navigation.
             *
             * Otherwise, behave like the normal
             * Create Client flow and return to
             * the Client dashboard.
             */
            if (onSaved) {
                await onSaved(savedClient);
            } else {
                router.push(
                    "/organization/clients"
                );
            }
        } catch (error) {
            console.error(
                "Failed to save client:",
                error
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrganizationFormLayout
            title={isEditMode ? "Edit Client" : "Add Client"}
            description="Shared customer register — selected from here at New Lease Contract (Flow 01) instead of typed in per contract"
            actions={
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="neutral"
                        onClick={
                            onCancel ??
                            (() =>
                                router.push(
                                    "/organization/clients"
                                ))
                        }
                        disabled={saving}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving
                            ? "Saving..."
                            : isEditMode
                                ? "Save Changes"
                                : "Save Client"}
                    </Button>
                </div>
            }
        >
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

                        <input
                            type="text"
                            value={companyName}
                            onChange={(event) =>
                                setCompanyName(
                                    event.target.value
                                )
                            }
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
                            variant="neutral"
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

                                            <input
                                                type="text"
                                                value={
                                                    contact.name
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateContact(
                                                        contact.id,
                                                        "name",
                                                        event
                                                            .target
                                                            .value
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

                                            <input
                                                type="text"
                                                value={
                                                    contact.contactNumber
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateContact(
                                                        contact.id,
                                                        "contactNumber",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FE5720] ${errors[
                                                    `contact-${index}-contactNumber`
                                                ]
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                                    }`}
                                                placeholder="+91 98765 43210"
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

                                            <input
                                                type="email"
                                                value={
                                                    contact.email
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateContact(
                                                        contact.id,
                                                        "email",
                                                        event
                                                            .target
                                                            .value
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

                                        {/* Primary */}
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
                                                            contact.id
                                                        )
                                                    }
                                                    className="h-4 w-4 accent-[#FE5720]"
                                                />

                                                Primary
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>
            </div>
        </OrganizationFormLayout>
    );
}