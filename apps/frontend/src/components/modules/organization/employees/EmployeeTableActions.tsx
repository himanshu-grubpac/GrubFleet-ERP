"use client";

import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { organisationEmployeeDetailHref } from "@/lib/navigation/organisation-static-routes";
import { formatPhoneForCopy } from "@/lib/format/phone-format";

export type EmployeeListRowForActions = {
    id: string;
    name: string;
    designation: string;
    department: string;
    location: string;
    reportsTo?: string;
    phone?: string;
    email?: string;
    status: "active" | "inactive";
};

function formatEmployeeListRowCopyText(
    employee: EmployeeListRowForActions,
): string {
    const lines = [
        `Employee: ${employee.name}`,
        `Designation: ${employee.designation}`,
        `Department: ${employee.department}`,
        `Location: ${employee.location}`,
        employee.reportsTo ? `Reports to: ${employee.reportsTo}` : null,
        employee.email ? `Email: ${employee.email}` : null,
        employee.phone ? `Phone: ${formatPhoneForCopy(employee.phone)}` : null,
        `Status: ${employee.status === "active" ? "Active" : "Inactive"}`,
    ].filter((line): line is string => Boolean(line?.trim()));
    return lines.join("\n");
}

type EmployeeTableActionsProps = {
    status: "active" | "inactive";
    employee: EmployeeListRowForActions;
    onEdit?: () => void;
    onToggleStatus?: () => void;
};

/** Employee list row actions — delegates to shared `DashboardTableActions`. */
export default function EmployeeTableActions({
    status,
    employee,
    onEdit,
    onToggleStatus,
}: EmployeeTableActionsProps) {
    return (
        <DashboardTableActions
            status={status}
            viewHref={organisationEmployeeDetailHref(employee.id)}
            copyText={formatEmployeeListRowCopyText(employee)}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
        />
    );
}
