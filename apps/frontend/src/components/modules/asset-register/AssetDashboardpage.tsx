"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssetStatus = "active" | "inactive";

type VehicleType = "2-Wheeler" | "3-Wheeler";

type AssetClass = {
  id: string;
  name: string;
  code: string;
  vehicleType: VehicleType;
  fuelType: string;
  inFleet: number;
  available: number;
  status: AssetStatus;
};

type AssetFilter =
  | "all"
  | "2-wheeler"
  | "3-wheeler"
  | "active"
  | "inactive";

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_ASSET_CLASSES: AssetClass[] = [
  {
    id: "asset-class-001",
    name: "Petrol Scooter — Standard",
    code: "PS-GT",
    vehicleType: "2-Wheeler",
    fuelType: "Petrol",
    inFleet: 31,
    available: 8,
    status: "active",
  },
  {
    id: "asset-class-002",
    name: "Petrol Auto — Cargo",
    code: "PA-C80",
    vehicleType: "3-Wheeler",
    fuelType: "Petrol",
    inFleet: 17,
    available: 5,
    status: "active",
  },
  {
    id: "asset-class-003",
    name: "Electric Scooter — Standard",
    code: "ES-GT",
    vehicleType: "2-Wheeler",
    fuelType: "Electric",
    inFleet: 24,
    available: 6,
    status: "active",
  },
  {
    id: "asset-class-004",
    name: "Electric Cargo Auto",
    code: "EA-C80",
    vehicleType: "3-Wheeler",
    fuelType: "Electric",
    inFleet: 12,
    available: 3,
    status: "inactive",
  },
];

/* -------------------------------------------------------------------------- */
/* Filter Options                                                             */
/* -------------------------------------------------------------------------- */

const ASSET_FILTERS: {
  label: string;
  value: AssetFilter;
}[] = [
    {
      label: "All",
      value: "all",
    },
    {
      label: "2-Wheeler",
      value: "2-wheeler",
    },
    {
      label: "3-Wheeler",
      value: "3-wheeler",
    },
    {
      label: "Active",
      value: "active",
    },
    {
      label: "Inactive",
      value: "inactive",
    },
  ];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AssetClassesPage() {
  const router = useRouter();

  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<AssetFilter>("all");

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  const handleAddAssetClass = () => {
    router.push("/asset-register/assestclass/create");
  };

  const handleEdit = (assetClass: AssetClass) => {
    router.push(
      `/asset-register/assestclass/${assetClass.id}/edit`,
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Filtering                                                              */
  /* ---------------------------------------------------------------------- */

  const filteredAssetClasses = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return MOCK_ASSET_CLASSES.filter((assetClass) => {
      const matchesSearch =
        !searchValue ||
        assetClass.name
          .toLowerCase()
          .includes(searchValue) ||
        assetClass.code
          .toLowerCase()
          .includes(searchValue) ||
        assetClass.vehicleType
          .toLowerCase()
          .includes(searchValue) ||
        assetClass.fuelType
          .toLowerCase()
          .includes(searchValue);

      let matchesFilter = true;

      switch (activeFilter) {
        case "2-wheeler":
          matchesFilter =
            assetClass.vehicleType === "2-Wheeler";
          break;

        case "3-wheeler":
          matchesFilter =
            assetClass.vehicleType === "3-Wheeler";
          break;

        case "active":
          matchesFilter =
            assetClass.status === "active";
          break;

        case "inactive":
          matchesFilter =
            assetClass.status === "inactive";
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
  /* Table Columns                                                           */
  /* ---------------------------------------------------------------------- */

  const assetClassColumns = [
    {
      key: "name",
      label: "CLASS",
    },
    {
      key: "code",
      label: "CODE",
    },
    {
      key: "vehicleType",
      label: "VEHICLE TYPE",
    },
    {
      key: "fuelType",
      label: "FUEL TYPE",
    },
    {
      key: "inFleet",
      label: "IN FLEET",
    },
    {
      key: "available",
      label: "AVAILABLE",
    },
    {
      key: "status",
      label: "STATUS",
      render: (assetClass: AssetClass) => (
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            assetClass.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {assetClass.status === "active"
            ? "Active"
            : "Inactive"}
        </span>
      ),
    },
  ];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <DashboardLayout
      title="Asset Classes"
      description="The master list of vehicle classes offered when adding a vehicle or building a lease contract line."
      tabs={[
        {
          label: "Asset Classes",
          href: "/asset-register/assestclass",
        },
      ]}
      activeTab="/asset-register/assestclass"
      action={
        <Button
          type="button"
          onClick={handleAddAssetClass}
        >
          + Add Class
        </Button>
      }
    >
      {/* ---------------------------------------------------------------- */}
      {/* Filters                                                           */}
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
            placeholder="Search by class name or code"
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
          />
        </div>

        {/* Filters */}
        <div className="flex shrink-0 items-center gap-1.5">
          {ASSET_FILTERS.map((filter) => {
            const isActive =
              activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setActiveFilter(filter.value)
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
      {/* Empty / Table                                                    */}
      {/* ---------------------------------------------------------------- */}

      {MOCK_ASSET_CLASSES.length === 0 ? (
        <DashboardEmptyState
          icon={
            <PackageSearch
              className="h-7 w-7"
              strokeWidth={1.4}
            />
          }
          title="No asset classes added yet"
          description="Add your first asset class to use when adding vehicles or building lease contract lines."
          buttonLabel="Add Class"
          onButtonClick={handleAddAssetClass}
        />
      ) : filteredAssetClasses.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
          <PackageSearch
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />

          <h3 className="text-sm font-semibold text-gray-900">
            No asset classes found
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
          columns={assetClassColumns}
          data={filteredAssetClasses}
          getRowKey={(assetClass) => assetClass.id}
          renderActions={(assetClass) => (
            <DashboardTableActions
              status={assetClass.status}
              locationId={assetClass.id}
              viewHref={`/asset-register/assestclass/${assetClass.id}`}
              onEdit={() =>
                handleEdit(assetClass)
              }
              onToggleStatus={() => {
                console.log(
                  "Toggle asset class status:",
                  assetClass.id,
                );
              }}
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}