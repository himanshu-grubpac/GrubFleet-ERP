"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Mail,
    Phone,
    Plus,
    Trash2,
    UserRound,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

import OrganizationAddressForm, {
    type OrganizationAddress,
} from "@/components/common/OrganizationAddressForm";

import {
    validateOrganizationAddress,
    validateEmail,
    validatePhone,
    hasValidationErrors,
    type OrganizationValidationErrors,
} from "@/components/common/OrganizationValidation";

import { useAuth } from "@/providers/auth-provider";
import { ORGANISATION_CLIENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";
import { ApiClientError } from "@/lib/api/client";
import {
    buildClientPayloadFromForm,
    createOrganisationClientApi,
    organisationClientsQueryKey,
    updateOrganisationClientApi,
    type PointOfContact,
} from "@/lib/api/organisation/clients";
import {
    CLIENT_SAVE_ERROR,
    showClientCreatedToast,
    showClientUpdatedToast,
    showErrorToast,
} from "@/lib/toast/show-toast";

export type { PointOfContact };

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ClientFormData = {
    clientName: string;
    address: OrganizationAddress;
    pointsOfContact: PointOfContact[];
};

type CreateClientFormProps = {
    mode?: "create" | "edit";
    clientId?: string;
    onCancel?: () => void;
    onSaved?: () => void;
    initialData?: Partial<ClientFormData>;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const createEmptyContact = (
    isPrimary = false
): PointOfContact => ({
    id: crypto.randomUUID(),
    name: "",
    contactNumber: "",
    email: "",
    isPrimary,
});

function isClientFormValid(form: ClientFormData): boolean {
    if (!form.clientName.trim()) {
        return false;
    }

    const addressErrors = validateOrganizationAddress(form.address);
    if (hasValidationErrors(addressErrors)) {
        return false;
    }

    if (form.pointsOfContact.length === 0) {
        return false;
    }

    if (form.pointsOfContact.length > 1) {
        const primaryCount = form.pointsOfContact.filter(
            (contact) => contact.isPrimary,
        ).length;
        if (primaryCount !== 1) {
            return false;
        }
    }

    for (const contact of form.pointsOfContact) {
        if (!contact.name.trim()) {
            return false;
        }
        if (validatePhone(contact.contactNumber, "Contact number")) {
            return false;
        }
        if (validateEmail(contact.email, "Email")) {
            return false;
        }
    }

    return true;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateClientForm({
    mode = "create",
    clientId,
    onCancel,
    onSaved,
    initialData,
}: CreateClientFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canSave =
        mode === "edit"
            ? permissions.has("organisation.update") ||
              permissions.has("organisation.manage")
            : permissions.has("organisation.create") ||
              permissions.has("organisation.manage");

    const isEdit = mode === "edit";

    /* ---------------------------------------------------------------------- */
    /* Form State                                                              */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<ClientFormData>({
            clientName:
                initialData?.clientName ?? "",

            address: {
                line1:
                    initialData?.address?.line1 ??
                    "",

                line2:
                    initialData?.address?.line2 ??
                    "",

                city:
                    initialData?.address?.city ??
                    "",

                state:
                    initialData?.address?.state ??
                    "",

                district:
                    initialData?.address?.district ??
                    "",

                pincode:
                    initialData?.address?.pincode ??
                    "",

                country:
                    initialData?.address?.country ?? "IN",
            },

            pointsOfContact:
                initialData?.pointsOfContact?.length
                    ? initialData.pointsOfContact
                    : [createEmptyContact(true)],
        });

    /* ---------------------------------------------------------------------- */
    /* UI State                                                                */
    /* ---------------------------------------------------------------------- */

    const [
        validationErrors,
        setValidationErrors,
    ] =
        useState<OrganizationValidationErrors>(
            {}
        );

    const [
        error,
        setError,
    ] = useState("");

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* Update Form                                                             */
    /* ---------------------------------------------------------------------- */

    const updateForm = <
        K extends keyof ClientFormData
    >(
        key: K,
        value: ClientFormData[K]
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Update Contact                                                          */
    /* ---------------------------------------------------------------------- */

    const updateContact = (
        id: string,
        patch: Partial<PointOfContact>
    ) => {
        setForm((previous) => ({
            ...previous,

            pointsOfContact:
                previous.pointsOfContact.map(
                    (contact) =>
                        contact.id === id
                            ? {
                                ...contact,
                                ...patch,
                            }
                            : contact
                ),
        }));

        setError("");

        setValidationErrors(
            (previous) => {
                const next = {
                    ...previous,
                };

                delete next[
                    `contact.${id}`
                ];

                return next;
            }
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Add POC                                                                 */
    /* ---------------------------------------------------------------------- */

    const addContact = () => {
        setError("");

        /*
         * As soon as a second POC exists,
         * primary selection becomes visible.
         *
         * Existing primary remains primary.
         */
        setForm((previous) => ({
            ...previous,

            pointsOfContact: [
                ...previous.pointsOfContact,
                createEmptyContact(false),
            ],
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Remove POC                                                              */
    /* ---------------------------------------------------------------------- */

    const removeContact = (
        id: string
    ) => {
        if (
            form.pointsOfContact.length === 1
        ) {
            return;
        }

        const contactToRemove =
            form.pointsOfContact.find(
                (contact) =>
                    contact.id === id
            );

        const wasPrimary =
            contactToRemove?.isPrimary;

        let remainingContacts =
            form.pointsOfContact.filter(
                (contact) =>
                    contact.id !== id
            );

        /*
         * If the primary POC is removed,
         * automatically make the first
         * remaining POC primary.
         */
        if (
            wasPrimary &&
            remainingContacts.length > 0
        ) {
            remainingContacts =
                remainingContacts.map(
                    (contact, index) => ({
                        ...contact,
                        isPrimary:
                            index === 0,
                    })
                );
        }

        setForm((previous) => ({
            ...previous,
            pointsOfContact:
                remainingContacts,
        }));

        setError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Set Primary POC                                                        */
    /* ---------------------------------------------------------------------- */

    const setPrimaryContact = (
        id: string
    ) => {
        setForm((previous) => ({
            ...previous,

            pointsOfContact:
                previous.pointsOfContact.map(
                    (contact) => ({
                        ...contact,

                        isPrimary:
                            contact.id === id,
                    })
                ),
        }));

        setError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                  */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }

        router.push(
            "/organization/clients"
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");
        setValidationErrors({});

        const errors: OrganizationValidationErrors =
            {};

        /* ------------------------------------------------------------------ */
        /* Client name                                                         */
        /* ------------------------------------------------------------------ */

        if (!form.clientName.trim()) {
            errors.clientName = "Client name is required.";
        }

        /* ------------------------------------------------------------------ */
        /* Address                                                             */
        /* ------------------------------------------------------------------ */

        const addressErrors =
            validateOrganizationAddress(
                form.address
            );

        Object.entries(
            addressErrors
        ).forEach(
            ([field, message]) => {
                errors[
                    `address.${field}`
                ] = message;
            }
        );

        /* ------------------------------------------------------------------ */
        /* POC                                                                 */
        /* ------------------------------------------------------------------ */

        if (
            form.pointsOfContact.length ===
            0
        ) {
            errors.contacts =
                "At least one point of contact is required.";
        }

        /*
         * With one POC, it is automatically
         * primary.
         *
         * With multiple POCs, exactly one
         * must be primary.
         */
        if (
            form.pointsOfContact.length > 1
        ) {
            const primaryContacts =
                form.pointsOfContact.filter(
                    (contact) =>
                        contact.isPrimary
                );

            if (
                primaryContacts.length !== 1
            ) {
                errors.contacts =
                    "Please select exactly one primary POC.";
            }
        }

        /* ------------------------------------------------------------------ */
        /* Validate every POC                                                  */
        /* ------------------------------------------------------------------ */

        form.pointsOfContact.forEach(
            (contact, index) => {
                if (!contact.name.trim()) {
                    errors[
                        `contact.${contact.id}.name`
                    ] =
                        `POC ${index + 1} name is required.`;
                }

                const phoneError =
                    validatePhone(
                        contact.contactNumber,
                        "Contact number"
                    );

                if (phoneError) {
                    errors[
                        `contact.${contact.id}.contactNumber`
                    ] = phoneError;
                }

                const emailError =
                    validateEmail(
                        contact.email,
                        "Email"
                    );

                if (emailError) {
                    errors[
                        `contact.${contact.id}.email`
                    ] = emailError;
                }
            }
        );

        /* ------------------------------------------------------------------ */
        /* Set Errors                                                           */
        /* ------------------------------------------------------------------ */

        setValidationErrors(
            errors
        );

        if (
            hasValidationErrors(
                errors
            )
        ) {
            return;
        }

        if (!token || !organizationId) {
            setError("Organization context is required.");
            return;
        }

        if (!canSave) {
            setError("You do not have permission to save this client.");
            return;
        }

        const payload = buildClientPayloadFromForm({
            organizationId,
            clientName: form.clientName,
            address: {
                ...form.address,
                line1: form.address.line1.trim(),
                line2: form.address.line2.trim(),
                city: form.address.city.trim(),
                state: form.address.state.trim(),
                district: form.address.district.trim(),
                pincode: form.address.pincode.trim(),
                country: form.address.country.trim().toUpperCase(),
            },
            pointsOfContact: form.pointsOfContact.map((contact) => ({
                ...contact,
                name: contact.name.trim(),
                contactNumber: normalizePhoneForApi(contact.contactNumber),
                email: contact.email.trim().toLowerCase(),
                isPrimary: contact.isPrimary,
            })),
        });

        try {
            setIsSaving(true);

            const saved =
                isEdit && clientId
                    ? await updateOrganisationClientApi(
                          token,
                          organizationId,
                          clientId,
                          payload,
                      )
                    : await createOrganisationClientApi(token, payload);

            void queryClient.invalidateQueries({
                queryKey: organisationClientsQueryKey(organizationId),
            });

            if (isEdit) {
                showClientUpdatedToast(saved.clientName);
            } else {
                showClientCreatedToast(saved.clientName);
            }

            onSaved?.();

            router.push(
                isEdit
                    ? `/organization/clients/${saved.id}`
                    : "/organization/clients",
            );
        } catch (saveError) {
            const message =
                saveError instanceof ApiClientError
                    ? saveError.message
                    : saveError instanceof Error
                      ? saveError.message
                      : CLIENT_SAVE_ERROR;
            setError(message);
            showErrorToast(message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveMutationPending = isSaving;

    const isFormValid = useMemo(() => isClientFormValid(form), [form]);

    const canSubmit =
        canSave &&
        isFormValid &&
        !isAuthLoading &&
        !saveMutationPending;

    /* ---------------------------------------------------------------------- */
    /* Address Errors                                                          */
    /* ---------------------------------------------------------------------- */

    const addressErrors = {
        line1:
            validationErrors[
            "address.line1"
            ],

        line2:
            validationErrors[
            "address.line2"
            ],

        city:
            validationErrors[
            "address.city"
            ],

        state:
            validationErrors[
            "address.state"
            ],

        district:
            validationErrors[
            "address.district"
            ],

        pincode:
            validationErrors[
            "address.pincode"
            ],
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={isEdit ? "Edit Client" : "Add Client"}
            description="Register a client and their primary points of contact for lease contracts."
            backHref="/organization/clients"
            backLabel="Back to clients"
            tabs={[
                {
                    label: "Clients",
                    href: "/organization/clients",
                },
            ]}
            activeTab="/organization/clients"
            infoText="Organisation client register — one record per client with points of contact. When several contacts are listed, exactly one is marked Primary."
            actions={
                <>
                    {/* Cancel */}

                    <button
                        type="button"
                        onClick={
                            handleCancel
                        }
                        disabled={
                            isSaving
                        }
                        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    {/* Save */}

                    <Button
                        type="button"
                        onClick={
                            handleSave
                        }
                        disabled={
                            !canSubmit
                        }
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : "Save client"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* CLIENT NAME                                                  */}
            {/* ============================================================ */}

            <div>
                <label
                    htmlFor="client-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Client name
                    <span className="ml-1 text-red-500">*</span>
                </label>

                <RestrictedInput
                    id="client-name"
                    restrictedKind="name"
                    maxLength={ORGANISATION_CLIENT_INPUT_LIMITS.clientName}
                    value={form.clientName}
                    onChange={(value) => {
                        updateForm("clientName", value);
                        setError("");
                        setValidationErrors((previous) => {
                            const next = { ...previous };
                            delete next.clientName;
                            return next;
                        });
                    }}
                    placeholder="e.g. Coastal Retail Distribution"
                    className={
                        validationErrors.clientName
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                            : undefined
                    }
                    aria-invalid={validationErrors.clientName ? true : undefined}
                />

                {validationErrors.clientName && (
                    <p className="mt-1 text-xs text-red-500">
                        {validationErrors.clientName}
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* ADDRESS                                                        */}
            {/* ============================================================ */}

            <OrganizationAddressForm
                value={
                    form.address
                }
                onChange={(
                    address
                ) => {
                    setForm(
                        (
                            previous
                        ) => ({
                            ...previous,
                            address,
                        })
                    );

                    setError("");

                    setValidationErrors(
                        (previous) => {
                            const next =
                            {
                                ...previous,
                            };

                            delete next[
                                "address.line1"
                            ];

                            delete next[
                                "address.line2"
                            ];

                            delete next[
                                "address.city"
                            ];

                            delete next[
                                "address.state"
                            ];

                            delete next[
                                "address.district"
                            ];

                            delete next[
                                "address.pincode"
                            ];

                            return next;
                        }
                    );
                }}
                errors={
                    addressErrors
                }
                title="ADDRESS"
                required
            />

            {/* ============================================================ */}
            {/* POINT OF CONTACT                                              */}
            {/* ============================================================ */}

            <div className="mt-5 border-t border-gray-100 pt-4">

                <div className="mb-2.5 flex items-center justify-between">

                    <h3 className="text-xs font-semibold text-gray-700">
                        POINT OF CONTACT
                    </h3>

                    <button
                        type="button"
                        onClick={
                            addContact
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#FE5720] transition hover:text-[#d94412] hover:underline"
                    >
                        <Plus className="h-3.5 w-3.5" />

                        Add another POC
                    </button>

                </div>

                {/* POC Container */}

                <div className="overflow-hidden rounded-md border border-gray-200">

                    {/* Desktop headings */}

                    <div className="hidden grid-cols-[1.15fr_1.15fr_1.15fr_28px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 md:grid">

                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Name
                        </span>

                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Contact number
                        </span>

                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Email
                        </span>

                        <span />
                    </div>

                    {/* POC Rows */}

                    <div className="divide-y divide-gray-100">

                        {form.pointsOfContact.map(
                            (
                                contact,
                                index
                            ) => (
                                <div
                                    key={
                                        contact.id
                                    }
                                    className="px-3 py-3"
                                >

                                    {/* Mobile title */}

                                    <div className="mb-2 flex items-center justify-between md:hidden">

                                        <span className="text-xs font-semibold text-gray-700">
                                            Point of Contact{" "}
                                            {index +
                                                1}
                                        </span>

                                        {form
                                            .pointsOfContact
                                            .length >
                                            1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeContact(
                                                            contact.id
                                                        )
                                                    }
                                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                    </div>

                                    {/* Fields */}

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_1.15fr_1.15fr_28px] md:items-start md:gap-2">

                                        {/* Name */}

                                        <div>
                                            <label className="mb-1 block text-[10px] font-medium text-gray-500 md:hidden">
                                                Name
                                            </label>

                                            <div className="relative">

                                                <UserRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />

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
                                                            {
                                                                name: event
                                                                    .target
                                                                    .value,
                                                            }
                                                        )
                                                    }
                                                    placeholder="Point of contact"
                                                    className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-2.5 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                                />
                                            </div>

                                            {validationErrors[
                                                `contact.${contact.id}.name`
                                            ] && (
                                                    <p className="mt-1 text-[11px] text-red-500">
                                                        {
                                                            validationErrors[
                                                            `contact.${contact.id}.name`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                        </div>

                                        {/* Contact number */}

                                        <div>
                                            <label className="mb-1 block text-[10px] font-medium text-gray-500 md:hidden">
                                                Contact number
                                            </label>

                                            <div className="relative">

                                                <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />

                                                <input
                                                    type="tel"
                                                    value={
                                                        contact.contactNumber
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateContact(
                                                            contact.id,
                                                            {
                                                                contactNumber:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    placeholder={getInternationalPhonePlaceholder()}
                                                    className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-2.5 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                                />
                                            </div>

                                            {validationErrors[
                                                `contact.${contact.id}.contactNumber`
                                            ] && (
                                                    <p className="mt-1 text-[11px] text-red-500">
                                                        {
                                                            validationErrors[
                                                            `contact.${contact.id}.contactNumber`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                        </div>

                                        {/* Email */}

                                        <div>
                                            <label className="mb-1 block text-[10px] font-medium text-gray-500 md:hidden">
                                                Email
                                            </label>

                                            <div className="relative">

                                                <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />

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
                                                            {
                                                                email: event
                                                                    .target
                                                                    .value,
                                                            }
                                                        )
                                                    }
                                                    placeholder="name@company.com"
                                                    className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-2.5 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm"
                                                />
                                            </div>

                                            {validationErrors[
                                                `contact.${contact.id}.email`
                                            ] && (
                                                    <p className="mt-1 text-[11px] text-red-500">
                                                        {
                                                            validationErrors[
                                                            `contact.${contact.id}.email`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                        </div>

                                        {/* Delete */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeContact(
                                                    contact.id
                                                )
                                            }
                                            disabled={
                                                form
                                                    .pointsOfContact
                                                    .length ===
                                                1
                                            }
                                            className="hidden h-8 w-7 items-center justify-center self-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                                            title="Remove contact"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* ======================================================== */}
                                    {/* PRIMARY POC                                              */}
                                    {/* ======================================================== */}

                                    {form
                                        .pointsOfContact
                                        .length >
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
                                                            contact.id
                                                        )
                                                    }
                                                    className="h-3.5 w-3.5 accent-[#FE5720]"
                                                />

                                                <span className="text-[11px] font-medium text-gray-600">
                                                    Primary POC
                                                </span>
                                            </label>
                                        )}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {validationErrors.contacts && (
                    <p className="mt-1 text-xs text-red-500">
                        {
                            validationErrors.contacts
                        }
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* GENERAL ERROR                                                  */}
            {/* ============================================================ */}

            {error && (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}