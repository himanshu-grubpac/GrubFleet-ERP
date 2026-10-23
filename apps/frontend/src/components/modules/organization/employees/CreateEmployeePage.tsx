"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import LocationTypeSelector, {
  type LocationType,
} from "@/components/modules/organization/locations/LocationTypeSelector";
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateDate,
  hasValidationErrors,
  type ValidationErrors,
} from "@/components/common/Commonvalidation";
import { ORGANISATION_EMPLOYEE_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationEmployeeDepartmentsApi,
  fetchAllActiveOrganisationEmployeesApi,
} from "@/lib/api/organisation/employees";
import { fetchAllActiveOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { PRESET_EMPLOYEE_DEPARTMENTS } from "./employeeDepartmentCatalog";
import {
  EMPLOYMENT_TYPE_UI_OPTIONS,
  employmentTypeApiToUi,
  employmentTypeUiToApi,
  parseEmployeeDateForApi,
  type EmploymentTypeUiLabel,
} from "./employeeFormMappers";
import type { EmploymentType } from "./types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type EmployeeFormData = {
  fullName: string;
  designation: string;
  department: string;
  locationId: string;
  reportsToEmployeeId?: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  phone: string;
  email: string;
  isWorkshopTechnician: boolean;
};

export type EmployeeFormInitialData = {
  fullName: string;
  designation: string;
  department: string;
  locationId: string;
  reportsToEmployeeId?: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  phone: string;
  email: string;
  isWorkshopTechnician?: boolean;
};

type CreateEmployeePageProps = {
  onCancel?: () => void;
  onSaved?: (employee: EmployeeFormData) => void | Promise<void>;
  initialData?: Partial<EmployeeFormInitialData>;
  excludeEmployeeId?: string;
};

type FormState = {
  fullName: string;
  designation: string;
  department: string;
  locationId: string;
  reportsToEmployeeId: string;
  employmentTypeUi: string;
  dateOfJoining: string;
  phone: string;
  email: string;
  isWorkshopTechnician: boolean;
};

function buildDepartmentTypes(
  apiDepartments: string[],
  initialDepartment?: string,
): LocationType[] {
  const seen = new Set<string>();
  const items: LocationType[] = [];

  const add = (name: string, isCustom: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    items.push({
      id: `employee-department-${items.length + 1}`,
      name: trimmed,
      isCustom,
      isUsed: !isCustom,
    });
  };

  for (const preset of PRESET_EMPLOYEE_DEPARTMENTS) {
    add(preset, false);
  }

  for (const department of apiDepartments) {
    add(department, false);
  }

  if (initialDepartment) {
    add(initialDepartment, true);
  }

  return items;
}

function buildEmploymentTypes(initialType?: string): LocationType[] {
  const items: LocationType[] = EMPLOYMENT_TYPE_UI_OPTIONS.map(
    (type, index) => ({
      id: `employee-type-${index + 1}`,
      name: type,
      isCustom: false,
      isUsed: true,
    }),
  );

  if (initialType) {
    const mapped = employmentTypeUiToApi(initialType)
      ? employmentTypeApiToUi(employmentTypeUiToApi(initialType)!)
      : initialType;

    if (
      !items.some(
        (item) => item.name.toLowerCase() === mapped.toLowerCase(),
      )
    ) {
      items.push({
        id: "employee-type-custom-initial",
        name: mapped,
        isCustom: true,
        isUsed: true,
      });
    }
  }

  return items;
}

/** Convert supported API/form date values to the ISO format required by input[type="date"]. */
function toISODateInput(value: string): string {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Existing employee records may be formatted as DD-MMM-YYYY.
  const monthIndexes: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const [, day, monthName, year] = match;
    const month = monthIndexes[monthName.toLowerCase()];
    if (month) return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  // Also accept DD-MM-YYYY if supplied by an existing form value.
  const numericMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return `${year}-${month}-${day}`;
  }

  return "";
}

/** Convert ISO input back to the existing mapper's DD-MMM-YYYY input format. */
function toEmployeeMapperDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const [, year, month, day] = match;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthName = monthNames[Number(month) - 1];
  if (!monthName) return "";
  return `${day}-${monthName}-${year}`;
}

export default function CreateEmployeePage({
  onCancel,
  onSaved,
  initialData,
  excludeEmployeeId,
}: CreateEmployeePageProps) {
  const router = useRouter();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
  } = useAuth();

  const isEdit = Boolean(initialData);

  const initialEmploymentUi = initialData?.employmentType
    ? employmentTypeApiToUi(initialData.employmentType)
    : "";

  const [form, setForm] = useState<FormState>({
    fullName: initialData?.fullName ?? "",
    designation: initialData?.designation ?? "",
    department: initialData?.department ?? "",
    locationId: initialData?.locationId ?? "",
    reportsToEmployeeId: initialData?.reportsToEmployeeId ?? "",
    employmentTypeUi: initialEmploymentUi,
    dateOfJoining: initialData?.dateOfJoining
      ? toISODateInput(initialData.dateOfJoining)
      : "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
    isWorkshopTechnician: initialData?.isWorkshopTechnician ?? false,
  });

  const [validationErrors, setValidationErrors] =
    useState<ValidationErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);

  const [departments, setDepartments] = useState<LocationType[]>(() =>
    buildDepartmentTypes([], initialData?.department),
  );
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");

  const [employmentTypes, setEmploymentTypes] = useState<LocationType[]>(
    () => buildEmploymentTypes(initialEmploymentUi || undefined),
  );
  const [showAddEmploymentType, setShowAddEmploymentType] = useState(false);
  const [newEmploymentType, setNewEmploymentType] = useState("");

  const locationsQuery = useQuery({
    queryKey: ["organization", "locations", organizationId, "employee-form"],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }

      return fetchAllActiveOrganisationLocationsApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardCatalogQueryOptions,
  });

  const departmentsQuery = useQuery({
    queryKey: ["organization", "employees", organizationId, "departments"],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }

      return fetchOrganisationEmployeeDepartmentsApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardCatalogQueryOptions,
  });

  const employeesPickerQuery = useQuery({
    queryKey: ["organization", "employees", organizationId, "form-picker"],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }

      return fetchAllActiveOrganisationEmployeesApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardCatalogQueryOptions,
  });

  useEffect(() => {
    if (!departmentsQuery.data) return;

    setDepartments((previous) => {
      const selected = form.department || initialData?.department;
      const next = buildDepartmentTypes(
        departmentsQuery.data.items,
        selected,
      );

      for (const item of previous) {
        if (
          item.isCustom &&
          !next.some(
            (entry) =>
              entry.name.toLowerCase() === item.name.toLowerCase(),
          )
        ) {
          next.push(item);
        }
      }

      return next;
    });
  }, [departmentsQuery.data, form.department, initialData?.department]);

  const locationOptions = locationsQuery.data ?? [];
  const reportingEmployees = useMemo(
    () =>
      (employeesPickerQuery.data ?? []).filter(
        (employee) => employee.id !== excludeEmployeeId,
      ),
    [employeesPickerQuery.data, excludeEmployeeId],
  );

  const updateForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const clearError = (field: keyof ValidationErrors) => {
    setError("");
    setValidationErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleAddDepartment = () => {
    const value = newDepartment.trim();
    if (!value) return;

    const existingDepartment = departments.find(
      (department) =>
        department.name.toLowerCase() === value.toLowerCase(),
    );

    if (existingDepartment) {
      updateForm("department", existingDepartment.name);
      clearError("department");
      setNewDepartment("");
      setShowAddDepartment(false);
      return;
    }

    const newDepartmentType: LocationType = {
      id: `employee-department-${Date.now()}`,
      name: value,
      isCustom: true,
      isUsed: false,
    };

    setDepartments((previous) => [...previous, newDepartmentType]);
    updateForm("department", value);
    clearError("department");
    setNewDepartment("");
    setShowAddDepartment(false);
  };

  const handleDeleteDepartment = (type: LocationType) => {
    if (!type.isCustom || type.isUsed) return;

    if (form.department === type.name) {
      updateForm("department", "");
      clearError("department");
    }

    setDepartments((previous) =>
      previous.filter((item) => item.id !== type.id),
    );
  };

  const handleAddEmploymentType = () => {
    const value = newEmploymentType.trim();
    if (!value) return;

    const existingType = employmentTypes.find(
      (type) => type.name.toLowerCase() === value.toLowerCase(),
    );

    if (existingType) {
      updateForm("employmentTypeUi", existingType.name);
      clearError("employmentType");
      setNewEmploymentType("");
      setShowAddEmploymentType(false);
      return;
    }

    const newEmploymentTypeValue: LocationType = {
      id: `employee-type-${Date.now()}`,
      name: value,
      isCustom: true,
      isUsed: false,
    };

    setEmploymentTypes((previous) => [...previous, newEmploymentTypeValue]);
    updateForm("employmentTypeUi", value as EmploymentTypeUiLabel);
    clearError("employmentType");
    setNewEmploymentType("");
    setShowAddEmploymentType(false);
  };

  const handleDeleteEmploymentType = (type: LocationType) => {
    if (!type.isCustom || type.isUsed) return;

    if (form.employmentTypeUi === type.name) {
      updateForm("employmentTypeUi", "");
      clearError("employmentType");
    }

    setEmploymentTypes((previous) =>
      previous.filter((item) => item.id !== type.id),
    );
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    router.push("/organisation/employees");
  };

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    const fullNameError = validateRequired(form.fullName, "Full name");
    if (fullNameError) errors.fullName = fullNameError;

    const designationError = validateRequired(form.designation, "Designation");
    if (designationError) errors.designation = designationError;

    const departmentError = validateRequired(form.department, "Department");
    if (departmentError) errors.department = "Please select a department.";

    const locationError = validateRequired(form.locationId, "Location");
    if (locationError) errors.location = "Please select a location.";


    const employmentTypeError = validateRequired(
      form.employmentTypeUi,
      "Employment type",
    );
    if (employmentTypeError) {
      errors.employmentType = "Please select an employment type.";
    } else if (!employmentTypeUiToApi(form.employmentTypeUi)) {
      errors.employmentType =
        "Employment type must be Full-time, Part-time, or Contract.";
    }

    const dateError = validateDate(form.dateOfJoining, {
      label: "Date of joining",
      maxDate: new Date().toISOString().slice(0, 10),
    });
    if (dateError) errors.dateOfJoining = dateError;

    const phoneError = validatePhone(form.phone, "Phone number");
    if (phoneError) errors.phone = phoneError;

    const emailError = validateEmail(form.email, "Email");
    if (emailError) errors.email = emailError;

    return errors;
  };

  const handleSave = async () => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;

    setIsSaving(true);
    setHasAttemptedSubmit(true);
    setError("");

    try {
      const errors = validateForm();
      setValidationErrors(errors);

      if (Object.keys(errors).length > 0) {
        return;
      }

      const employmentType = employmentTypeUiToApi(form.employmentTypeUi);
      // Keep the existing API mapper contract while the UI uses ISO dates.
      const dateOfJoining = parseEmployeeDateForApi(
        toEmployeeMapperDate(form.dateOfJoining),
      );

      if (!employmentType || !dateOfJoining) {
        return;
      }

      const phone = normalizePhoneForApi(form.phone);
      if (!phone) {
        setValidationErrors((previous) => ({
          ...previous,
          phone: "Enter a valid phone number.",
        }));
        return;
      }

      const employee: EmployeeFormData = {
        fullName: form.fullName.trim(),
        designation: form.designation.trim(),
        department: form.department.trim(),
        locationId: form.locationId,
        reportsToEmployeeId: form.reportsToEmployeeId.trim() || undefined,
        employmentType,
        dateOfJoining,
        phone,
        email: form.email.trim(),
        isWorkshopTechnician: form.isWorkshopTechnician,
      };

      await onSaved?.(employee);

      if (!onSaved) {
        router.push("/organisation/employees");
      }
    } catch (saveError) {
      console.error("Failed to save employee:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save employee. Please try again.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  const liveErrors = useMemo(() => validateForm(), [form]);
  const displayedErrors = hasAttemptedSubmit ? liveErrors : validationErrors;
  const validationSummary = Object.values(displayedErrors).filter(
    (message): message is string => Boolean(message),
  );

  const pickersLoading =
    isAuthLoading ||
    locationsQuery.isLoading ||
    employeesPickerQuery.isLoading;

  const canSubmit = useMemo(
    () =>
      !isSaving &&
      !pickersLoading &&
      !hasValidationErrors(liveErrors),
    [isSaving, pickersLoading, liveErrors],
  );

  const baseInputClass =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  const inputClass = (field: keyof ValidationErrors) =>
    mergeFormControlBorderClass(Boolean(displayedErrors[field]), baseInputClass);

  const baseSelectClass =
    "h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  const selectClass = (field: keyof ValidationErrors) =>
    mergeFormControlBorderClass(
      Boolean(displayedErrors[field]),
      baseSelectClass,
    );

  return (
    <OrganizationFormLayout
      title={isEdit ? "Edit Employee" : "Add Employee"}
      description={
        isEdit
          ? "Update this employee's HR record."
          : "Register a new employee's HR record — payroll, leave, and appraisals are handled outside GrubERP for now."
      }
      infoText="Reports to is a direct, manual selection — there's no organisation-wide hierarchy chart in this build to auto-fill it from. Creating a User Account for platform access is a separate, deliberate step (Administration)."

      actions={
        <div className="flex w-full flex-col gap-4">
          {hasAttemptedSubmit && validationSummary.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="w-full text-xs leading-5 text-red-600"
            >
              <span className="font-semibold">Please fix:</span>{" "}
              {validationSummary.join(" | ")}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
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
              onClick={() => void handleSave()}
              disabled={!canSubmit}
              className="h-10 px-5"
            >
              {isSaving
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Save employee"}
            </Button>
          </div>
        </div>
      }

    >
      <div>
        <label
          htmlFor="employee-full-name"
          className="mb-1 block text-xs font-semibold text-gray-700"
        >
          Full name
          <span className="ml-1 text-red-500">*</span>
        </label>
        <RestrictedInput
          id="employee-full-name"
          restrictedKind="name"
          maxLength={ORGANISATION_EMPLOYEE_INPUT_LIMITS.fullName}
          value={form.fullName}
          onChange={(fullName) => {
            updateForm("fullName", fullName);
            clearError("fullName");
          }}
          placeholder="Enter employee name"
          className={inputClass("fullName")}
          aria-invalid={Boolean(displayedErrors.fullName)}
        />
        <FormFieldInlineError message={displayedErrors.fullName} />
      </div>

      {/* Designation */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="employee-designation"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Designation
            <span className="ml-1 text-red-500">*</span>
          </label>
          <RestrictedInput
            id="employee-designation"
            restrictedKind="text"
            maxLength={ORGANISATION_EMPLOYEE_INPUT_LIMITS.designation}
            value={form.designation}
            onChange={(designation) => {
              updateForm("designation", designation);
              clearError("designation");
            }}
            placeholder="e.g. Workshop Technician"
            className={inputClass("designation")}
            aria-invalid={Boolean(displayedErrors.designation)}
          />
          <FormFieldInlineError message={displayedErrors.designation} />
        </div>
      </div>

      {/* Department — full-width row */}
      <div className="mt-3 w-full">
        <LocationTypeSelector
          locationTypes={departments}
          selectedType={form.department}
          showAddType={showAddDepartment}
          newType={newDepartment}
          error={displayedErrors.department}
          onSelect={(type: string) => {
            updateForm("department", type);
            clearError("department");
          }}
          onToggleAddType={() => {
            setShowAddDepartment((previous: boolean) => !previous);
            setNewDepartment("");
          }}
          onNewTypeChange={(value: string) => {
            setNewDepartment(value);
            clearError("department");
          }}
          onAddType={handleAddDepartment}
          onDeleteType={handleDeleteDepartment}
        />
      </div>

      {/* Branch / location and Reports to */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="employee-location"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Branch / location
            <span className="ml-1 text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="employee-location"
              value={form.locationId}
              onChange={(event) => {
                updateForm("locationId", event.target.value);
                clearError("location");
              }}
              className={selectClass("location")}
              disabled={locationsQuery.isLoading}
            >
              <option value="">Select from Locations</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              strokeWidth={1.7}
            />
          </div>
          <FormFieldInlineError message={displayedErrors.location} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="employee-reports-to"
              className="block text-xs font-semibold text-gray-700"
            >
              Reports to
            </label>
            {form.reportsToEmployeeId ? (
              <button
                type="button"
                onClick={() => {
                  updateForm("reportsToEmployeeId", "");
                  clearError("reportsTo");
                }}
                className="text-xs text-gray-500 hover:text-red-500"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="relative">
            <select
              id="employee-reports-to"
              value={form.reportsToEmployeeId}
              onChange={(event) => {
                updateForm("reportsToEmployeeId", event.target.value);
                clearError("reportsTo");
              }}
              className={selectClass("reportsTo")}
              disabled={employeesPickerQuery.isLoading}
            >
              <option value="">Select employee (optional)</option>
              {reportingEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              strokeWidth={1.7}
            />
          </div>
        </div>
      </div>

      {/* Employment Type — full-width row */}
      <div className="mt-3 w-full">
        <LocationTypeSelector
          locationTypes={employmentTypes}
          selectedType={form.employmentTypeUi}
          showAddType={showAddEmploymentType}
          newType={newEmploymentType}
          error={displayedErrors.employmentType}
          onSelect={(type: string) => {
            updateForm("employmentTypeUi", type);
            clearError("employmentType");
          }}
          onToggleAddType={() => {
            setShowAddEmploymentType((previous: boolean) => !previous);
            setNewEmploymentType("");
          }}
          onNewTypeChange={(value: string) => {
            setNewEmploymentType(value);
            clearError("employmentType");
          }}
          onAddType={handleAddEmploymentType}
          onDeleteType={handleDeleteEmploymentType}
        />
      </div>


      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="employee-date-of-joining"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Date of joining
            <span className="ml-1 text-red-500">*</span>
          </label>

          <input
            id="employee-date-of-joining"
            type="date"
            value={form.dateOfJoining}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => {
              const value = event.target.value;

              // Native date inputs use YYYY-MM-DD. Reject values with a
              // non-four-digit year while preserving the browser calendar.
              if (value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                updateForm("dateOfJoining", value);
                clearError("dateOfJoining");
              }
            }}
            className={inputClass("dateOfJoining")}
          />

          <FormFieldInlineError message={displayedErrors.dateOfJoining} />
        </div>
      </div>


      {/* Phone and Email */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="employee-phone"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Phone
            <span className="ml-1 text-red-500">*</span>
          </label>

          <RestrictedInput
            id="employee-phone"
            restrictedKind="phone"
            maxLength={ORGANISATION_EMPLOYEE_INPUT_LIMITS.phone}
            value={form.phone}
            onChange={(phone) => {
              updateForm("phone", phone);
              clearError("phone");
            }}
            placeholder={getInternationalPhonePlaceholder()}
            className={inputClass("phone")}
            aria-invalid={Boolean(displayedErrors.phone)}
          />

          <FormFieldInlineError message={displayedErrors.phone} />
        </div>

        <div>
          <label
            htmlFor="employee-email"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Email
            <span className="ml-1 text-red-500">*</span>
          </label>
          <RestrictedInput
            id="employee-email"
            restrictedKind="email"
            maxLength={ORGANISATION_EMPLOYEE_INPUT_LIMITS.email}
            value={form.email}
            onChange={(email) => {
              updateForm("email", email);
              clearError("email");
            }}
            placeholder="name@company.com"
            className={inputClass("email")}
            aria-invalid={Boolean(displayedErrors.email)}
          />
          <FormFieldInlineError message={displayedErrors.email} />
        </div>
      </div>

      <div className="mt-3">
        <label
          htmlFor="employee-workshop-technician"
          className="flex cursor-pointer items-start gap-2.5"
        >
          <input
            id="employee-workshop-technician"
            type="checkbox"
            checked={form.isWorkshopTechnician}
            onChange={(event) =>
              updateForm("isWorkshopTechnician", event.target.checked)
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#FE5720] focus:ring-[#FE5720]/20"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-gray-700">
              Workshop technician
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-gray-500">
              When enabled, this employee can be assigned as a technician on
              Workshop work orders. Only active employees appear in technician
              pickers.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </OrganizationFormLayout>
  );
}