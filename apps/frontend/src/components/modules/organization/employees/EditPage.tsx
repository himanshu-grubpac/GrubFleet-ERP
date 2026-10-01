"use client";

import { useParams, useRouter } from "next/navigation";

import CreateEmployeePage, {
    type EmployeeFormData,
} from "@/components/modules/organization/employees/CreateEmployeePage";

const MOCK_EMPLOYEES = [
    {
        id: "employee-001",
        fullName: "Vikram Joshi",
        designation: "Workshop Technician",
        department: "Workshop",
        location: "Bhandup Workshop",
        employmentType: "Full-time" as const,
        dateOfJoining: "14-Jun-2022",
        phone: "+91 98240 88564",
        email: "vikram.joshi@company.com",
        reportsTo: "Arjun Mehta",
        status: "active" as const,
    },
];

export default function EditEmployeePage() {
    const params = useParams();
    const router = useRouter();

    const employeeId = String(params.id);

    const employee = MOCK_EMPLOYEES.find(
        (item) => item.id === employeeId
    );

    if (!employee) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Employee not found.
                </p>
            </div>
        );
    }

    const handleCancel = () => {
        router.push(
            `/organization/employees/${employeeId}`
        );
    };

    const handleSaved = async (
        data: EmployeeFormData
    ) => {
        console.log("Updated employee:", {
            id: employeeId,
            ...data,
        });

        // Mock save for now
        router.push(
            `/organization/employees/${employeeId}`
        );
    };

    return (
        <CreateEmployeePage
            initialData={employee}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}