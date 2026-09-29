"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PackageSearch } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type SupplierType =
    | "Vehicle"
    | "Spare Parts"
    | "Driver Staffing"
    | "Insurance"
    | "RTO / Compliance";

type SupplierFilter =
    | "all"
    | "vehicles"
    | "parts"
    | "drivers"
    | "compliance";

type SupplierStatus = "active" | "inactive";

type Supplier = {
    id: string;
    name: string;
    type: SupplierType;
    contactPerson: string;
    phone: string;
    email: string;
    status: SupplierStatus;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_SUPPLIERS: Supplier[] = [
    {
        id: "supplier-001",
        name: "Tata Motors Fleet Solutions",
        type: "Vehicle",
        contactPerson: "Rahul Mehta",
        phone: "+91 9876543210",
        email: "rahul@tatamotors.com",
        status: "active",
    },
    {
        id: "supplier-002",
        name: "Bosch Auto Components",
        type: "Spare Parts",
        contactPerson: "Amit Sharma",
        phone: "+91 9876543211",
        email: "amit@bosch.com",
        status: "active",
    },
    {
        id: "supplier-003",
        name: "FleetStaff Services",
        type: "Driver Staffing",
        contactPerson: "Priya Nair",
        phone: "+91 9876543212",
        email: "priya@fleetstaff.com",
        status: "active",
    },
    {
        id: "supplier-004",
        name: "ICICI Lombard Commercial",
        type: "Insurance",
        contactPerson: "Neha Verma",
        phone: "+91 9876543213",
        email: "neha@icicilombard.com",
        status: "inactive",
    },
];

/* -------------------------------------------------------------------------- */
/* Supplier Filter Options                                                    */
/* -------------------------------------------------------------------------- */

const SUPPLIER_FILTERS: {
    label: string;
    value: SupplierFilter;
}[] = [
        {
            label: "All",
            value: "all",
        },
        {
            label: "Vehicles",
            value: "vehicles",
        },
        {
            label: "Parts",
            value: "parts",
        },
        {
            label: "Drivers",
            value: "drivers",
        },
        {
            label: "Compliance",
            value: "compliance",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SuppliersPage() {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [search, setSearch] = useState("");

    const [activeFilter, setActiveFilter] =
        useState<SupplierFilter>("all");

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                             */
    /* ---------------------------------------------------------------------- */

    const handleAddSupplier = () => {
        router.push("/organization/suppliers/create");
    };

    const handleEdit = (supplier: Supplier) => {
        router.push(
            `/organization/suppliers/${supplier.id}/edit`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    const filteredSuppliers = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return MOCK_SUPPLIERS.filter((supplier) => {
            const matchesSearch =
                !searchValue ||
                supplier.name
                    .toLowerCase()
                    .includes(searchValue) ||
                supplier.contactPerson
                    .toLowerCase()
                    .includes(searchValue);

            let matchesFilter = true;

            switch (activeFilter) {
                case "vehicles":
                    matchesFilter =
                        supplier.type === "Vehicle";
                    break;

                case "parts":
                    matchesFilter =
                        supplier.type === "Spare Parts";
                    break;

                case "drivers":
                    matchesFilter =
                        supplier.type === "Driver Staffing";
                    break;

                case "compliance":
                    matchesFilter =
                        supplier.type === "Insurance" ||
                        supplier.type === "RTO / Compliance";
                    break;

                case "all":
                default:
                    matchesFilter = true;
                    break;
            }

            return matchesSearch && matchesFilter;
        });
    }, [search, activeFilter]);

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                          */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearch("");
        setActiveFilter("all");
    };

    /* ---------------------------------------------------------------------- */
    /* Copy Supplier ID                                                       */
    /* ---------------------------------------------------------------------- */

    const handleCopy = async (supplier: Supplier) => {
        try {
            await navigator.clipboard.writeText(
                supplier.id,
            );

            console.log(
                "Supplier ID copied:",
                supplier.id,
            );
        } catch (error) {
            console.error(
                "Failed to copy supplier ID:",
                error,
            );
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const supplierColumns = [
        {
            key: "name",
            label: "Supplier",
        },
        {
            key: "type",
            label: "Type",
        },
        {
            key: "contactPerson",
            label: "Contact Person",
        },
        {
            key: "contact",
            label: "Contact",
            render: (supplier: Supplier) => (
                <DashboardContact
                    phone={supplier.phone}
                    email={supplier.email}
                />
            ),
        },
        {
            key: "status",
            label: "Status",

            render: (supplier: Supplier) => (
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        supplier.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                >
                    {supplier.status === "active"
                        ? "Active"
                        : "Inactive"}
                </span>
            ),
        },
    ];

    return (
        <DashboardLayout
            title="Suppliers"
            description="Shared supplier register — vehicles, spare parts, driver staffing, and insurance/RTO compliance contacts, used across Asset Management and Inventory."
            tabs={[
                {
                    label: "Suppliers",
                    href: "/organization/suppliers",
                },
            ]}
            activeTab="/organization/suppliers"
            action={
                <Button
                    type="button"
                    onClick={handleAddSupplier}
                >
                    + Add Supplier
                </Button>
            }
        >
            {/* ---------------------------------------------------------------- */}
            {/* Supplier Filters                                                  */}
            {/* ---------------------------------------------------------------- */}

            <div className="mb-4 flex items-center gap-3">
                {/* Search */}
                <div className="min-w-0 flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search by supplier or contact person name"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>

                {/* Filter Buttons */}
                <div className="flex shrink-0 items-center gap-1.5">
                    {SUPPLIER_FILTERS.map((filter) => {
                        const isActive =
                            activeFilter === filter.value;

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() =>
                                    setActiveFilter(
                                        filter.value,
                                    )
                                }
                                className={[
                                    "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                                    isActive
                                        ? "border-gray-900 bg-gray-900 text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                            >
                                {filter.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Empty State                                                       */}
            {/* ---------------------------------------------------------------- */}

            {MOCK_SUPPLIERS.length === 0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No suppliers added yet"
                    description="Add your first vehicle, parts, driver-staffing, or compliance-authority supplier."
                    buttonLabel="Add Supplier"
                    onButtonClick={handleAddSupplier}
                />
            ) : filteredSuppliers.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                    <PackageSearch
                        className="mb-3 h-7 w-7 text-gray-400"
                        strokeWidth={1.4}
                    />

                    <h3 className="text-sm font-semibold text-gray-900">
                        No suppliers found
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                        Try changing your search or filters.
                    </p>

                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <DashboardTable
                    columns={supplierColumns}
                    data={filteredSuppliers}
                    getRowKey={(supplier) => supplier.id}
                    renderActions={(supplier) => (
                        <DashboardTableActions
                            status={supplier.status}
                            locationId={supplier.id}
                            onCopy={() =>
                                handleCopy(supplier)
                            }
                            onEdit={() =>
                                handleEdit(supplier)
                            }
                            onToggleStatus={() => {
                                console.log(
                                    "Toggle supplier status:",
                                    supplier.id,
                                );
                            }}
                        />
                    )}
                />
            )}
        </DashboardLayout>
    );
}