"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { useAuth } from "@/providers/auth-provider";
import { fetchOrganisationSupplierTypesApi } from "@/lib/api/organisation/suppliers";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { ORGANISATION_SUPPLIER_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { DEFAULT_COUNTRY_CODE } from "@/lib/geo/countries";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";
import {
    showErrorToast,
    SUPPLIER_SAVE_ERROR,
} from "@/lib/toast/show-toast";

import OrganizationAddressForm, {
    type OrganizationAddress,
} from "@/components/common/OrganizationAddressForm";
import SupplierTypeSelector from "@/components/modules/organization/suppliers/SupplierTypeSelector";

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
function collectSupplierValidationErrors(
    form: SupplierFormData,
): OrganizationValidationErrors {
    const errors: OrganizationValidationErrors = {};

    if (!form.name.trim()) {
        errors.name = "Supplier / company name is required.";
    }

    if (!form.type.trim()) {
        errors.type = "Please select a supplier type.";
    }

    if (!form.contactPerson.trim()) {
        errors.contactPerson = "Contact person is required.";
    }

    const phoneError = validatePhone(form.phone, "Phone number");
    if (phoneError) {
        errors.phone = phoneError;
    }

    const emailError = validateEmail(form.email, "Email");
    if (emailError) {
        errors.email = emailError;
    }

    const addressErrors = validateOrganizationAddress(form.address);
    Object.entries(addressErrors).forEach(([field, message]) => {
        errors[`address.${field}`] = message;
    });

    return errors;
}

function isSupplierFormValid(form: SupplierFormData): boolean {
    return !hasValidationErrors(collectSupplierValidationErrors(form));
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateSupplierForm({
    mode = "create",
    onSaved,
    initialData,
}: CreateSupplierFormProps) {
    const router = useRouter();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();
    const isEditMode = mode === "edit";

    const canSave = isEditMode
        ? permissions.has("organisation.update") ||
          permissions.has("organisation.manage")
        : permissions.has("organisation.create") ||
          permissions.has("organisation.manage");

    const contactPhonePlaceholder = getInternationalPhonePlaceholder();

    const supplierTypesQuery = useQuery({
        queryKey: ["organization", "supplier-types", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationSupplierTypesApi(token, organizationId);
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardCatalogQueryOptions,
    });

    const supplierTypeOptions =
        supplierTypesQuery.data?.items ?? [];

    const handleCancel = () => {
        router.push("/organization/suppliers");
    };

    /* ---------------------------------------------------------------------- */
    /* Form                                                                    */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<SupplierFormData>({
            name:
                initialData?.name ?? "",

            type:
                initialData?.type ?? "",

            contactPerson:
                initialData?.contactPerson ?? "",

            phone:
                initialData?.phone ?? "",

            email:
                initialData?.email ?? "",

            agreementReference:
                initialData?.agreementReference ?? "",

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
                    DEFAULT_COUNTRY_CODE,
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

    const isFormValid = useMemo(
        () => isSupplierFormValid(form),
        [form],
    );

    const typesReady =
        !supplierTypesQuery.isLoading && supplierTypeOptions.length > 0;

    const canSubmit =
        canSave && isFormValid && !isSaving && typesReady;

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
    /* Save Supplier                                                          */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");
        setValidationErrors({});

        const errors = collectSupplierValidationErrors(form);
        setValidationErrors(errors);

        if (hasValidationErrors(errors) || !canSubmit) {
            return;
        }

        /* ------------------------------------------------------------------ */
        /* Save                                                                */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            onSaved?.({
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
                        form.address.country.trim().toUpperCase(),
                },
            });
        } catch (saveError) {
            const message =
                saveError instanceof Error
                    ? saveError.message
                    : SUPPLIER_SAVE_ERROR;
            setError(message);
            showErrorToast(message);
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
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={mode === "edit" ? "Edit Supplier" : "Add Supplier"}
            description="Register a vehicle, spare-parts, driver-staffing, or compliance-authority (insurance/RTO) supplier."
            backHref="/organization/suppliers"
            backLabel="Back to suppliers"
            tabs={[
                {
                    label: "Suppliers",
                    href: "/organization/suppliers",
                },
            ]}
            activeTab="/organization/suppliers"
            infoText="This is the shared Supplier Register — one record per supplier, reused across Asset Management (vehicle procurement, and insurance/RTO contacts on Compliance & Renewals) and Inventory (parts stock receipt). Link drivers or parts to this supplier from their own registers."
            actions={
                <>
                    {/* Cancel */}

                    <button
                        type="button"
                        onClick={handleCancel}
                        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>

                    {/* Save */}

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSubmit}
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : mode === "edit"
                              ? "Save changes"
                              : "Save supplier"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* SUPPLIER TYPE                                                 */}
            {/* ============================================================ */}

            <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                    SUPPLIER TYPE

                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                {supplierTypesQuery.isLoading ? (
                    <div
                        className="h-9 w-full max-w-md animate-pulse rounded-md bg-gray-100"
                        aria-busy="true"
                    />
                ) : supplierTypesQuery.isError ? (
                    <p className="text-xs text-red-600" role="alert">
                        Failed to load supplier types.
                    </p>
                ) : (
                    <SupplierTypeSelector
                        value={form.type}
                        types={supplierTypeOptions}
                        onChange={(label) => {
                            updateForm("type", label);
                            setError("");
                            setValidationErrors((previous) => {
                                const next = { ...previous };
                                delete next.type;
                                return next;
                            });
                        }}
                    />
                )}

                {validationErrors.type && (
                    <p className="mt-1 text-xs text-red-500">
                        {
                            validationErrors.type
                        }
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* SUPPLIER / COMPANY NAME                                      */}
            {/* ============================================================ */}

            <div className="mt-4">
                <label
                    htmlFor="supplier-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Supplier / company name

                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <RestrictedInput
                    id="supplier-name"
                    restrictedKind="name"
                    maxLength={ORGANISATION_SUPPLIER_INPUT_LIMITS.name}
                    value={form.name}
                    onChange={(value) => {
                        updateForm("name", value);
                        setError("");
                        setValidationErrors((previous) => {
                            const next = { ...previous };
                            delete next.name;
                            return next;
                        });
                    }}
                    placeholder="Enter supplier / company name"
                    aria-invalid={Boolean(validationErrors.name)}
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
            {/* CONTACT PERSON                                               */}
            {/* ============================================================ */}

            <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Contact person

                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <RestrictedInput
                    restrictedKind="name"
                    maxLength={
                        ORGANISATION_SUPPLIER_INPUT_LIMITS.contactPerson
                    }
                    value={form.contactPerson}
                    onChange={(value) => {
                        updateForm("contactPerson", value);
                        setError("");
                        setValidationErrors((previous) => {
                            const next = { ...previous };
                            delete next.contactPerson;
                            return next;
                        });
                    }}
                    placeholder="e.g. Imran Qureshi"
                    aria-invalid={Boolean(validationErrors.contactPerson)}
                    className={[
                        "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",
                        validationErrors.contactPerson
                            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                    ].join(" ")}
                />

                {validationErrors.contactPerson && (
                    <p className="mt-1 text-xs text-red-500">
                        {validationErrors.contactPerson}
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* CONTACT PERSON PHONE + EMAIL                                 */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Contact person phone

                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <RestrictedInput
                        restrictedKind="phone"
                        maxLength={ORGANISATION_SUPPLIER_INPUT_LIMITS.phone}
                        value={form.phone}
                        onChange={(value) => {
                            updateForm("phone", value);
                            setError("");
                            setValidationErrors((previous) => {
                                const next = { ...previous };
                                delete next.phone;
                                return next;
                            });
                        }}
                        placeholder={contactPhonePlaceholder}
                        aria-invalid={Boolean(validationErrors.phone)}
                        className={[
                            "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",
                            validationErrors.phone
                                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                        ].join(" ")}
                    />

                    {validationErrors.phone && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.phone}
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Contact person email

                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <RestrictedInput
                        restrictedKind="email"
                        maxLength={ORGANISATION_SUPPLIER_INPUT_LIMITS.email}
                        value={form.email}
                        onChange={(value) => {
                            updateForm("email", value);
                            setError("");
                            setValidationErrors((previous) => {
                                const next = { ...previous };
                                delete next.email;
                                return next;
                            });
                        }}
                        placeholder="name@supplier.com"
                        aria-invalid={Boolean(validationErrors.email)}
                        className={[
                            "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",
                            validationErrors.email
                                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                        ].join(" ")}
                    />

                    {validationErrors.email && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.email}
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* AGREEMENT REFERENCE                                          */}
            {/* ============================================================ */}

            <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Agreement reference
                </label>

                <RestrictedInput
                    restrictedKind="text"
                    maxLength={
                        ORGANISATION_SUPPLIER_INPUT_LIMITS.agreementReference
                    }
                    value={form.agreementReference}
                    onChange={(value) => {
                        updateForm("agreementReference", value);
                    }}
                    placeholder="e.g. AGR-2026-0142 (optional)"
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />
            </div>

            {/* ============================================================ */}
            {/* ADDRESS                                                      */}
            {/* ============================================================ */}

            <OrganizationAddressForm
                value={form.address}
                onChange={(address) => {
                    setForm((previous) => ({
                        ...previous,
                        address,
                    }));

                    setError("");

                    setValidationErrors(
                        (previous) => {
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