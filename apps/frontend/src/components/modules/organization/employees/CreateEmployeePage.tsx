"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type EmployeeType = string;

export type EmployeeFormData = {
    fullName: string;
    designation: string;
    department: string;
    location: string;
    reportsTo?: string;
    employmentType: EmployeeType;
    dateOfJoining: string;
    phone: string;
    email: string;
};

type CreateEmployeePageProps = {
    onCancel?: () => void;
    onSaved?: (
        employee: EmployeeFormData
    ) => void | Promise<void>;
    initialData?: Partial<EmployeeFormData>;
};

/* -------------------------------------------------------------------------- */
/* Mock Options                                                               */
/* -------------------------------------------------------------------------- */

const DEPARTMENTS = [
    "Workshop",
    "Operations",
    "Fleet",
    "Finance",
    "Human Resources",
    "Administration",
    "Sales",
    "Procurement",
];

const LOCATIONS = [
    "Bhandup Workshop",
    "Andheri Office",
    "Mumbai Warehouse",
    "Delhi Office",
    "Pune Workshop",
];

const EMPLOYEE_TYPES = [
    "Full-time",
    "Part-time",
    "Contract",
];

const REPORTING_EMPLOYEES = [
    "Arjun Mehta",
    "Rohan Kapoor",
    "Priya Nair",
    "Amit Sharma",
    "Neha Verma",
];

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

type ValidationErrors = {
    fullName?: string;
    designation?: string;
    department?: string;
    location?: string;
    reportsTo?: string;
    employmentType?: string;
    dateOfJoining?: string;
    phone?: string;
    email?: string;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateEmployeePage({
    onCancel,
    onSaved,
    initialData,
}: CreateEmployeePageProps) {
    const router = useRouter();

    const isEdit = Boolean(initialData);

    /* ---------------------------------------------------------------------- */
    /* Form State                                                              */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<EmployeeFormData>({
            fullName:
                initialData?.fullName ?? "",

            designation:
                initialData?.designation ?? "",

            department:
                initialData?.department ?? "",

            location:
                initialData?.location ?? "",

            reportsTo:
                initialData?.reportsTo ?? "",

            employmentType:
                initialData?.employmentType ??
                "",

            dateOfJoining:
                initialData?.dateOfJoining ?? "",

            phone:
                initialData?.phone ?? "",

            email:
                initialData?.email ?? "",
        });

    /* ---------------------------------------------------------------------- */
    /* Validation / Save State                                                */
    /* ---------------------------------------------------------------------- */

    const [validationErrors, setValidationErrors] =
        useState<ValidationErrors>({});

    const [error, setError] =
        useState("");

    const [isSaving, setIsSaving] =
        useState(false);

    /* ---------------------------------------------------------------------- */
    /* Department State                                                        */
    /* ---------------------------------------------------------------------- */

    const [departments, setDepartments] =
        useState<string[]>(() => {
            const initialDepartment =
                initialData?.department?.trim();

            if (
                initialDepartment &&
                !DEPARTMENTS.some(
                    (department) =>
                        department.toLowerCase() ===
                        initialDepartment.toLowerCase()
                )
            ) {
                return [
                    ...DEPARTMENTS,
                    initialDepartment,
                ];
            }

            return [...DEPARTMENTS];
        });

    const [showAddDepartment, setShowAddDepartment] =
        useState(false);

    const [newDepartment, setNewDepartment] =
        useState("");

    /* ---------------------------------------------------------------------- */
    /* Employment Type State                                                  */
    /* ---------------------------------------------------------------------- */

    const [employmentTypes, setEmploymentTypes] =
        useState<string[]>(() => {
            const initialType =
                initialData?.employmentType?.trim();

            if (
                initialType &&
                !EMPLOYEE_TYPES.some(
                    (type) =>
                        type.toLowerCase() ===
                        initialType.toLowerCase()
                )
            ) {
                return [
                    ...EMPLOYEE_TYPES,
                    initialType,
                ];
            }

            return [...EMPLOYEE_TYPES];
        });

    const [showAddEmploymentType, setShowAddEmploymentType] =
        useState(false);

    const [newEmploymentType, setNewEmploymentType] =
        useState("");

    /* ---------------------------------------------------------------------- */
    /* Update Form                                                             */
    /* ---------------------------------------------------------------------- */

    const updateForm = <
        K extends keyof EmployeeFormData
    >(
        key: K,
        value: EmployeeFormData[K]
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Clear Error                                                             */
    /* ---------------------------------------------------------------------- */

    const clearError = (
        field: keyof ValidationErrors
    ) => {
        setError("");

        setValidationErrors((previous) => {
            const next = {
                ...previous,
            };

            delete next[field];

            return next;
        });
    };

    /* ---------------------------------------------------------------------- */
    /* Add Department                                                          */
    /* ---------------------------------------------------------------------- */

    const handleAddDepartment = () => {
        const value = newDepartment.trim();

        if (!value) {
            return;
        }

        const existingDepartment =
            departments.find(
                (department) =>
                    department.toLowerCase() ===
                    value.toLowerCase()
            );

        if (existingDepartment) {
            updateForm(
                "department",
                existingDepartment
            );

            clearError("department");

            setNewDepartment("");
            setShowAddDepartment(false);

            return;
        }

        setDepartments((previous) => [
            ...previous,
            value,
        ]);

        updateForm("department", value);

        clearError("department");

        setNewDepartment("");
        setShowAddDepartment(false);
    };

    /* ---------------------------------------------------------------------- */
    /* Add Employment Type                                                    */
    /* ---------------------------------------------------------------------- */

    const handleAddEmploymentType = () => {
        const value = newEmploymentType.trim();

        if (!value) {
            return;
        }

        const existingType =
            employmentTypes.find(
                (type) =>
                    type.toLowerCase() ===
                    value.toLowerCase()
            );

        if (existingType) {
            updateForm(
                "employmentType",
                existingType
            );

            clearError("employmentType");

            setNewEmploymentType("");
            setShowAddEmploymentType(false);

            return;
        }

        setEmploymentTypes((previous) => [
            ...previous,
            value,
        ]);

        updateForm(
            "employmentType",
            value
        );

        clearError("employmentType");

        setNewEmploymentType("");
        setShowAddEmploymentType(false);
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
            "/organization/employees"
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Validation                                                              */
    /* ---------------------------------------------------------------------- */

    const validateForm = () => {
        const errors: ValidationErrors = {};

        if (!form.fullName.trim()) {
            errors.fullName =
                "Full name is required.";
        }

        if (!form.designation.trim()) {
            errors.designation =
                "Designation is required.";
        }

        if (!form.department.trim()) {
            errors.department =
                "Please select a department.";
        }

        if (!form.location.trim()) {
            errors.location =
                "Please select a location.";
        }

        if (!form.employmentType.trim()) {
            errors.employmentType =
                "Please select an employment type.";
        }

        if (!form.dateOfJoining.trim()) {
            errors.dateOfJoining =
                "Date of joining is required.";
        }

        if (!form.phone.trim()) {
            errors.phone =
                "Phone number is required.";
        }

        if (!form.email.trim()) {
            errors.email =
                "Email is required.";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                form.email.trim()
            )
        ) {
            errors.email =
                "Please enter a valid email address.";
        }

        return errors;
    };

    /* ---------------------------------------------------------------------- */
    /* Save Employee                                                           */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");
        setValidationErrors({});

        const errors = validateForm();

        setValidationErrors(errors);

        if (
            Object.keys(errors).length > 0
        ) {
            return;
        }

        const employee: EmployeeFormData = {
            fullName:
                form.fullName.trim(),

            designation:
                form.designation.trim(),

            department:
                form.department.trim(),

            location:
                form.location.trim(),

            reportsTo:
                form.reportsTo?.trim() || "",

            employmentType:
                form.employmentType,

            dateOfJoining:
                form.dateOfJoining.trim(),

            phone:
                form.phone.trim(),

            email:
                form.email.trim(),
        };

        try {
            setIsSaving(true);

            await onSaved?.(employee);

            if (!onSaved) {
                router.push(
                    "/organization/employees"
                );
            }
        } catch (saveError) {
            console.error(
                "Failed to save employee:",
                saveError
            );

            setError(
                "Failed to save employee. Please try again."
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Input Class                                                             */
    /* ---------------------------------------------------------------------- */

    const inputClass = (
        field: keyof ValidationErrors
    ) =>
        [
            "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition",
            validationErrors[field]
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
        ].join(" ");

    /* ---------------------------------------------------------------------- */
    /* Select Class                                                            */
    /* ---------------------------------------------------------------------- */

    const selectClass = (
        field: keyof ValidationErrors
    ) =>
        [
            "h-10 w-full appearance-none rounded-md border bg-white px-3 pr-10 text-sm text-gray-700 outline-none transition",
            validationErrors[field]
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
        ].join(" ");

    /* ---------------------------------------------------------------------- */
    /* Selector Button Class                                                  */
    /* ---------------------------------------------------------------------- */

    const optionButtonClass = (
        selected: boolean,
        hasError: boolean
    ) =>
        [
            "h-9 rounded-md border px-3 text-xs font-medium transition",
            selected
                ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                : hasError
                    ? "border-red-300 bg-white text-gray-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50",
        ].join(" ");

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={
                isEdit
                    ? "Edit Employee"
                    : "Add Employee"
            }
            description={
                isEdit
                    ? "Update this employee's HR record."
                    : "Register a new employee's HR record — payroll, leave, and appraisals are handled outside GrubERP for now."
            }
            infoText="Reports to is a direct, manual selection — there's no organisation-wide hierarchy chart in this build to auto-fill it from. Creating a User Account for platform access is a separate, deliberate step (Administration)."
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
                            : isEdit
                                ? "Save changes"
                                : "Save employee"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* FULL NAME                                                     */}
            {/* ============================================================ */}

            <div>
                <label
                    htmlFor="employee-full-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Full name
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <input
                    id="employee-full-name"
                    type="text"
                    value={form.fullName}
                    onChange={(event) => {
                        updateForm(
                            "fullName",
                            event.target.value
                        );

                        clearError("fullName");
                    }}
                    placeholder="Enter employee name"
                    className={inputClass(
                        "fullName"
                    )}
                />

                {validationErrors.fullName && (
                    <p className="mt-1 text-xs text-red-500">
                        {
                            validationErrors.fullName
                        }
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* DESIGNATION + DEPARTMENT                                      */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Designation */}

                <div>
                    <label
                        htmlFor="employee-designation"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Designation
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="employee-designation"
                        type="text"
                        value={form.designation}
                        onChange={(event) => {
                            updateForm(
                                "designation",
                                event.target.value
                            );

                            clearError(
                                "designation"
                            );
                        }}
                        placeholder="e.g. Workshop Technician"
                        className={inputClass(
                            "designation"
                        )}
                    />

                    {validationErrors.designation && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.designation
                            }
                        </p>
                    )}
                </div>

                {/* Department */}

                <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Department
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                        {departments.map(
                            (department) => {
                                const isSelected =
                                    form.department ===
                                    department;

                                return (
                                    <button
                                        key={department}
                                        type="button"
                                        onClick={() => {
                                            updateForm(
                                                "department",
                                                department
                                            );

                                            clearError(
                                                "department"
                                            );
                                        }}
                                        className={optionButtonClass(
                                            isSelected,
                                            Boolean(
                                                validationErrors.department
                                            )
                                        )}
                                    >
                                        {department}
                                    </button>
                                );
                            }
                        )}

                        {!showAddDepartment && (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAddDepartment(
                                        true
                                    )
                                }
                                className="h-9 rounded-md border border-dashed border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                            >
                                + Add Type
                            </button>
                        )}
                    </div>

                    {showAddDepartment && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="text"
                                value={newDepartment}
                                onChange={(event) =>
                                    setNewDepartment(
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
                                        event.preventDefault();
                                        handleAddDepartment();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {
                                        setShowAddDepartment(
                                            false
                                        );
                                        setNewDepartment(
                                            ""
                                        );
                                    }
                                }}
                                placeholder="Enter department"
                                autoFocus
                                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            />

                            <button
                                type="button"
                                onClick={
                                    handleAddDepartment
                                }
                                className="h-9 rounded-md bg-[#FE5720] px-3 text-xs font-medium text-white hover:bg-[#e94d1b]"
                            >
                                Add
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddDepartment(
                                        false
                                    );
                                    setNewDepartment("");
                                }}
                                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {validationErrors.department && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.department
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* LOCATION + REPORTS TO                                         */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Location */}

                <div>
                    <label
                        htmlFor="employee-location"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Branch / location
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <div className="relative">
                        <select
                            id="employee-location"
                            value={form.location}
                            onChange={(event) => {
                                updateForm(
                                    "location",
                                    event.target.value
                                );

                                clearError(
                                    "location"
                                );
                            }}
                            className={selectClass(
                                "location"
                            )}
                        >
                            <option value="">
                                Select from Locations
                            </option>

                            {LOCATIONS.map(
                                (location) => (
                                    <option
                                        key={location}
                                        value={location}
                                    >
                                        {location}
                                    </option>
                                )
                            )}
                        </select>

                        <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                            strokeWidth={1.7}
                        />
                    </div>

                    {validationErrors.location && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.location
                            }
                        </p>
                    )}
                </div>

                {/* Reports To */}

                <div>
                    <label
                        htmlFor="employee-reports-to"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Reports to
                    </label>

                    <div className="relative">
                        <select
                            id="employee-reports-to"
                            value={
                                form.reportsTo ?? ""
                            }
                            onChange={(event) => {
                                updateForm(
                                    "reportsTo",
                                    event.target.value
                                );

                                clearError(
                                    "reportsTo"
                                );
                            }}
                            className={selectClass(
                                "reportsTo"
                            )}
                        >
                            <option value="">
                                Select employee (optional)
                            </option>

                            {REPORTING_EMPLOYEES.map(
                                (employee) => (
                                    <option
                                        key={employee}
                                        value={employee}
                                    >
                                        {employee}
                                    </option>
                                )
                            )}
                        </select>

                        <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                            strokeWidth={1.7}
                        />
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* EMPLOYMENT TYPE + DATE OF JOINING                             */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Employment Type */}

                <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Employment Type
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                        {employmentTypes.map(
                            (type) => {
                                const isSelected =
                                    form.employmentType ===
                                    type;

                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            updateForm(
                                                "employmentType",
                                                type
                                            );

                                            clearError(
                                                "employmentType"
                                            );
                                        }}
                                        className={optionButtonClass(
                                            isSelected,
                                            Boolean(
                                                validationErrors.employmentType
                                            )
                                        )}
                                    >
                                        {type}
                                    </button>
                                );
                            }
                        )}

                        {!showAddEmploymentType && (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAddEmploymentType(
                                        true
                                    )
                                }
                                className="h-9 rounded-md border border-dashed border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                            >
                                + Add Type
                            </button>
                        )}
                    </div>

                    {showAddEmploymentType && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="text"
                                value={
                                    newEmploymentType
                                }
                                onChange={(event) =>
                                    setNewEmploymentType(
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
                                        event.preventDefault();
                                        handleAddEmploymentType();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {
                                        setShowAddEmploymentType(
                                            false
                                        );
                                        setNewEmploymentType(
                                            ""
                                        );
                                    }
                                }}
                                placeholder="Enter employment type"
                                autoFocus
                                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            />

                            <button
                                type="button"
                                onClick={
                                    handleAddEmploymentType
                                }
                                className="h-9 rounded-md bg-[#FE5720] px-3 text-xs font-medium text-white hover:bg-[#e94d1b]"
                            >
                                Add
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddEmploymentType(
                                        false
                                    );
                                    setNewEmploymentType(
                                        ""
                                    );
                                }}
                                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {validationErrors.employmentType && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.employmentType
                            }
                        </p>
                    )}
                </div>

                {/* Date of Joining */}

                <div>
                    <label
                        htmlFor="employee-date-of-joining"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Date of joining
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="employee-date-of-joining"
                        type="text"
                        value={
                            form.dateOfJoining
                        }
                        onChange={(event) => {
                            updateForm(
                                "dateOfJoining",
                                event.target.value
                            );

                            clearError(
                                "dateOfJoining"
                            );
                        }}
                        placeholder="DD-MMM-YYYY"
                        className={inputClass(
                            "dateOfJoining"
                        )}
                    />

                    {validationErrors.dateOfJoining && (
                        <p className="mt-1 text-xs text-red-500">
                            {
                                validationErrors.dateOfJoining
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* PHONE + EMAIL                                                  */}
            {/* ============================================================ */}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Phone */}

                <div>
                    <label
                        htmlFor="employee-phone"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Phone
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="employee-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(event) => {
                            updateForm(
                                "phone",
                                event.target.value
                            );

                            clearError("phone");
                        }}
                        placeholder="+91 98XXXXXXXX"
                        className={inputClass(
                            "phone"
                        )}
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
                    <label
                        htmlFor="employee-email"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Email
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="employee-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => {
                            updateForm(
                                "email",
                                event.target.value
                            );

                            clearError("email");
                        }}
                        placeholder="name@company.com"
                        className={inputClass(
                            "email"
                        )}
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