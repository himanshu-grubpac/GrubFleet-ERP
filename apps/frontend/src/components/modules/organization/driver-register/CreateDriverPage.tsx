"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

export type DriverFormData = {
    name: string;
    cprNo: string;
    mobileNo: string;
    drivingLicenseNo: string;
    licenseExpiryDate: string;
    supplier: string;
    email: string;
    address: OrganizationAddress;
};

type CreateDriverFormProps = {
    onCancel?: () => void;
    onSaved?: (driver: DriverFormData) => void | Promise<void>;
    initialData?: Partial<DriverFormData>;
};

/* -------------------------------------------------------------------------- */
/* Mock Supplier Options                                                      */
/* -------------------------------------------------------------------------- */
/*
 * Temporary UI data.
 * Replace these with the supplier API options when the supplier API is wired.
 */

const MOCK_SUPPLIERS = [
    "Zenith Driver Staffing Agency",
    "FleetStaff Services",
    "Reliable Driver Solutions",
    "Prime Fleet Staffing",
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateDriverForm({
    onCancel,
    onSaved,
    initialData,
}: CreateDriverFormProps) {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* Form                                                                    */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<DriverFormData>({
        name: initialData?.name ?? "",
        cprNo: initialData?.cprNo ?? "",
        mobileNo: initialData?.mobileNo ?? "",
        drivingLicenseNo:
            initialData?.drivingLicenseNo ?? "",
        licenseExpiryDate:
            initialData?.licenseExpiryDate ?? "",
        supplier: initialData?.supplier ?? "",
        email: initialData?.email ?? "",
        address: {
            line1:
                initialData?.address?.line1 ?? "",
            line2:
                initialData?.address?.line2 ?? "",
            city:
                initialData?.address?.city ?? "",
            state:
                initialData?.address?.state ?? "",
            district:
                initialData?.address?.district ?? "",
            pincode:
                initialData?.address?.pincode ?? "",
        },
    });

    /* ---------------------------------------------------------------------- */
    /* State                                                                   */
    /* ---------------------------------------------------------------------- */

    const [validationErrors, setValidationErrors] =
        useState<OrganizationValidationErrors>({});

    const [error, setError] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                              */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }

        router.push("/organization/drivers");
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

    /* ---------------------------------------------------------------------- */
    /* Save Driver                                                             */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");
        setValidationErrors({});

        const errors: OrganizationValidationErrors = {};

        /* Driver name */

        if (!form.name.trim()) {
            errors.name = "Driver name is required.";
        }

        /* CPR */

        if (!form.cprNo.trim()) {
            errors.cprNo = "CPR no. is required.";
        }

        /* Mobile */

        const phoneError = validatePhone(
            form.mobileNo,
            "Mobile number",
        );

        if (phoneError) {
            errors.mobileNo = phoneError;
        }

        /* Driving license */

        if (!form.drivingLicenseNo.trim()) {
            errors.drivingLicenseNo =
                "Driving license no. is required.";
        }

        /* License expiry */

        if (!form.licenseExpiryDate.trim()) {
            errors.licenseExpiryDate =
                "License expiry date is required.";
        }

        /* Supplier */

        if (!form.supplier.trim()) {
            errors.supplier = "Supplier is required.";
        }

        /* Email */

        const emailError = validateEmail(
            form.email,
            "Email",
        );

        if (emailError) {
            errors.email = emailError;
        }

        /* Address */

        const addressValidationErrors =
            validateOrganizationAddress(form.address);

        Object.entries(addressValidationErrors).forEach(
            ([field, message]) => {
                errors[`address.${field}`] = message;
            },
        );

        setValidationErrors(errors);

        if (hasValidationErrors(errors)) {
            return;
        }

        /* ------------------------------------------------------------------ */
        /* Normalized payload                                                  */
        /* ------------------------------------------------------------------ */

        const driver: DriverFormData = {
            name: form.name.trim(),
            cprNo: form.cprNo.trim(),
            mobileNo: form.mobileNo.trim(),
            drivingLicenseNo:
                form.drivingLicenseNo.trim(),
            licenseExpiryDate:
                form.licenseExpiryDate.trim(),
            supplier: form.supplier.trim(),
            email: form.email.trim(),
            address: {
                line1: form.address.line1.trim(),
                line2: form.address.line2.trim(),
                city: form.address.city.trim(),
                state: form.address.state.trim(),
                district:
                    form.address.district.trim(),
                pincode:
                    form.address.pincode.trim(),
            },
        };

        try {
            setIsSaving(true);

            /*
             * The parent owns the actual Driver API call.
             * After the API succeeds, we redirect to the Drivers dashboard.
             */
            await onSaved?.(driver);

            router.push("/organization/driver-register");
        } catch (saveError) {
            console.error(
                "Failed to save driver:",
                saveError,
            );

            setError(
                "Failed to save driver. Please try again.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Address Errors                                                          */
    /* ---------------------------------------------------------------------- */

    const addressErrors = {
        line1:
            validationErrors["address.line1"],
        line2:
            validationErrors["address.line2"],
        city:
            validationErrors["address.city"],
        state:
            validationErrors["address.state"],
        district:
            validationErrors["address.district"],
        pincode:
            validationErrors["address.pincode"],
    };

    /* ---------------------------------------------------------------------- */
    /* Input Class                                                             */
    /* ---------------------------------------------------------------------- */

    const inputClass = (field: string) =>
        [
            "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition",
            validationErrors[field]
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
        ].join(" ");

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title="Add Driver"
            description="Register a driver sourced through a staffing supplier."
            infoText="New drivers are created Inactive. A driver is assigned to a vehicle only once that vehicle is on an active lease — assignment happens from the driver or vehicle record once it is saved."
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
                        disabled={isSaving}
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : "Save driver"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* DRIVER NAME                                                  */}
            {/* ============================================================ */}

            <div>
                <label
                    htmlFor="driver-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Driver name
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <input
                    id="driver-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => {
                        updateForm(
                            "name",
                            event.target.value,
                        );
                        clearError("name");
                    }}
                    placeholder="Enter driver name"
                    className={inputClass("name")}
                />

                {validationErrors.name && (
                    <p className="mt-1 text-xs text-red-500">
                        {validationErrors.name}
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* CPR + MOBILE                                                 */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="driver-cpr"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        CPR no.
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="driver-cpr"
                        type="text"
                        value={form.cprNo}
                        onChange={(event) => {
                            updateForm(
                                "cprNo",
                                event.target.value,
                            );
                            clearError("cprNo");
                        }}
                        placeholder="e.g. 880417213"
                        className={inputClass("cprNo")}
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
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="driver-mobile"
                        type="tel"
                        value={form.mobileNo}
                        onChange={(event) => {
                            updateForm(
                                "mobileNo",
                                event.target.value,
                            );
                            clearError("mobileNo");
                        }}
                        placeholder="+973 3XXX XXXX"
                        className={inputClass("mobileNo")}
                    />

                    {validationErrors.mobileNo && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.mobileNo}
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* LICENSE NO + EXPIRY                                          */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="driving-license"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Driving license no.
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="driving-license"
                        type="text"
                        value={
                            form.drivingLicenseNo
                        }
                        onChange={(event) => {
                            updateForm(
                                "drivingLicenseNo",
                                event.target.value,
                            );
                            clearError(
                                "drivingLicenseNo",
                            );
                        }}
                        placeholder="e.g. DL-172094"
                        className={inputClass(
                            "drivingLicenseNo",
                        )}
                    />

                    {validationErrors.drivingLicenseNo && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.drivingLicenseNo
                            }
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="license-expiry"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        License expiry date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="license-expiry"
                        type="date"
                        value={
                            form.licenseExpiryDate
                        }
                        onChange={(event) => {
                            updateForm(
                                "licenseExpiryDate",
                                event.target.value,
                            );
                            clearError(
                                "licenseExpiryDate",
                            );
                        }}
                        className={inputClass(
                            "licenseExpiryDate",
                        )}
                    />

                    {validationErrors.licenseExpiryDate && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.licenseExpiryDate
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* SUPPLIER + EMAIL                                              */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="driver-supplier"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Supplier
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="driver-supplier"
                        value={form.supplier}
                        onChange={(event) => {
                            updateForm(
                                "supplier",
                                event.target.value,
                            );
                            clearError("supplier");
                        }}
                        className={inputClass(
                            "supplier",
                        )}
                    >
                        <option value="">
                            Select supplier
                        </option>

                        {MOCK_SUPPLIERS.map(
                            (supplier) => (
                                <option
                                    key={supplier}
                                    value={supplier}
                                >
                                    {supplier}
                                </option>
                            ),
                        )}
                    </select>

                    {validationErrors.supplier && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.supplier}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="driver-email"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Email
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="driver-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => {
                            updateForm(
                                "email",
                                event.target.value,
                            );
                            clearError("email");
                        }}
                        placeholder="name@example.com"
                        className={inputClass("email")}
                    />

                    {validationErrors.email && (
                        <p className="mt-1 text-xs text-red-500">
                            {validationErrors.email}
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* SHARED ADDRESS                                                */}
            {/* ============================================================ */}

            <div className="mt-3">
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
                            },
                        );
                    }}
                    errors={addressErrors}
                    title="ADDRESS"
                    collapsible
                    defaultExpanded={false}
                    required
                />
            </div>

            {/* ============================================================ */}
            {/* GENERAL ERROR                                                  */}
            {/* ============================================================ */}

            {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}