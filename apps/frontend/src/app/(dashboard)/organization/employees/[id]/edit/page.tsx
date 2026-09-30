"use client";

import { useParams, useRouter } from "next/navigation";
import AddEmployeeForm from "@/components/modules/organization/employees/AddEmployeeForm";

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  return (
    <AddEmployeeForm
      employeeId={employeeId}
      onCancel={() => router.push(`/organization/employees/${employeeId}`)}
      onSaved={() => router.push(`/organization/employees/${employeeId}`)}
    />
  );
}
