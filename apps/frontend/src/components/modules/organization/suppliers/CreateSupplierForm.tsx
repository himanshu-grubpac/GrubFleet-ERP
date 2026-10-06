"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
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

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type SupplierType = {
    id: string;
    name: string;
    isCustom: boolean;
    isUsed: boolean;
};

export type SupplierFormData = {
    name: string;
    type: string;
    contactPerson: string;
    phone: string;
    email: string;
    agreementReference: string;
    address: OrganizationAddress;
};

export type CreateSupplierFormProps = {
    mode?: "create" | "edit";
    initialData?: SupplierFormData;
    onCancel?: () => void;
    onSaved?: (
        data: SupplierFormData
    ) => void | Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Default Supplier Types                                                     */
/* -------------------------------------------------------------------------- */

const DEFAULT_SUPPLIER_TYPES: SupplierType[] = [
    {
        id: "vehicles",
        name: "Vehicles",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "parts",
        name: "Parts",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "drivers",
        name: "Drivers",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "compliance",
        name: "Compliance",
        isCustom: false,
        isUsed: false,
    },
];

/* -------------------------------------------------------------------------- */
/* Temporary Mock Data                                                        */
/* -------------------------------------------------------------------------- */

const MOCK_CUSTOM_SUPPLIER_TYPES: SupplierType[] = [];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateSupplierForm({
    onCancel,
    onSaved,
    initialData,
}: CreateSupplierFormProps) {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* Supplier Types                                                         */
    /* ---------------------------------------------------------------------- */

    const [
        customSupplierTypes,
        setCustomSupplierTypes,
    ] = useState<SupplierType[]>(
        MOCK_CUSTOM_SUPPLIER_TYPES
    );

    const [
        showAddType,
        setShowAddType,
    ] = useState(false);

    const [
        newType,
        setNewType,
    ] = useState("");

    const allSupplierTypes = [
        ...DEFAULT_SUPPLIER_TYPES,
        ...customSupplierTypes,
    ];

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }

        router.push("/organization/suppliers");
    };

    /* ---------------------------------------------------------------------- */
    /* Form                                                                    */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<SupplierFormData>({
            name:
                initialData?.name ??
                "",

            type:
                initialData?.type ??
                "",

            contactPerson:
                initialData?.contactPerson ??
                "",

            phone:
                initialData?.phone ??
                "",

            email:
                initialData?.email ??
                "",

            agreementReference:
                initialData?.agreementReference ??
                "",

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
                    initialData?.address?.country ??
                    "",
            },
        });

    /* ---------------------------------------------------------------------- */
    /* Validation / Save State                                                */
    /* ---------------------------------------------------------------------- */

    const [error, setError] =
        useState("");

    const [
        validationErrors,
        setValidationErrors,
    ] =
        useState<OrganizationValidationErrors>(
            {}
        );

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* General Form Update                                                    */
    /* ---------------------------------------------------------------------- */

    const updateForm = <
        K extends keyof SupplierFormData
    >(
        key: K,
        value: SupplierFormData[K]
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Add Supplier Type                                                      */
    /* ---------------------------------------------------------------------- */

    const handleAddType = () => {
        const trimmedName =
            newType.trim();

        if (!trimmedName) {
            return;
        }

        const alreadyExists =
            allSupplierTypes.some(
                (type) =>
                    type.name.toLowerCase() ===
                    trimmedName.toLowerCase()
            );

        if (alreadyExists) {
            setError(
                "This supplier type already exists."
            );

            return;
        }

        const customType: SupplierType = {
            id: `custom-${Date.now()}`,
            name: trimmedName,
            isCustom: true,
            isUsed: false,
        };

        setCustomSupplierTypes(
            (previous) => [
                ...previous,
                customType,
            ]
        );

        updateForm(
            "type",
            trimmedName
        );

        setNewType("");
        setShowAddType(false);
        setError("");

        setValidationErrors(
            (previous) => {
                const next = {
                    ...previous,
                };

                delete next.type;

                return next;
            }
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Delete Supplier Type                                                   */
    /* ---------------------------------------------------------------------- */

    const handleDeleteType = (
        type: SupplierType
    ) => {
        if (
            !type.isCustom ||
            type.isUsed
        ) {
            return;
        }

        if (
            form.type === type.name
        ) {
            updateForm(
                "type",
                ""
            );
        }

        setCustomSupplierTypes(
            (previous) =>
                previous.filter(
                    (item) =>
                        item.id !==
                        type.id
                )
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Save Supplier                                                           */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");
        setValidationErrors({});

        const errors: OrganizationValidationErrors =
            {};

        /* ------------------------------------------------------------------ */
        /* Supplier Name                                                      */
        /* ------------------------------------------------------------------ */

        if (!form.name.trim()) {
            errors.name =
                "Supplier / company name is required.";
        }

        /* ------------------------------------------------------------------ */
        /* Supplier Type                                                      */
        /* ------------------------------------------------------------------ */

        if (!form.type.trim()) {
            errors.type =
                "Please select a supplier type.";
        }

        /* ------------------------------------------------------------------ */
        /* Contact Person                                                     */
        /* ------------------------------------------------------------------ */

        if (!form.contactPerson.trim()) {
            errors.contactPerson =
                "Contact person is required.";
        }

        /* ------------------------------------------------------------------ */
        /* Phone                                                              */
        /* ------------------------------------------------------------------ */

        const phoneError =
            validatePhone(
                form.phone,
                "Phone number"
            );

        if (phoneError) {
            errors.phone =
                phoneError;
        }

        /* ------------------------------------------------------------------ */
        /* Email                                                              */
        /* ------------------------------------------------------------------ */

        const emailError =
            validateEmail(
                form.email,
                "Email"
            );

        if (emailError) {
            errors.email =
                emailError;
        }

        /* ------------------------------------------------------------------ */
        /* Address                                                            */
        /* ------------------------------------------------------------------ */

        const addressValidationErrors =
            validateOrganizationAddress(
                form.address
            );

        Object.entries(
            addressValidationErrors
        ).forEach(
            ([field, message]) => {
                errors[
                    `address.${field}`
                ] = message;
            }
        );

        /* ------------------------------------------------------------------ */
        /* Set Validation Errors                                              */
        /* ------------------------------------------------------------------ */

        setValidationErrors(
            errors
        );

        /* ------------------------------------------------------------------ */
        /* Stop if Invalid                                                    */
        /* ------------------------------------------------------------------ */

        if (
            hasValidationErrors(
                errors
            )
        ) {
            return;
        }

        /* ------------------------------------------------------------------ */
        /* Save                                                                */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            await onSaved?.({
                ...form,

                name:
                    form.name.trim(),

                type:
                    form.type.trim(),

                contactPerson:
                    form.contactPerson.trim(),

                phone:
                    form.phone.trim(),

                email:
                    form.email.trim(),

                agreementReference:
                    form.agreementReference.trim(),

                address: {
                    line1:
                        form.address.line1.trim(),

                    line2:
                        form.address.line2.trim(),

                    city:
                        form.address.city.trim(),

                    state:
                        form.address.state.trim(),

                    district:
                        form.address.district.trim(),

                    pincode:
                        form.address.pincode.trim(),

                    country:
                        form.address.country.trim(),
                },
            });
        } catch {
            setError(
                "Failed to save supplier."
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Address Error Mapping                                                  */
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

        country:
            validationErrors[
            "address.country"
            ],
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title="Add Supplier"
            description="Register a vehicle, spare-parts, driver-staffing, or compliance-authority (insurance/RTO) supplier."
            infoText="This is the shared Supplier Register — one record per supplier, reused across Asset Management (vehicle procurement, and insurance/RTO contacts on Compliance & Renewals) and Inventory (parts stock receipt). Link drivers or parts to this supplier from their own registers."
            actions={
                <>
                    {/* Cancel */}

                    <button
                        type="button"
                        onClick={
                            handleCancel
                        }
                        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
                            isSaving
                        }
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : "Save supplier"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* SUPPLIER / COMPANY NAME                                      */}
            {/* ============================================================ */}

            <div>
                <label
                    htmlFor="supplier-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Supplier / company name

                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <input
                    id="supplier-name"
                    type="text"
                    value={
                        form.name
                    }
                    onChange={(
                        event
                    ) => {
                        updateForm(
                            "name",
                            event.target
                                .value
                        );

                        setError("");

                        setValidationErrors(
                            (
                                previous
                            ) => {
                                const next = {
                                    ...previous,
                                };

                                delete next.name;

                                return next;
                            }
                        );
                    }}
                    placeholder="Enter supplier / company name"
                    className={[
                        "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition",

                        validationErrors.name
                            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                    ].join(" ")}
                />

                {validationErrors.name && (
                    <p className="mt-1 text-xs text-red-500">
                        {
                            validationErrors.name
                        }
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* SUPPLIER TYPE                                                 */}
            {/* ============================================================ */}

            <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                    SUPPLIER TYPE

                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                    {allSupplierTypes.map(
                        (type) => {
                            const selected =
                                form.type ===
                                type.name;

                            return (
                                <div
                                    key={
                                        type.id
                                    }
                                    className="relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateForm(
                                                "type",
                                                type.name
                                            );

                                            setError(
                                                ""
                                            );

                                            setValidationErrors(
                                                (
                                                    previous
                                                ) => {
                                                    const next =
                                                    {
                                                        ...previous,
                                                    };

                                                    delete next.type;

                                                    return next;
                                                }
                                            );
                                        }}
                                        className={[
                                            "h-9 rounded-md border px-4 text-sm font-semibold transition",

                                            selected
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                                        ].join(" ")}
                                    >
                                        {
                                            type.name
                                        }
                                    </button>

                                    {type.isCustom && (
                                        <button
                                            type="button"
                                            disabled={
                                                type.isUsed
                                            }
                                            onClick={() =>
                                                handleDeleteType(
                                                    type
                                                )
                                            }
                                            className={[
                                                "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm",

                                                type.isUsed
                                                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                                                    : "border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500",
                                            ].join(
                                                " "
                                            )}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        }
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            setShowAddType(
                                (
                                    previous
                                ) =>
                                    !previous
                            )
                        }
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
                    >
                        <Plus className="h-4 w-4" />
                        Add Type
                    </button>
                </div>

                {validationErrors.type && (
                    <p className="mt-1 text-xs text-red-500">
                        {
                            validationErrors.type
                        }
                    </p>
                )}

                {showAddType && (
                    <div className="mt-3 flex max-w-md items-center gap-2">
                        <input
                            type="text"
                            value={
                                newType
                            }
                            onChange={(
                                event
                            ) => {
                                setNewType(
                                    event
                                        .target
                                        .value
                                );

                                setError(
                                    ""
                                );
                            }}
                            onKeyDown={(
                                event
                            ) => {
                                if (
                                    event.key ===
                                    "Enter"
                                ) {
                                    event.preventDefault();

                                    handleAddType();
                                }
                            }}
                            autoFocus
                            placeholder="Enter new supplier type"
                            className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                        />

                        <Button
                            type="button"
                            onClick={
                                handleAddType
                            }
                            className="h-9 px-4"
                        >
                            Add
                        </Button>

                        <button
                            type="button"
                            onClick={() => {
                                setNewType(
                                    ""
                                );

                                setShowAddType(
                                    false
                                );
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* CONTACT PERSON + AGREEMENT                                   */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Contact Person */}

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Contact person

                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        type="text"
                        value={
                            form.contactPerson
                        }
                        onChange={(
                            event
                        ) => {
                            updateForm(
                                "contactPerson",
                                event.target
                                    .value
                            );

                            setError("");

                            setValidationErrors(
                                (
                                    previous
                                ) => {
                                    const next =
                                    {
                                        ...previous,
                                    };

                                    delete next.contactPerson;

                                    return next;
                                }
                            );
                        }}
                        placeholder="e.g. Imran Qureshi"
                        className={[
                            "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",

                            validationErrors.contactPerson
                                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                        ].join(" ")}
                    />

                    {validationErrors.contactPerson && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.contactPerson
                            }
                        </p>
                    )}
                </div>

                {/* Agreement Reference */}

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Agreement reference
                    </label>

                    <input
                        type="text"
                        value={
                            form.agreementReference
                        }
                        onChange={(
                            event
                        ) => {
                            updateForm(
                                "agreementReference",
                                event.target
                                    .value
                            );
                        }}
                        placeholder="e.g. AGR-2026-0142 (optional)"
                        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                    />
                </div>
            </div>

            {/* ============================================================ */}
            {/* SHARED ADDRESS                                                */}
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
                        (
                            previous
                        ) => {
                            const next = {
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

                            delete next[
                                "address.country"
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
            {/* CONTACT INFORMATION                                           */}
            {/* ============================================================ */}

            <div className="mt-5 border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-gray-700">
                    CONTACT INFORMATION
                </h3>

                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Phone */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Phone

                            <span className="ml-1 text-red-500">
                                *
                            </span>
                        </label>

                        <input
                            type="tel"
                            value={
                                form.phone
                            }
                            onChange={(
                                event
                            ) => {
                                updateForm(
                                    "phone",
                                    event.target
                                        .value
                                );

                                setError("");

                                setValidationErrors(
                                    (
                                        previous
                                    ) => {
                                        const next =
                                        {
                                            ...previous,
                                        };

                                        delete next.phone;

                                        return next;
                                    }
                                );
                            }}
                            placeholder="+91 98XXXXXXXX"
                            className={[
                                "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",

                                validationErrors.phone
                                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                    : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                            ].join(" ")}
                        />

                        {validationErrors.phone && (
                            <p className="mt-1 text-xs text-red-500">
                                {
                                    validationErrors.phone
                                }
                            </p>
                        )}
                    </div>

                    {/* Email */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email

                            <span className="ml-1 text-red-500">
                                *
                            </span>
                        </label>

                        <input
                            type="email"
                            value={
                                form.email
                            }
                            onChange={(
                                event
                            ) => {
                                updateForm(
                                    "email",
                                    event.target
                                        .value
                                );

                                setError("");

                                setValidationErrors(
                                    (
                                        previous
                                    ) => {
                                        const next =
                                        {
                                            ...previous,
                                        };

                                        delete next.email;

                                        return next;
                                    }
                                );
                            }}
                            placeholder="name@supplier.com"
                            className={[
                                "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",

                                validationErrors.email
                                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                    : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                            ].join(" ")}
                        />

                        {validationErrors.email && (
                            <p className="mt-1 text-xs text-red-500">
                                {
                                    validationErrors.email
                                }
                            </p>
                        )}
                    </div>
                </div>
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