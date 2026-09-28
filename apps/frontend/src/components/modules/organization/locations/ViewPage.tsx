"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type LocationStatus = "active" | "inactive";

type Location = {
    id: string;
    name: string;
    type: string;
    address: string;
    responsiblePerson: string;
    email: string;
    phone: string;
    deputyName?: string;
    deputyEmail?: string;
    deputyPhone?: string;
    status: LocationStatus;
};

/* -------------------------------------------------------------------------- */
/* Temporary mock data                                                        */
/* -------------------------------------------------------------------------- */

const MOCK_LOCATIONS: Location[] = [
    {
        id: "loc-001",
        name: "Delhi Head Office",
        type: "Office",
        address: "Connaught Place, New Delhi",
        responsiblePerson: "Rahul Sharma",
        email: "rahul@grubpac.com",
        phone: "+91 98765 43210",
        deputyName: "Priya Nair",
        deputyEmail: "priya.nair@grubpac.com",
        deputyPhone: "+91 98230 66142",
        status: "active",
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LocationDetailsPage() {
    const params = useParams();
    const router = useRouter();

    const locationId = params.id as string;

    const initialLocation =
        MOCK_LOCATIONS.find((location) => location.id === locationId) ??
        MOCK_LOCATIONS[0];

    const [location, setLocation] = useState<Location>(initialLocation);

    /* ---------------------------------------------------------------------- */
    /* Actions                                                                */
    /* ---------------------------------------------------------------------- */

    const handleEdit = () => {
        router.push(`/organization/locations/${location.id}/edit`);
    };

    const handleToggleStatus = () => {
        setLocation((currentLocation) => ({
            ...currentLocation,
            status:
                currentLocation.status === "active"
                    ? "inactive"
                    : "active",
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-screen bg-[#f7f7f7]">
            {/* ---------------------------------------------------------------- */}
            {/* Page Header                                                       */}
            {/* ---------------------------------------------------------------- */}

            <div className="border-b border-gray-200 bg-white">
                <div className="px-6 py-2.5">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Link
                            href="/organization"
                            className="hover:text-gray-700"
                        >
                            Organization
                        </Link>

                        <ChevronRight className="h-3 w-3 text-gray-400" />

                        <Link
                            href="/organization/locations"
                            className="hover:text-gray-700"
                        >
                            Locations
                        </Link>

                        <ChevronRight className="h-3 w-3 text-gray-400" />

                        <span className="font-medium text-gray-800">
                            {location.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Main Content                                                      */}
            {/* ---------------------------------------------------------------- */}

            <main className="px-6 py-3">
                {/* ------------------------------------------------------------ */}
                {/* Title + Actions                                                */}
                {/* ------------------------------------------------------------ */}

                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-[15px] font-semibold text-gray-900">
                            {location.name}
                        </h1>

                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                            {location.type}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Edit */}
                        <div className="flex items-center gap-2">
                            {/* Edit */}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleEdit}
                                className="h-8 min-w-[64px] px-4 text-xs"
                            >
                                Edit
                            </Button>

                            {/* Activate / Deactivate */}
                            <Button
                                type="button"
                                variant={location.status === "active" ? "outline" : "primary"}
                                onClick={handleToggleStatus}
                                className="h-8 min-w-[78px] px-4 text-xs"
                            >
                                {location.status === "active" ? "Deactivate" : "Activate"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ------------------------------------------------------------ */}
                {/* Location Information Card                                     */}
                {/* ------------------------------------------------------------ */}

                <div className="rounded-lg border border-gray-200 bg-white px-3.5">
                    {/* Address */}
                    <div className="border-b border-gray-100 py-3">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                            Address
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-gray-800">
                            {location.address || "—"}
                        </p>
                    </div>

                    {/* Responsible Person */}
                    <div className="grid grid-cols-3 gap-6 border-b border-gray-100 py-3">
                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Responsible Person
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-gray-800">
                                {location.responsiblePerson || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Phone
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-gray-800">
                                {location.phone || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Email
                            </p>

                            <p className="mt-1 break-all text-[11px] font-semibold text-gray-800">
                                {location.email || "—"}
                            </p>
                        </div>
                    </div>

                    {/* Deputy */}
                    <div className="grid grid-cols-3 gap-6 py-3">
                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Deputy
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-gray-800">
                                {location.deputyName || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Phone
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-gray-800">
                                {location.deputyPhone || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Email
                            </p>

                            <p className="mt-1 break-all text-[11px] font-semibold text-gray-800">
                                {location.deputyEmail || "—"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ------------------------------------------------------------ */}
                {/* Information Note                                               */}
                {/* ------------------------------------------------------------ */}

                <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />

                    <p className="text-[10px] leading-4 text-gray-500">
                        Responsible person and deputy are both optional — set
                        here or from the Add/Edit Location form. This location
                        feeds Asset Management and Inventory wherever a
                        vehicle or part&apos;s location is selected.
                    </p>
                </div>
            </main>
        </div>
    );
}