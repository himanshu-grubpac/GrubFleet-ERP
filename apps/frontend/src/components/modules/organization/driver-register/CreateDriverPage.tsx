"use client";


import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";


import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";


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
} from "@/components/common/Commonvalidation";


import {
    getDriverLicenseValidationError,
    normalizeDriverLicenseNumber,
} from "@grubpac/validation";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import { fetchOrganisationSuppliersApi } from "@/lib/api/organisation/suppliers";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { DRIVER_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";


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
/* Component                                                                  */
/* -------------------------------------------------------------------------- */


export default function CreateDriverForm({
    onCancel,
    onSaved,
    initialData,
}: CreateDriverFormProps) {
    const router = useRouter();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
    } = useAuth();


    const suppliersQuery = useQuery({
        queryKey: [
            "organization",
            "suppliers",
            organizationId,
            "driver-catalog",
        ],
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
        ...dashboardCatalogQueryOptions,
    });


    const supplierOptions = useMemo(() => {
        const items = suppliersQuery.data?.items ?? [];
        const selectedId = initialData?.supplier?.trim();
        if (
            selectedId &&
            !items.some((item) => item.id === selectedId)
        ) {
            return [
                {
                    id: selectedId,
                    name: selectedId,
                },
                ...items.map((item) => ({
                    id: item.id,
                    name: item.name,
                })),
            ];
        }
        return items.map((item) => ({
            id: item.id,
            name: item.name,
        }));
    }, [suppliersQuery.data?.items, initialData?.supplier]);


    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
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
            country:
                initialData?.address?.country ?? "",
        },
    });


    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */


    const [validationErrors, setValidationErrors] =
        useState<OrganizationValidationErrors>({});
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const isSubmittingRef = useRef(false);

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


        router.push("/organization/driver-register");
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

        // Do not display validation errors until the first Save attempt.
        if (!hasAttemptedSubmit) {
            return;
        }

        setValidationErrors((previous) => {
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };


    /* ---------------------------------------------------------------------- */
    /* Save Driver                                                             */
    /* ---------------------------------------------------------------------- */


    const validateForm = (): OrganizationValidationErrors => {
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

        if (!form.drivingLicenseNo.trim()) {
            errors.drivingLicenseNo = "Driving license no. is required.";
        } else {
            const licenseError = getDriverLicenseValidationError(
                form.drivingLicenseNo,
            );
            if (licenseError) errors.drivingLicenseNo = licenseError;
        }

        if (!form.licenseExpiryDate.trim()) {
            errors.licenseExpiryDate = "License expiry date is required.";
        }

        if (!form.supplier.trim()) {
            errors.supplier = "Supplier is required.";
        }

        const emailError = validateEmail(form.email, "Email");
        if (emailError) {
            errors.email = emailError;
        }

        const addressValidationErrors = validateOrganizationAddress(form.address);
        Object.entries(addressValidationErrors).forEach(([field, message]) => {
            errors[`address.${field}`] = message;
        });

        return errors;
    };

    // Recalculate errors as the user edits, but show them only after Save is attempted.
    const liveValidationErrors = validateForm();

    const displayedValidationErrors = hasAttemptedSubmit
        ? liveValidationErrors
        : validationErrors;

    const handleSave = async () => {
        if (isSubmittingRef.current || isSaving) {
            return;
        }

        setError("");
        setHasAttemptedSubmit(true);

        const errors = validateForm();
        setValidationErrors(errors);

        if (hasValidationErrors(errors)) {
            return;
        }

        const driver: DriverFormData = {
            name: form.name.trim(),
            cprNo: form.cprNo.trim(),
            mobileNo: form.mobileNo.trim(),
            drivingLicenseNo: normalizeDriverLicenseNumber(
                form.drivingLicenseNo,
            ),
            licenseExpiryDate: form.licenseExpiryDate.trim(),
            supplier: form.supplier.trim(),
            email: form.email.trim(),
            address: {
                line1: form.address.line1.trim(),
                line2: form.address.line2.trim(),
                city: form.address.city.trim(),
                state: form.address.state.trim(),
                district: form.address.district.trim(),
                pincode: form.address.pincode.trim(),
                country: form.address.country.trim(),
            },
        };

        isSubmittingRef.current = true;

        try {
            setIsSaving(true);
            // The parent route owns the API call, toast, cache invalidation, and navigation.
            await onSaved?.(driver);
        } catch (saveError) {
            const message =
                saveError instanceof ApiClientError
                    ? saveError.message
                    : saveError instanceof Error
                        ? saveError.message
                        : "Failed to save driver. Please try again.";

            setError(message);
        } finally {
            isSubmittingRef.current = false;
            setIsSaving(false);
        }
    };


    /* ---------------------------------------------------------------------- */
    /* Address Errors                                                          */
    /* ---------------------------------------------------------------------- */


    const addressErrors = {
        line1:
            displayedValidationErrors["address.line1"],
        line2:
            displayedValidationErrors["address.line2"],
        city:
            displayedValidationErrors["address.city"],
        state:
            displayedValidationErrors["address.state"],
        district:
            displayedValidationErrors["address.district"],
        pincode:
            displayedValidationErrors["address.pincode"],
        country:
            displayedValidationErrors["address.country"],
    };


    const canSubmit =
        !isSaving && !hasValidationErrors(liveValidationErrors);


    const controlBaseClass =
        "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const fieldBorderClass = (field: string) =>
        mergeFormControlBorderClass(
            Boolean(displayedValidationErrors[field]),
            controlBaseClass,
        );


    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */


    return (
        <OrganizationFormLayout
            title="Add Driver"
            description="Register a driver sourced through a staffing supplier."
            infoText="New drivers are created Inactive. A driver is assigned to a vehicle only once that vehicle is on an active lease — assignment happens from the driver or vehicle record once it is saved."
            actions={
                <div className="flex flex-wrap items-center justify-end gap-3">
                    {hasAttemptedSubmit &&
                        hasValidationErrors(displayedValidationErrors) && (
                            <div
                                role="status"
                                aria-live="polite"
                                className="mr-auto max-w-full text-xs leading-5 text-red-600"
                            >
                                <span className="font-semibold">Please fix:</span>{" "}
                                {Object.values(displayedValidationErrors).join(" | ")}
                            </div>
                        )}

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
                        {isSaving ? "Saving..." : "Save driver"}
                    </Button>
                </div>
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
                    className={fieldBorderClass("name")}
                />


                <FormFieldInlineError message={displayedValidationErrors.name} />
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


                    <RestrictedInput
                        id="driver-cpr"
                        restrictedKind="text"
                        maxLength={DRIVER_INPUT_LIMITS.cprNo}
                        value={form.cprNo}
                        onChange={(cprNo) => {
                            updateForm("cprNo", cprNo);
                            clearError("cprNo");
                        }}
                        placeholder="e.g. 880417213"
                        className={fieldBorderClass("cprNo")}
                    />


                    <FormFieldInlineError message={displayedValidationErrors.cprNo} />
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


                    <RestrictedInput
                        id="driver-mobile"
                        restrictedKind="phone"
                        maxLength={DRIVER_INPUT_LIMITS.phone}
                        value={form.mobileNo}
                        onChange={(mobileNo) => {
                            updateForm("mobileNo", mobileNo);
                            clearError("mobileNo");
                        }}
                        placeholder={getInternationalPhonePlaceholder()}
                        className={fieldBorderClass("mobileNo")}
                    />


                    <FormFieldInlineError message={displayedValidationErrors.mobileNo} />
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


                    <RestrictedInput
                        id="driving-license"
                        restrictedKind="text"
                        maxLength={DRIVER_INPUT_LIMITS.licenseNumber}
                        value={form.drivingLicenseNo}
                        onChange={(drivingLicenseNo) => {
                            updateForm(
                                "drivingLicenseNo",
                                drivingLicenseNo,
                            );
                            clearError("drivingLicenseNo");
                        }}
                        placeholder="e.g. DL-172094"
                        className={fieldBorderClass("drivingLicenseNo")}
                    />


                    <FormFieldInlineError
                        message={displayedValidationErrors.drivingLicenseNo}
                    />
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
                        className={fieldBorderClass(
                            "licenseExpiryDate",
                        )}
                    />


                    <FormFieldInlineError
                        message={displayedValidationErrors.licenseExpiryDate}
                    />
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
                        className={fieldBorderClass(
                            "supplier",
                        )}
                    >
                        <option value="">
                            Select supplier
                        </option>


                        {supplierOptions.map((supplier) => (
                            <option
                                key={supplier.id}
                                value={supplier.id}
                            >
                                {supplier.name}
                            </option>
                        ))}
                    </select>


                    <FormFieldInlineError message={displayedValidationErrors.supplier} />
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


                    <RestrictedInput
                        id="driver-email"
                        restrictedKind="email"
                        maxLength={DRIVER_INPUT_LIMITS.email}
                        value={form.email}
                        onChange={(email) => {
                            updateForm("email", email);
                            clearError("email");
                        }}
                        placeholder="name@example.com"
                        className={fieldBorderClass("email")}
                    />


                    <FormFieldInlineError message={displayedValidationErrors.email} />
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


                                delete next[
                                    "address.country"
                                ];


                                return next;
                            },
                        );
                    }}
                    errors={addressErrors}
                    title="ADDRESS"
                    required
                />
            </div>


            {/* ============================================================ */}
            {/* GENERAL ERROR                                                 */}
            {/* ============================================================ */}


            {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}

