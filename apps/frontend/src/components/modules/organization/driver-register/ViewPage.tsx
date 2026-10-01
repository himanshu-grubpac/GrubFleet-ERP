"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
    ChevronRight,
    Phone,
    Mail,
    MapPin,
    UserRound,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

type DriverStatus = "active" | "inactive";

type Driver = {
    id: string;
    name: string;
    employeeId: string;
    driverType: string;
    phone: string;
    email: string;
    licenseNumber: string;
    licenseType: string;
    licenseExpiry: string;
    address: string;
    status: DriverStatus;
};

/*
 * ------------------------------------------------------------
 * MOCK DATA
 *
 * Replace this with API data later.
 * ------------------------------------------------------------
 */

const mockDrivers: Driver[] = [
    {
        id: "driver-001",
        name: "Rajesh Kumar",
        employeeId: "EMP-001",
        driverType: "Heavy Vehicle Driver",
        phone: "+91 98765 43210",
        email: "rajesh.kumar@example.com",
        licenseNumber: "DL-1420110012345",
        licenseType: "Heavy Motor Vehicle",
        licenseExpiry: "15 Dec 2027",
        address: "Vasai, Mumbai",
        status: "active",
    },
    {
        id: "driver-002",
        name: "Amit Sharma",
        employeeId: "EMP-002",
        driverType: "Light Vehicle Driver",
        phone: "+91 99887 66554",
        email: "amit.sharma@example.com",
        licenseNumber: "DL-1420220067890",
        licenseType: "Light Motor Vehicle",
        licenseExpiry: "20 Aug 2028",
        address: "Andheri East, Mumbai",
        status: "active",
    },
];

/*
 * ------------------------------------------------------------
 * PAGE
 * ------------------------------------------------------------
 */

export default function ViewPage() {
    const params = useParams();
    const router = useRouter();

    const driverId = params.id as string;

    /*
     * Find driver from mock data.
     *
     * Later this will be replaced by API data.
     */

    const mockDriver =
        mockDrivers.find((driver) => driver.id === driverId) ??
        mockDrivers[0];

    const [driver, setDriver] = useState<Driver>(mockDriver);

    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [deactivateReason, setDeactivateReason] = useState("");
    const [statusError, setStatusError] = useState<string | null>(null);

    const isActive = driver.status === "active";

    /*
     * ------------------------------------------------------------
     * EDIT
     * ------------------------------------------------------------
     */

    const handleEdit = () => {
        router.push(
            `/organization/driver-register/${driverId}/edit`,
        );
    };

    /*
     * ------------------------------------------------------------
     * ACTIVATE / DEACTIVATE
     * ------------------------------------------------------------
     */

    const handleToggleStatus = () => {
        setStatusError(null);

        if (driver.status === "active") {
            setDeactivateOpen(true);
            return;
        }

        /*
         * Mock activation.
         *
         * Replace with API call later.
         */

        setDriver((current) => ({
            ...current,
            status: "active",
        }));
    };

    /*
     * ------------------------------------------------------------
     * CONFIRM DEACTIVATE
     * ------------------------------------------------------------
     */

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();

        if (!reason) {
            setStatusError(
                "Please enter a deactivation reason.",
            );
            return;
        }

        /*
         * Mock deactivation.
         *
         * Later this will become an API request.
         */

        setDriver((current) => ({
            ...current,
            status: "inactive",
        }));

        setDeactivateOpen(false);
        setDeactivateReason("");
        setStatusError(null);
    };

    return (
        <div className="min-h-screen bg-[#f7f7f7]">

            {/* =====================================================
                Main
            ====================================================== */}

            <main className="px-6 py-3">

                {/* =================================================
                    Header
                ================================================== */}

                <div className="mb-3 flex items-center justify-between">

                    <div className="flex items-center gap-2">

                        <h1 className="text-[15px] font-semibold text-gray-900">
                            {driver.name}
                        </h1>

                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                            {driver.driverType}
                        </span>

                    </div>

                    {/* Actions */}

                    <div className="flex items-center gap-2">

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleEdit}
                            disabled={!isActive}
                        >
                            Edit
                        </Button>

                        <Button
                            type="button"
                            onClick={handleToggleStatus}
                        >
                            {isActive
                                ? "Deactivate"
                                : "Activate"}
                        </Button>

                    </div>

                </div>

                {/* =================================================
                    Driver Summary
                ================================================== */}

                <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">

                    <div className="grid grid-cols-3 gap-6">

                        {/* Employee ID */}

                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                Employee ID
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-900">
                                {driver.employeeId}
                            </p>
                        </div>

                        {/* Driver Type */}

                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                Driver type
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-900">
                                {driver.driverType}
                            </p>
                        </div>

                        {/* Status */}

                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                Status
                            </p>

                            <div className="mt-1">

                                <span
                                    className={
                                        isActive
                                            ? "rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700"
                                            : "rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600"
                                    }
                                >
                                    {isActive
                                        ? "Active"
                                        : "Inactive"}
                                </span>

                            </div>
                        </div>

                    </div>

                </div>

                {/* =================================================
                    Contact Information
                ================================================== */}

                <section className="mt-3">

                    <h2 className="text-[13px] font-semibold text-gray-900">
                        Contact information
                    </h2>

                    <div className="mt-3 rounded-lg border border-gray-200 bg-white">

                        <div className="grid grid-cols-2 gap-6 px-4 py-4">

                            {/* Phone */}

                            <div className="flex items-start gap-3">

                                <Phone className="mt-0.5 h-4 w-4 text-gray-400" />

                                <div>

                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                        Contact number
                                    </p>

                                    <p className="mt-1 text-xs text-gray-700">
                                        {driver.phone}
                                    </p>

                                </div>

                            </div>

                            {/* Email */}

                            <div className="flex items-start gap-3">

                                <Mail className="mt-0.5 h-4 w-4 text-gray-400" />

                                <div>

                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                        Email
                                    </p>

                                    <p className="mt-1 text-xs text-gray-700">
                                        {driver.email}
                                    </p>

                                </div>

                            </div>

                            {/* Address */}

                            <div className="flex items-start gap-3">

                                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />

                                <div>

                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                        Address
                                    </p>

                                    <p className="mt-1 text-xs text-gray-700">
                                        {driver.address}
                                    </p>

                                </div>

                            </div>

                            {/* Driver */}

                            <div className="flex items-start gap-3">

                                <UserRound className="mt-0.5 h-4 w-4 text-gray-400" />

                                <div>

                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                        Driver
                                    </p>

                                    <p className="mt-1 text-xs text-gray-700">
                                        {driver.name}
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                {/* =================================================
                    Driving Licence
                ================================================== */}

                <section className="mt-3">

                    <h2 className="text-[13px] font-semibold text-gray-900">
                        Driving licence
                    </h2>

                    <div className="mt-3 rounded-lg border border-gray-200 bg-white">

                        <div className="grid grid-cols-3 gap-6 px-4 py-4">

                            {/* Licence Number */}

                            <div>

                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                    Licence number
                                </p>

                                <p className="mt-1 text-xs font-semibold text-gray-900">
                                    {driver.licenseNumber}
                                </p>

                            </div>

                            {/* Licence Type */}

                            <div>

                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                    Licence type
                                </p>

                                <p className="mt-1 text-xs font-semibold text-gray-900">
                                    {driver.licenseType}
                                </p>

                            </div>

                            {/* Expiry */}

                            <div>

                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                    Expiry date
                                </p>

                                <p className="mt-1 text-xs font-semibold text-gray-900">
                                    {driver.licenseExpiry}
                                </p>

                            </div>

                        </div>

                    </div>

                </section>

            </main>

            {/* =====================================================
                Deactivate Modal
            ====================================================== */}

            {deactivateOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">

                    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">

                        <h2 className="text-base font-semibold text-gray-900">
                            Deactivate {driver.name}?
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            This driver will no longer be available
                            for active driver assignments.
                        </p>

                        <textarea
                            value={deactivateReason}
                            onChange={(event) => {
                                setDeactivateReason(
                                    event.target.value,
                                );
                                setStatusError(null);
                            }}
                            rows={3}
                            className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#FE5720]"
                            placeholder="Reason for deactivation"
                        />

                        {statusError && (
                            <p className="mt-2 text-sm text-red-600">
                                {statusError}
                            </p>
                        )}

                        <div className="mt-4 flex justify-end gap-2">

                            <button
                                type="button"
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                    setDeactivateOpen(false);
                                    setDeactivateReason("");
                                    setStatusError(null);
                                }}
                            >
                                Cancel
                            </button>

                            <Button
                                type="button"
                                onClick={handleDeactivate}
                            >
                                Deactivate
                            </Button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}