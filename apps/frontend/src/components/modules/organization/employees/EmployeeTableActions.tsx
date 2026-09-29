"use client";

import DashboardViewCopyRowActions from "@/components/dashboard/DashboardViewCopyRowActions";

type EmployeeTableActionsProps = {
  status: "active" | "inactive";
  employeeId: string;
  copyText: string;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
};

export default function EmployeeTableActions({
  status,
  employeeId,
  copyText,
  onEdit,
  onDeactivate,
  onActivate,
}: EmployeeTableActionsProps) {
  const isActive = status === "active";

  return (
    <DashboardViewCopyRowActions
      viewHref={`/organization/employees/${employeeId}`}
      viewAriaLabel="View employee"
      copyText={copyText}
      copyAriaLabel="Copy employee row details"
      onEdit={isActive ? onEdit : undefined}
      menuAriaLabel="Employee actions"
      status={status}
      onActivate={onActivate}
      onDeactivate={onDeactivate}
    />
  );
}
