"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { DRIVER_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { DEFAULT_COUNTRY_CODE } from "@/lib/geo/countries";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";
import { fetchOrganisationSuppliersApi } from "@/lib/api/organisation/suppliers";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useAuth } from "@/providers/auth-provider";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type DriverFormData = {
    name: string;
    cprNo: string;
    mobileNo: string;
    email: string;
    drivingLicenseNo: string;
    licenseExpiryDate: string;
    address: OrganizationAddress;
    supplier: string;
};

export type DriverFormMode = "create" | "edit";

type DriverFormProps = {
    mode: DriverFormMode;
    driverId?: string;
    onCancel?: () => void;
    onSaved?: (driver: DriverFormData) => void | Promise<void>;
    initialData?: Partial<DriverFormData>;
};

function collectDriverValidationErrors(
    form: DriverFormData,
): OrganizationValidationErrors {
    const errors: OrganizationValidationErrors = {};

    if (!form.name.trim()) {
        errors.name = "Driver name is required.";
    }

    if (!form.cprNo.trim()) {
        errors.cprNo = "CPR no. is required.";
    }

    const phoneError = validatePhone(form.mobileNo, "Mobile number");
    if (phoneError) {
        errors.mobileNo = phoneError;
    }

    const emailError = validateEmail(form.email, "Email");
    if (emailError) {
        errors.email = emailError;
    }

    if (!form.drivingLicenseNo.trim()) {
        errors.drivingLicenseNo = "Driving license no. is required.";
    }

    if (!form.licenseExpiryDate.trim()) {
        errors.licenseExpiryDate = "License expiry date is required.";
    }

    const addressValidationErrors = validateOrganizationAddress(form.address);
    Object.entries(addressValidationErrors).forEach(([field, message]) => {
        errors[`address.${field}`] = message;
    });

    if (!form.supplier.trim()) {
        errors.supplier = "Supplier is required.";
    }

    return errors;
}

function isDriverFormValid(form: DriverFormData): boolean {
    return !hasValidationErrors(collectDriverValidationErrors(form));
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DriverForm({
    mode,
    driverId,
    onCancel,
    onSaved,
    initialData,
}: DriverFormProps) {
    const router = useRouter();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();
    const mobilePlaceholder = getInternationalPhonePlaceholder();

    const driverSuppliersQuery = useQuery({
        queryKey: ["organization", "suppliers", "driver-picker", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationSuppliersApi(token, {
                organizationId,
                page: 1,
                pageSize: 50,
                supplierType: "driver",
                status: "active",
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
        staleTime: 60_000,
    });

    const driverSupplierOptions = driverSuppliersQuery.data?.items ?? [];
    const isEditMode = mode === "edit";
    const viewHref =
        isEditMode && driverId
            ? `/organization/driver-register/${driverId}`
            : "/organization/driver-register";

    /* ---------------------------------------------------------------------- */
    /* Form                                                                    */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<DriverFormData>({
        name: initialData?.name ?? "",
        cprNo: initialData?.cprNo ?? "",
        mobileNo: initialData?.mobileNo ?? "",
        email: initialData?.email ?? "",
        drivingLicenseNo: initialData?.drivingLicenseNo ?? "",
        licenseExpiryDate: initialData?.licenseExpiryDate ?? "",
        supplier: initialData?.supplier ?? "",
        address: {
            line1: initialData?.address?.line1 ?? "",
            line2: initialData?.address?.line2 ?? "",
            city: initialData?.address?.city ?? "",
            state: initialData?.address?.state ?? "",
            district: initialData?.address?.district ?? "",
            pincode: initialData?.address?.pincode ?? "",
            country: initialData?.address?.country ?? DEFAULT_COUNTRY_CODE,
        },
    });

    /* ---------------------------------------------------------------------- */
    /* State                                                                   */
    /* ---------------------------------------------------------------------- */

    const [validationErrors, setValidationErrors] =
        useState<OrganizationValidationErrors>({});

    const [error, setError] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    const isFormValid = useMemo(() => isDriverFormValid(form), [form]);

    const canSave = isEditMode
        ? permissions.has("organisation.update") ||
          permissions.has("organisation.manage")
        : permissions.has("organisation.create") ||
          permissions.has("organisation.manage");

    const canSubmit = canSave && isFormValid && !isSaving;

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                              */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }

        router.push(viewHref);
    };

    /* ---------------------------------------------------------------------- */
    /* General Form Update                                                     */
    /* ---------------------------------------------------------------------- */

    const updateForm = <K extends keyof DriverFormData>(
        key: K,
        value: DriverFormData[K],
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Clear Validation Error                                                  */
    /* ---------------------------------------------------------------------- */

    const clearError = (field: string) => {
        setError("");

        setValidationErrors((previous) => {
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };

    const fieldInputClass = (field: string) =>
        [
            "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition focus:ring-1",
            validationErrors[field]
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[#FE5720] focus:ring-[#FE5720]/20",
        ].join(" ");

    /* ---------------------------------------------------------------------- */
    /* Save Driver                                                             */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");
        setValidationErrors({});

        const errors = collectDriverValidationErrors(form);
        setValidationErrors(errors);

        if (hasValidationErrors(errors) || !canSubmit) {
            return;
        }

        const driver: DriverFormData = {
            name: form.name.trim(),
            cprNo: form.cprNo.trim(),
            mobileNo: form.mobileNo.trim(),
            email: form.email.trim(),
            drivingLicenseNo: form.drivingLicenseNo.trim(),
            licenseExpiryDate: form.licenseExpiryDate.trim(),
            supplier: form.supplier.trim(),
            address: {
                line1: form.address.line1.trim(),
                line2: form.address.line2.trim(),
                city: form.address.city.trim(),
                state: form.address.state.trim(),
                district: form.address.district.trim(),
                pincode: form.address.pincode.trim(),
                country: form.address.country.trim().toUpperCase(),
            },
        };

        try {
            setIsSaving(true);

            await onSaved?.(driver);

            router.push(viewHref);
        } catch (saveError) {
            console.error("Failed to save driver:", saveError);

            setError("Failed to save driver. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Address Errors                                                          */
    /* ---------------------------------------------------------------------- */

    const addressErrors = {
        line1: validationErrors["address.line1"],
        line2: validationErrors["address.line2"],
        city: validationErrors["address.city"],
        state: validationErrors["address.state"],
        district: validationErrors["address.district"],
        pincode: validationErrors["address.pincode"],
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={isEditMode ? "Edit driver" : "Add Driver"}
            description={
                isEditMode
                    ? "Update driver details in the register."
                    : "Register a driver sourced through a staffing supplier."
            }
            backHref={viewHref}
            backLabel={
                isEditMode ? "Back to driver" : "Back to driver register"
            }
            tabs={[
                {
                    label: "Drivers",
                    href: "/organization/driver-register",
                },
            ]}
            activeTab="/organization/driver-register"
            infoText={
                isEditMode
                    ? undefined
                    : "New drivers are created Inactive. A driver is assigned to a vehicle only once that vehicle is on an active lease — assignment happens from the driver or vehicle record once it is saved."
            }
            actions={
                <>
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSubmit}
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : isEditMode
                              ? "Update driver"
                              : "Save driver"}
                    </Button>
                </>
            }
        >
            {/* 1. Name */}
            <div>
                <label
                    htmlFor="driver-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Driver name
                    <span className="ml-1 text-red-500">*</span>
                </label>

                <RestrictedInput
                    id="driver-name"
                    restrictedKind="name"
                    maxLength={DRIVER_INPUT_LIMITS.name}
                    value={form.name}
                    onChange={(name) => {
                        updateForm("name", name);
                        clearError("name");
                    }}
                    placeholder="Enter driver name"
                    className={fieldInputClass("name")}
                />

                {validationErrors.name && (
                    <p className="mt-1 text-xs text-red-500">
                        {validationErrors.name}
                    </p>
                )}
            </div>

            {/* 2. CPR + 3. Mobile */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="driver-cpr"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        CPR no.
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <RestrictedInput
                        id="driver-cpr"
                        restrictedKind="digits"
                        maxLength={DRIVER_INPUT_LIMITS.cprNo}
                        value={form.cprNo}
                        onChange={(cprNo) => {
                            updateForm("cprNo", cprNo);
                            clearError("cprNo");
                        }}
                        placeholder="e.g. 880417213"
                        className={fieldInputClass("cprNo")}
                    />

                    {validationErrors.cprNo && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.cprNo}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="driver-mobile"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Mobile no.
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <RestrictedInput
                        id="driver-mobile"
                        restrictedKind="phone"
                        maxLength={DRIVER_INPUT_LIMITS.phone}
                        value={form.mobileNo}
                        onChange={(mobileNo) => {
                            updateForm("mobileNo", mobileNo);
                            clearError("mobileNo");
                        }}
                        placeholder={mobilePlaceholder}
                        className={fieldInputClass("mobileNo")}
                    />

                    {validationErrors.mobileNo && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.mobileNo}
                        </p>
                    )}
                </div>
            </div>

            {/* Email (contact) */}
            <div className="mt-3">
                <label
                    htmlFor="driver-email"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Email
                    <span className="ml-1 text-red-500">*</span>
                </label>

                <RestrictedInput
                    id="driver-email"
                    restrictedKind="email"
                    value={form.email}
                    onChange={(email) => {
                        updateForm("email", email);
                        clearError("email");
                    }}
                    placeholder="name@example.com"
                    className={fieldInputClass("email")}
                />

                {validationErrors.email && (
                    <p className="mt-1 text-xs text-red-500">
                        {validationErrors.email}
                    </p>
                )}
            </div>

            {/* 4. License no + 5. License expiry */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="driving-license"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Driving license no.
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <RestrictedInput
                        id="driving-license"
                        restrictedKind="text"
                        maxLength={DRIVER_INPUT_LIMITS.licenseNumber}
                        value={form.drivingLicenseNo}
                        onChange={(drivingLicenseNo) => {
                            updateForm("drivingLicenseNo", drivingLicenseNo);
                            clearError("drivingLicenseNo");
                        }}
                        placeholder="e.g. DL-172094"
                        className={fieldInputClass("drivingLicenseNo")}
                    />

                    {validationErrors.drivingLicenseNo && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.drivingLicenseNo}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="license-expiry"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        License expiry date
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <input
                        id="license-expiry"
                        type="date"
                        value={form.licenseExpiryDate}
                        onChange={(event) => {
                            updateForm(
                                "licenseExpiryDate",
                                event.target.value,
                            );
                            clearError("licenseExpiryDate");
                        }}
                        className={fieldInputClass("licenseExpiryDate")}
                    />

                    {validationErrors.licenseExpiryDate && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.licenseExpiryDate}
                        </p>
                    )}
                </div>
            </div>

            {/* 6. Address */}
            <div className="mt-3">
                <OrganizationAddressForm
                    value={form.address}
                    onChange={(address) => {
                        setForm((previous) => ({
                            ...previous,
                            address,
                        }));

                        setError("");

                        setValidationErrors((previous) => {
                            const next = { ...previous };

                            delete next["address.line1"];
                            delete next["address.line2"];
                            delete next["address.city"];
                            delete next["address.state"];
                            delete next["address.district"];
                            delete next["address.pincode"];

                            return next;
                        });
                    }}
                    errors={addressErrors}
                    title="ADDRESS"
                    required
                />
            </div>

            {/* 7. Supplier */}
            <div className="mt-3">
                <label
                    htmlFor="driver-supplier"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Supplier
                    <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                    id="driver-supplier"
                    value={form.supplier}
                    onChange={(event) => {
                        updateForm("supplier", event.target.value);
                        clearError("supplier");
                    }}
                    disabled={driverSuppliersQuery.isLoading}
                    className={fieldInputClass("supplier")}
                >
                    <option value="">
                        {driverSuppliersQuery.isLoading
                            ? "Loading suppliers…"
                            : "Select supplier"}
                    </option>

                    {driverSupplierOptions.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                        </option>
                    ))}
                </select>

                {validationErrors.supplier && (
                    <p className="mt-1 text-xs text-red-500">
                        {validationErrors.supplier}
                    </p>
                )}
            </div>

            {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}
