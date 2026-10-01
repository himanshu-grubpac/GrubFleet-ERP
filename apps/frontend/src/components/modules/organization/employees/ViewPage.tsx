"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type EmployeeStatus = "active" | "inactive";

type Employee = {
    id: string;
    fullName: string;
    status: EmployeeStatus;
    designation: string;
    department: string;
    location: string;
    employmentType:
    | "Full-time"
    | "Part-time"
    | "Contract";
    dateOfJoining: string;
    phone: string;
    email: string;
    reportsTo?: string;
};

type EmployeeDeactivateReason =
    | "Resignation"
    | "Termination"
    | "End of contract"
    | "Other";

/* -------------------------------------------------------------------------- */
/* Mock Employee                                                              */
/* -------------------------------------------------------------------------- */

const MOCK_EMPLOYEES: Employee[] = [
    {
        id: "employee-001",
        fullName: "Vikram Joshi",
        status: "active",
        designation: "Workshop Technician",
        department: "Workshop",
        location: "Bhandup Workshop",
        employmentType: "Full-time",
        dateOfJoining: "14-Jun-2022",
        phone: "+91 98240 88564",
        email: "vikram.joshi@company.com",
        reportsTo: "Arjun Mehta",
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function EmployeeViewPage() {
    const params = useParams();
    const router = useRouter();

    const employeeId = String(params.id);

    const employeeFromData = MOCK_EMPLOYEES.find(
        (item) => item.id === employeeId
    );

    const [employee, setEmployee] =
        useState<Employee | undefined>(
            employeeFromData
        );

    const [
        showDeactivateModal,
        setShowDeactivateModal,
    ] = useState(false);

    const [deactivateReason, setDeactivateReason] =
        useState<EmployeeDeactivateReason | "">("");

    const [otherDeactivateReason, setOtherDeactivateReason] =
        useState("");

    const [deactivateReasonError, setDeactivateReasonError] =
        useState("");

    /* ---------------------------------------------------------------------- */
    /* Employee Not Found                                                     */
    /* ---------------------------------------------------------------------- */

    if (!employee) {
        return (
            <div className="px-5 py-4">
                <p className="text-sm text-gray-500">
                    Employee not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Edit                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleEdit = () => {
        router.push(
            `/organization/employees/${employee.id}/edit`
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Open Deactivate Modal                                                  */
    /* ---------------------------------------------------------------------- */

    const handleOpenDeactivate = () => {
        setDeactivateReason("");
        setOtherDeactivateReason("");
        setDeactivateReasonError("");
        setShowDeactivateModal(true);
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                             */
    /* ---------------------------------------------------------------------- */

    const handleDeactivate = () => {
        setDeactivateReasonError("");

        /* Required reason validation */
        if (!deactivateReason) {
            setDeactivateReasonError(
                "Please select a reason for deactivation."
            );
            return;
        }

        /* Other reason validation */
        if (
            deactivateReason === "Other" &&
            !otherDeactivateReason.trim()
        ) {
            setDeactivateReasonError(
                "Please enter the reason for deactivation."
            );
            return;
        }

        const finalReason =
            deactivateReason === "Other"
                ? otherDeactivateReason.trim()
                : deactivateReason;

        setEmployee((previous) =>
            previous
                ? {
                    ...previous,
                    status: "inactive",
                }
                : previous
        );

        setShowDeactivateModal(false);
        setDeactivateReason("");
        setOtherDeactivateReason("");
        setDeactivateReasonError("");

        console.log("Employee deactivated:", {
            employeeId: employee.id,
            reason: finalReason,
        });
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel Deactivate                                                      */
    /* ---------------------------------------------------------------------- */

    const handleCancelDeactivate = () => {
        setShowDeactivateModal(false);
        setDeactivateReason("");
        setOtherDeactivateReason("");
        setDeactivateReasonError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Activate                                                               */
    /* ---------------------------------------------------------------------- */

    const handleActivate = () => {
        setEmployee((previous) =>
            previous
                ? {
                    ...previous,
                    status: "active",
                }
                : previous
        );

        console.log(
            "Employee activated:",
            employee.id
        );
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">

                {/* ========================================================== */}
                {/* Header                                                     */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">

                    {/* Employee Name + Status */}

                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            {employee.fullName}
                        </h1>

                        {employee.status ===
                            "active" ? (
                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                                Active
                            </span>
                        ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                Inactive
                            </span>
                        )}
                    </div>

                    {/* ====================================================== */}
                    {/* Actions                                                  */}
                    {/* ====================================================== */}

                    <div className="flex items-center gap-2">

                        {/* Edit */}

                        <Button
                            type="button"
                            variant="neutral"
                            onClick={handleEdit}
                            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                        >
                            Edit
                        </Button>

                        {/* Deactivate / Activate */}

                        {employee.status ===
                            "active" ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={
                                    handleOpenDeactivate
                                }
                                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={
                                    handleActivate
                                }
                                className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                            >
                                Activate
                            </Button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Employee Information                                       */}
                {/* ========================================================== */}

                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">

                    {/* First Row */}

                    <div className="grid grid-cols-4 gap-6">

                        <InfoItem
                            label="DESIGNATION"
                            value={
                                employee.designation
                            }
                        />

                        <InfoItem
                            label="DEPARTMENT"
                            value={
                                employee.department
                            }
                        />

                        <InfoItem
                            label="LOCATION"
                            value={
                                employee.location
                            }
                        />

                        <InfoItem
                            label="EMPLOYMENT TYPE"
                            value={
                                employee.employmentType
                            }
                        />
                    </div>

                    {/* Second Row */}

                    <div className="mt-3 grid grid-cols-4 gap-6 border-t border-gray-100 pt-3">

                        <InfoItem
                            label="DATE OF JOINING"
                            value={
                                employee.dateOfJoining
                            }
                        />

                        <InfoItem
                            label="PHONE"
                            value={
                                employee.phone
                            }
                        />

                        <InfoItem
                            label="EMAIL"
                            value={
                                employee.email
                            }
                        />

                        <InfoItem
                            label="REPORTS TO"
                            value={
                                employee.reportsTo ||
                                "—"
                            }
                        />
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* DEACTIVATE MODAL                                               */}
            {/* ============================================================== */}

            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

                    <div
                        className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-employee-title"
                    >

                        {/* Modal Header */}

                        <div className="flex items-start gap-3">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                                <AlertTriangle
                                    className="h-4 w-4 text-red-500"
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div>
                                <h2
                                    id="deactivate-employee-title"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Deactivate this employee?
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    This will deactivate{" "}
                                    <span className="font-medium text-gray-700">
                                        &quot;
                                        {
                                            employee.fullName
                                        }
                                        &quot;
                                    </span>{" "}
                                    from the employee register.
                                </p>
                            </div>
                        </div>
                     
                        {/* ================================================== */}
                        {/* Deactivation Reason                                */}
                        {/* ================================================== */}

                        {showDeactivateModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                                <div
                                    className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="deactivate-employee-title"
                                >
                                    {/* Header */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                                            <AlertTriangle
                                                className="h-4 w-4 text-red-500"
                                                strokeWidth={1.8}
                                            />
                                        </div>

                                        <div>
                                            <h2
                                                id="deactivate-employee-title"
                                                className="text-sm font-semibold text-gray-900"
                                            >
                                                Deactivate this employee?
                                            </h2>

                                            <p className="mt-1 text-xs leading-5 text-gray-500">
                                                This will deactivate{" "}
                                                <span className="font-medium text-gray-700">
                                                    &quot;{employee.fullName}&quot;
                                                </span>{" "}
                                                from the employee register.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="mt-4">
                                        <label className="mb-2 block text-xs font-medium text-gray-700">
                                            Reason
                                            <span className="ml-1 text-red-500">*</span>
                                        </label>

                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                "Resignation",
                                                "Termination",
                                                "End of contract",
                                                "Other",
                                            ].map((reason) => {
                                                const isSelected =
                                                    deactivateReason === reason;

                                                return (
                                                    <button
                                                        key={reason}
                                                        type="button"
                                                        onClick={() => {
                                                            setDeactivateReason(
                                                                reason as EmployeeDeactivateReason
                                                            );

                                                            setDeactivateReasonError("");
                                                        }}
                                                        className={`h-9 rounded-md border px-4 text-xs font-medium transition ${isSelected
                                                                ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                                                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        {reason}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Description - Always Required */}
                                    <div className="mt-3">
                                        <label
                                            htmlFor="deactivate-description"
                                            className="mb-1.5 block text-xs font-medium text-gray-700"
                                        >
                                            Description
                                            <span className="ml-1 text-red-500">*</span>
                                        </label>

                                        <textarea
                                            id="deactivate-description"
                                            value={otherDeactivateReason}
                                            onChange={(event) => {
                                                setOtherDeactivateReason(
                                                    event.target.value
                                                );
                                                setDeactivateReasonError("");
                                            }}
                                            placeholder="Enter reason for deactivation..."
                                            rows={3}
                                            className={`w-full resize-none rounded-md border bg-white px-3 py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400 ${deactivateReasonError
                                                    ? "border-red-400"
                                                    : "border-gray-200"
                                                } focus:border-gray-300 focus:ring-1 focus:ring-gray-200`}
                                        />

                                        {deactivateReasonError && (
                                            <p className="mt-1.5 text-[11px] text-red-500">
                                                {deactivateReasonError}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-5 flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="neutral"
                                            onClick={handleCancelDeactivate}
                                            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="neutral"
                                            onClick={handleDeactivate}
                                            className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                                        >
                                            Deactivate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}





                        {/* ================================================== */}
                        {/* Modal Actions                                       */}
                        {/* ================================================== */}

                        <div className="mt-5 flex justify-end gap-2">

                            <Button
                                type="button"
                                variant="neutral"
                                onClick={
                                    handleCancelDeactivate
                                }
                                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="neutral"
                                onClick={
                                    handleDeactivate
                                }
                                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}

/* -------------------------------------------------------------------------- */
/* Info Item                                                                  */
/* -------------------------------------------------------------------------- */

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[10px] font-medium text-gray-400">
                {label}
            </p>

            <p className="mt-0.5 text-xs font-medium text-gray-800">
                {value}
            </p>
        </div>
    );
}