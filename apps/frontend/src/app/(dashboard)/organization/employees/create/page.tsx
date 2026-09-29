"use client";

import { useRouter } from "next/navigation";
import AddEmployeeForm from "@/components/modules/organization/employees/AddEmployeeForm";

export default function CreateEmployeePage() {
  const router = useRouter();

  return (
    <AddEmployeeForm
      onCancel={() => router.push("/organization/employees")}
      onSaved={() => router.push("/organization/employees")}
    />
  );
}
