import { normalizePhoneForApi } from "@/lib/format/phone-format";
import type {
  CreateOrganisationEmployeePayload,
  OrganisationEmployeeDetail,
  UpdateOrganisationEmployeePayload,
} from "@/lib/api/organisation/employees";
import type { EmployeeFormData } from "@/components/modules/organization/employees/CreateEmployeePage";

export function employeeDetailToFormData(
  detail: OrganisationEmployeeDetail,
): EmployeeFormData {
  return {
    fullName: detail.fullName,
    designation: detail.designation,
    department: detail.department,
    locationId: detail.locationId ?? "",
    reportsToEmployeeId: detail.reportsToId ?? undefined,
    employmentType: detail.employmentType,
    dateOfJoining: detail.dateOfJoining?.slice(0, 10) ?? "",
    phone: detail.phone,
    email: detail.email,
  };
}

export function buildEmployeeCreatePayload(input: {
  organizationId: string;
  form: EmployeeFormData;
}): CreateOrganisationEmployeePayload {
  const phone = normalizePhoneForApi(input.form.phone);
  if (!phone) {
    throw new Error("Phone number is required.");
  }
  if (!input.form.locationId.trim()) {
    throw new Error("Branch / location is required.");
  }
  return {
    organizationId: input.organizationId,
    fullName: input.form.fullName.trim(),
    designation: input.form.designation.trim(),
    department: input.form.department.trim(),
    locationId: input.form.locationId,
    reportsToEmployeeId: input.form.reportsToEmployeeId,
    employmentType: input.form.employmentType,
    dateOfJoining: input.form.dateOfJoining.trim().slice(0, 10),
    phone,
    email: input.form.email.trim().toLowerCase(),
  };
}

export function buildEmployeeUpdatePayload(input: {
  form: EmployeeFormData;
}): UpdateOrganisationEmployeePayload {
  const phone = normalizePhoneForApi(input.form.phone);
  if (!phone) {
    throw new Error("Phone number is required.");
  }
  if (!input.form.locationId.trim()) {
    throw new Error("Branch / location is required.");
  }
  return {
    fullName: input.form.fullName.trim(),
    designation: input.form.designation.trim(),
    department: input.form.department.trim(),
    locationId: input.form.locationId,
    reportsToEmployeeId: input.form.reportsToEmployeeId ?? null,
    employmentType: input.form.employmentType,
    dateOfJoining: input.form.dateOfJoining.trim().slice(0, 10),
    phone,
    email: input.form.email.trim().toLowerCase(),
  };
}
