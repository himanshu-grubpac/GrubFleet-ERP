"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import LocationTypeSelector, {
  type LocationType,
} from "@/components/modules/organization/locations/LocationTypeSelector";
import { useAuth } from "@/providers/auth-provider";
import {
  ORGANISATION_EMPLOYEE_FORM_PICKER_PAGE_SIZE,
  fetchOrganisationEmployeeDepartmentsApi,
  fetchOrganisationEmployeesApi,
} from "@/lib/api/organisation/employees";
import {
  ORGANISATION_LOCATION_FORM_PICKER_PAGE_SIZE,
  fetchOrganisationLocationsApi,
} from "@/lib/api/organisation/locations";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { PRESET_EMPLOYEE_DEPARTMENTS } from "./employeeDepartmentCatalog";
import {
  EMPLOYMENT_TYPE_UI_OPTIONS,
  employmentTypeApiToUi,
  employmentTypeUiToApi,
  formatEmployeeDateForForm,
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
};

type CreateEmployeePageProps = {
  onCancel?: () => void;
  onSaved?: (employee: EmployeeFormData) => void | Promise<void>;
  initialData?: Partial<EmployeeFormInitialData>;
  excludeEmployeeId?: string;
};

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
      ? formatEmployeeDateForForm(initialData.dateOfJoining)
      : "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
  });

  const [validationErrors, setValidationErrors] =
    useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

      return fetchOrganisationLocationsApi(token, {
        organizationId,
        status: "active",
        page: 1,
        pageSize: ORGANISATION_LOCATION_FORM_PICKER_PAGE_SIZE,
      });
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

      return fetchOrganisationEmployeesApi(token, {
        organizationId,
        page: 1,
        pageSize: ORGANISATION_EMPLOYEE_FORM_PICKER_PAGE_SIZE,
        status: "active",
      });
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

  const locationOptions = locationsQuery.data?.items ?? [];
  const reportingEmployees = useMemo(
    () =>
      (employeesPickerQuery.data?.items ?? []).filter(
        (employee) => employee.id !== excludeEmployeeId,
      ),
    [employeesPickerQuery.data?.items, excludeEmployeeId],
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

    router.push("/organization/employees");
  };

  const validateForm = () => {
    const errors: ValidationErrors = {};

    if (!form.fullName.trim()) {
      errors.fullName = "Full name is required.";
    }

    if (!form.designation.trim()) {
      errors.designation = "Designation is required.";
    }

    if (!form.department.trim()) {
      errors.department = "Please select a department.";
    }

    if (!form.locationId.trim()) {
      errors.location = "Please select a location.";
    }

    if (!form.employmentTypeUi.trim()) {
      errors.employmentType = "Please select an employment type.";
    } else if (!employmentTypeUiToApi(form.employmentTypeUi)) {
      errors.employmentType =
        "Employment type must be Full-time, Part-time, or Contract.";
    }

    if (!form.dateOfJoining.trim()) {
      errors.dateOfJoining = "Date of joining is required.";
    } else if (!parseEmployeeDateForApi(form.dateOfJoining)) {
      errors.dateOfJoining = "Use DD-MMM-YYYY (e.g. 14-Jun-2022).";
    }

    if (!form.phone.trim()) {
      errors.phone = "Phone number is required.";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    return errors;
  };

  const handleSave = async () => {
    setError("");
    setValidationErrors({});

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const employmentType = employmentTypeUiToApi(form.employmentTypeUi);
    const dateOfJoining = parseEmployeeDateForApi(form.dateOfJoining);

    if (!employmentType || !dateOfJoining) {
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
      phone: form.phone.trim(),
      email: form.email.trim(),
    };

    try {
      setIsSaving(true);
      await onSaved?.(employee);

      if (!onSaved) {
        router.push("/organization/employees");
      }
    } catch (saveError) {
      console.error("Failed to save employee:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save employee. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = (field: keyof ValidationErrors) =>
    [
      "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition",
      validationErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
        : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
    ].join(" ");

  const selectClass = (field: keyof ValidationErrors) =>
    [
      "h-10 w-full appearance-none rounded-md border bg-white px-3 pr-10 text-sm text-gray-700 outline-none transition",
      validationErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
        : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
    ].join(" ");

  const pickersLoading =
    isAuthLoading ||
    locationsQuery.isLoading ||
    employeesPickerQuery.isLoading;

  const canSubmit =
    !isSaving &&
    !pickersLoading &&
    Object.keys(validateForm()).length === 0;

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
        </>
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
        <input
          id="employee-full-name"
          type="text"
          value={form.fullName}
          onChange={(event) => {
            updateForm("fullName", event.target.value);
            clearError("fullName");
          }}
          placeholder="Enter employee name"
          className={inputClass("fullName")}
        />
        {validationErrors.fullName && (
          <p className="mt-1 text-xs text-red-500">
            {validationErrors.fullName}
          </p>
        )}
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
          <input
            id="employee-designation"
            type="text"
            value={form.designation}
            onChange={(event) => {
              updateForm("designation", event.target.value);
              clearError("designation");
            }}
            placeholder="e.g. Workshop Technician"
            className={inputClass("designation")}
          />
          {validationErrors.designation && (
            <p className="mt-1 text-xs text-red-500">
              {validationErrors.designation}
            </p>
          )}
        </div>
      </div>

      {/* Department — full-width row */}
      <div className="mt-3 w-full">
        <LocationTypeSelector
          locationTypes={departments}
          selectedType={form.department}
          showAddType={showAddDepartment}
          newType={newDepartment}
          error={validationErrors.department}
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
          {validationErrors.location && (
            <p className="mt-1 text-xs text-red-500">
              {validationErrors.location}
            </p>
          )}
        </div>

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
          error={validationErrors.employmentType}
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

      {/* Date of Joining */}
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
            type="text"
            value={form.dateOfJoining}
            onChange={(event) => {
              updateForm("dateOfJoining", event.target.value);
              clearError("dateOfJoining");
            }}
            placeholder="DD-MMM-YYYY"
            className={inputClass("dateOfJoining")}
          />
          {validationErrors.dateOfJoining && (
            <p className="mt-1 text-xs text-red-500">
              {validationErrors.dateOfJoining}
            </p>
          )}
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
          <input
            id="employee-phone"
            type="tel"
            value={form.phone}
            onChange={(event) => {
              updateForm("phone", event.target.value);
              clearError("phone");
            }}
            placeholder="+91 98XXXXXXXX"
            className={inputClass("phone")}
          />
          {validationErrors.phone && (
            <p className="mt-1 text-xs text-red-500">
              {validationErrors.phone}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="employee-email"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Email
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            id="employee-email"
            type="email"
            value={form.email}
            onChange={(event) => {
              updateForm("email", event.target.value);
              clearError("email");
            }}
            placeholder="name@company.com"
            className={inputClass("email")}
          />
          {validationErrors.email && (
            <p className="mt-1 text-xs text-red-500">
              {validationErrors.email}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </OrganizationFormLayout>
  );
}