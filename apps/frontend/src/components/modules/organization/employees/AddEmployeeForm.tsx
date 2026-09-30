"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  ORG_INPUT_LIMITS,
  ORG_VALIDATION_MESSAGES,
  isValidOrgEmail,
  isWithinOrgMaxLength,
  orgMaxLengthMessage,
} from "@/lib/validation/org-input-constraints";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { getInternationalPhonePlaceholder } from "@/lib/geo";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/states/async-states";
import { OrganisationDashboardFormSkeleton } from "@/components/modules/organization/OrganisationDashboardFormSkeleton";
import { useAuth } from "@/providers/auth-provider";
import {
  createOrganisationEmployeeApi,
  fetchOrganisationEmployeeByIdApi,
  fetchOrganisationEmployeeDepartmentsApi,
  fetchOrganisationEmployeesApi,
  updateOrganisationEmployeeApi,
} from "@/lib/api/organisation/employees";
import { fetchOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import { ApiClientError } from "@/lib/api/client";
import {
  EMPLOYEES_ACTIVE_TAB,
  EMPLOYEES_DASHBOARD_TABS,
  EMPLOYEES_PAGE_DESCRIPTION,
} from "./employeeDashboardLayoutProps";
import DepartmentSelector from "./DepartmentSelector";
import type { EmploymentType } from "./types";
import { EMPLOYMENT_TYPE_LABELS } from "./types";

type AddEmployeeFormProps = {
  employeeId?: string;
  onCancel?: () => void;
  onSaved?: () => void;
};

type FormState = {
  fullName: string;
  designation: string;
  department: string;
  locationId: string;
  reportsToId: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  phone: string;
  email: string;
};

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
];

function employeeFormValidationError(form: FormState): string | null {
  if (!form.fullName.trim()) {
    return "Full name is required.";
  }
  if (
    !isWithinOrgMaxLength(form.fullName, ORG_INPUT_LIMITS.employeeFullName)
  ) {
    return orgMaxLengthMessage("Full name", ORG_INPUT_LIMITS.employeeFullName);
  }
  if (!form.designation.trim()) {
    return "Designation is required.";
  }
  if (
    !isWithinOrgMaxLength(form.designation, ORG_INPUT_LIMITS.designation)
  ) {
    return orgMaxLengthMessage("Designation", ORG_INPUT_LIMITS.designation);
  }
  if (!form.department.trim()) {
    return "Department is required.";
  }
  if (
    !isWithinOrgMaxLength(form.department, ORG_INPUT_LIMITS.department)
  ) {
    return orgMaxLengthMessage("Department", ORG_INPUT_LIMITS.department);
  }
  if (!form.locationId) {
    return "Branch / location is required.";
  }
  const phone = normalizePhoneForApi(form.phone);
  if (!phone) {
    return "Mobile is required.";
  }
  if (phone.length > ORG_INPUT_LIMITS.phone) {
    return orgMaxLengthMessage("Mobile", ORG_INPUT_LIMITS.phone);
  }
  const email = form.email.trim();
  if (!email) {
    return "Company email is required.";
  }
  if (!isValidOrgEmail(email)) {
    return ORG_VALIDATION_MESSAGES.emailInvalid;
  }
  if (!form.dateOfJoining.trim()) {
    return "Date of joining is required.";
  }
  return null;
}

function isEmployeeFormValid(form: FormState): boolean {
  return employeeFormValidationError(form) === null;
}

export default function AddEmployeeForm({
  employeeId,
  onCancel,
  onSaved,
}: AddEmployeeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();
  const isEditMode = Boolean(employeeId);

  const canSave = isEditMode
    ? permissions.has("organisation.update") ||
      permissions.has("organisation.manage")
    : permissions.has("organisation.create") ||
      permissions.has("organisation.manage");

  const [form, setForm] = useState<FormState>({
    fullName: "",
    designation: "",
    department: "",
    locationId: "",
    reportsToId: "",
    employmentType: "full_time",
    dateOfJoining: "",
    phone: "",
    email: "",
  });

  const [showFullNameError, setShowFullNameError] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

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
        pageSize: 200,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const orgDepartmentsQuery = useQuery({
    queryKey: ["organization", "employees", organizationId, "departments"],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationEmployeeDepartmentsApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
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
        pageSize: 200,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const employeeDetailQuery = useQuery({
    queryKey: ["organization", "employee", organizationId, employeeId],
    queryFn: () => {
      if (!token || !organizationId || !employeeId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationEmployeeByIdApi(
        token,
        organizationId,
        employeeId,
      );
    },
    enabled:
      !!token && !!organizationId && !!employeeId && !isAuthLoading,
  });

  useEffect(() => {
    const existing = employeeDetailQuery.data;
    if (!existing) return;
    setForm({
      fullName: existing.fullName,
      designation: existing.designation,
      department: existing.department,
      locationId: existing.locationId ?? "",
      reportsToId: existing.reportsToId ?? "",
      employmentType: existing.employmentType,
      dateOfJoining: existing.dateOfJoining,
      phone: existing.phone,
      email: existing.email,
    });
  }, [employeeDetailQuery.data]);

  const branchLocations = locationsQuery.data?.items ?? [];
  const allEmployees = useMemo(
    () => employeesPickerQuery.data?.items ?? [],
    [employeesPickerQuery.data?.items],
  );

  const selectedBranchLocation = branchLocations.find(
    (location) => location.id === form.locationId,
  );

  const usedDepartments = useMemo(
    () => allEmployees.map((employee) => employee.department),
    [allEmployees],
  );

  const reportsToOptions = useMemo(
    () =>
      allEmployees.filter(
        (employee) => employee.status === "active" && employee.id !== employeeId,
      ),
    [allEmployees, employeeId],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      // dateOfJoining is required client-side (canSubmit); no silent default-to-today.
      const payload = {
        fullName: form.fullName.trim(),
        designation: form.designation.trim(),
        department: form.department.trim(),
        locationId: form.locationId,
        branchLocationLabel: selectedBranchLocation?.name,
        reportsToEmployeeId: form.reportsToId || undefined,
        employmentType: form.employmentType,
        dateOfJoining: form.dateOfJoining.trim(),
        phone: normalizePhoneForApi(form.phone),
        email: form.email.trim(),
      };
      if (isEditMode && employeeId) {
        return updateOrganisationEmployeeApi(
          token,
          organizationId,
          employeeId,
          payload,
        );
      }
      return createOrganisationEmployeeApi(token, {
        organizationId,
        ...payload,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "employees"],
      });
      if (onSaved) {
        onSaved();
        return;
      }
      router.push("/organization/employees");
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setSaveError(error.message);
        return;
      }
      setSaveError("Could not save employee. Please try again.");
    },
  });

  const fullNameInvalid =
    (submitAttempted || showFullNameError) && !form.fullName.trim();

  const isFormValid = useMemo(() => isEmployeeFormValid(form), [form]);

  const employeePhonePlaceholder = getInternationalPhonePlaceholder();

  const isFormLoading =
    isAuthLoading ||
    locationsQuery.isLoading ||
    employeesPickerQuery.isLoading ||
    (isEditMode &&
      (employeeDetailQuery.isLoading ||
        (!employeeDetailQuery.data && !employeeDetailQuery.isError)));

  const canSubmit =
    canSave &&
    isFormValid &&
    !saveMutation.isPending &&
    !isFormLoading;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/organization/employees");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSaveError(null);

    const validationError = employeeFormValidationError(form);
    if (validationError) {
      if (!form.fullName.trim()) {
        setShowFullNameError(true);
      }
      setSaveError(validationError);
      return;
    }

    if (!canSubmit) {
      return;
    }

    saveMutation.mutate();
  };

  const detailLoadFailed = isEditMode && employeeDetailQuery.isError;

  const isInactiveEmployee =
    isEditMode && employeeDetailQuery.data?.status === "inactive";

  const detailLoadErrorMessage =
    employeeDetailQuery.error instanceof ApiClientError
      ? employeeDetailQuery.error.message
      : "Failed to load employee for editing.";

  const pageTitle = isEditMode ? "Edit employee" : "Add employee";
  const backHref = isEditMode
    ? `/organization/employees/${employeeId}`
    : "/organization/employees";
  const backLabel = isEditMode ? "Back to employee" : "Back to employees";

  return (
    <DashboardLayout
      title={pageTitle}
      description={EMPLOYEES_PAGE_DESCRIPTION}
      tabs={[...EMPLOYEES_DASHBOARD_TABS]}
      activeTab={EMPLOYEES_ACTIVE_TAB}
      backHref={backHref}
      backLabel={backLabel}
    >
      <div className="w-full">
        {isFormLoading ? (
          <OrganisationDashboardFormSkeleton
            label={
              isEditMode
                ? "Loading employee for editing"
                : "Loading employee form"
            }
          />
        ) : detailLoadFailed ? (
          <ErrorState
            title="Failed to load employee"
            message={detailLoadErrorMessage}
            onRetry={() => {
              void employeeDetailQuery.refetch();
            }}
          />
        ) : isInactiveEmployee ? (
          <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
            <p className="text-sm font-medium text-gray-800">
              Inactive employees cannot be edited.
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Reactivate this employee from their profile, then try again.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/organization/employees/${employeeId}`)
              }
              className="mt-4 text-sm font-medium text-[#FE5720] hover:underline"
            >
              Back to employee
            </button>
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-5"
        >
            {saveError ? (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="employee-full-name"
                className="mb-1 block text-xs font-semibold text-gray-700"
              >
                Full name *
              </label>
              <RestrictedInput
                id="employee-full-name"
                restrictedKind="name"
                maxLength={ORG_INPUT_LIMITS.employeeFullName}
                value={form.fullName}
                onChange={(fullName) => {
                  setForm((previous) => ({
                    ...previous,
                    fullName,
                  }));
                  if (fullName.trim()) {
                    setShowFullNameError(false);
                  }
                }}
                onBlur={() => {
                  if (!form.fullName.trim()) {
                    setShowFullNameError(true);
                  }
                }}
                placeholder="Enter full name"
                className={[
                  "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition focus:ring-1",
                  fullNameInvalid
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-300 focus:border-[#FE5720] focus:ring-[#FE5720]/20",
                ].join(" ")}
              />
              {fullNameInvalid && (
                <p className="mt-1 text-xs text-red-600">
                  Full name is required.
                </p>
              )}
            </div>

            <div className="mt-4">
              <label
                htmlFor="employee-designation"
                className="mb-1 block text-xs font-semibold text-gray-700"
              >
                Designation *
              </label>
              <RestrictedInput
                id="employee-designation"
                restrictedKind="text"
                maxLength={ORG_INPUT_LIMITS.designation}
                value={form.designation}
                onChange={(designation) =>
                  setForm((previous) => ({
                    ...previous,
                    designation,
                  }))
                }
                placeholder="e.g. Fleet Operations Manager"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                Department *
              </label>
              <DepartmentSelector
                value={form.department}
                onChange={(department) =>
                  setForm((previous) => ({ ...previous, department }))
                }
                usedDepartmentNames={usedDepartments}
                orgDepartmentNames={orgDepartmentsQuery.data?.items ?? []}
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                Employment type *
              </label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPES.map((type) => {
                  const selected = form.employmentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          employmentType: type,
                        }))
                      }
                      className={[
                        "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                        selected
                          ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {EMPLOYMENT_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="employee-location"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Branch / location *
                </label>
                <select
                  id="employee-location"
                  value={form.locationId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      locationId: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                >
                  <option value="">Select branch / location</option>
                  {branchLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                  {form.locationId &&
                  !branchLocations.some(
                    (location) => location.id === form.locationId,
                  ) ? (
                    <option value={form.locationId}>
                      {employeeDetailQuery.data?.location ?? "Linked location"}
                    </option>
                  ) : null}
                </select>
              </div>

              <div>
                <label
                  htmlFor="employee-reports-to"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Reports to (optional)
                </label>
                <select
                  id="employee-reports-to"
                  value={form.reportsToId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      reportsToId: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                >
                  <option value="">None</option>
                  {reportsToOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} — {employee.designation}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="employee-phone"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Mobile *
                </label>
                <RestrictedInput
                  id="employee-phone"
                  restrictedKind="phone"
                  maxLength={ORG_INPUT_LIMITS.phone}
                  value={form.phone}
                  onChange={(phone) =>
                    setForm((previous) => ({
                      ...previous,
                      phone,
                    }))
                  }
                  placeholder={employeePhonePlaceholder}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="employee-email"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Company email *
                </label>
                <RestrictedInput
                  id="employee-email"
                  restrictedKind="email"
                  value={form.email}
                  onChange={(email) =>
                    setForm((previous) => ({
                      ...previous,
                      email,
                    }))
                  }
                  placeholder="name@grubfleet.io"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="employee-doj"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Date of joining *
                </label>
                <input
                  id="employee-doj"
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      dateOfJoining: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <p>
                Reports To defines the reporting line in your org chart. Creating
                a linked user account for portal access is a separate step in
                Administration.
              </p>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Payroll, leave, and appraisal data are not captured on this form
              — integration is planned for a later phase.
            </p>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                className="h-10 px-5"
                disabled={!canSubmit}
                loading={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : isEditMode
                    ? "Save changes"
                    : "Save employee"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
