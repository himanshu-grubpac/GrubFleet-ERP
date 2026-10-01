"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ClientStatus = "active" | "inactive";

type Client = {
  id: string;
  company: string;
  primaryPoc: string;
  phone: string;
  email: string;
  contracts: number;
  status: ClientStatus;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_CLIENTS: Client[] = [
  {
    id: "client-001",
    company: "Meridian Logistics Pvt Ltd",
    primaryPoc: "Aditi Rao",
    phone: "+91 9876543201",
    email: "aditi.rao@meridianlogistics.example",
    contracts: 3,
    status: "active",
  },
  {
    id: "client-002",
    company: "Silverline Distribution Co",
    primaryPoc: "Farhan Sheikh",
    phone: "+91 9876543202",
    email: "farhan.sheikh@silverline.example",
    contracts: 1,
    status: "active",
  },
  {
    id: "client-003",
    company: "Northgate Freight Services",
    primaryPoc: "Priya Menon",
    phone: "+91 9876543203",
    email: "priya.menon@northgatefreight.example",
    contracts: 0,
    status: "active",
  },
  {
    id: "client-004",
    company: "Bluepeak Transport Solutions",
    primaryPoc: "Rohan Kapoor",
    phone: "+91 9876543204",
    email: "rohan.kapoor@bluepeaktransport.example",
    contracts: 5,
    status: "active",
  },
  {
    id: "client-005",
    company: "Coastal Retail Distribution",
    primaryPoc: "Neha Kulkarni",
    phone: "+91 9876543205",
    email: "neha.kulkarni@coastalretail.example",
    contracts: 2,
    status: "active",
  },
  {
    id: "client-006",
    company: "Vertex Pharma Logistics",
    primaryPoc: "Sameer Joshi",
    phone: "+91 9876543206",
    email: "sameer.joshi@vertexpharma.example",
    contracts: 4,
    status: "active",
  },
  {
    id: "client-007",
    company: "Anchor Beverages Pvt Ltd",
    primaryPoc: "Ritika Shah",
    phone: "+91 9876543207",
    email: "ritika.shah@anchorbeverages.example",
    contracts: 1,
    status: "active",
  },
  {
    id: "client-008",
    company: "Skyline Facility Services",
    primaryPoc: "Imran Pathan",
    phone: "+91 9876543208",
    email: "imran.pathan@skylinefacility.example",
    contracts: 0,
    status: "active",
  },
  {
    id: "client-009",
    company: "Greenfield Agro Traders",
    primaryPoc: "Pooja Nair",
    phone: "+91 9876543209",
    email: "pooja.nair@greenfieldagro.example",
    contracts: 2,
    status: "active",
  },
  {
    id: "client-010",
    company: "Trident Courier Network",
    primaryPoc: "Vivek Deshmukh",
    phone: "+91 9876543210",
    email: "vivek.deshmukh@tridentcourier.example",
    contracts: 3,
    status: "active",
  },
];

/* -------------------------------------------------------------------------- */
/* Client Filters                                                             */
/* -------------------------------------------------------------------------- */

const CLIENT_FILTERS = [
  {
    label: "All",
    value: "all",
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

export default function ClientDashboardPage() {
  const router = useRouter();

  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  const handleAddClient = () => {
    router.push("/organization/clients/create");
  };

  const handleEdit = (client: Client) => {
    router.push(
      `/organization/clients/${client.id}/edit`,
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Filtering                                                              */
  /* ---------------------------------------------------------------------- */

  const filteredClients = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return MOCK_CLIENTS.filter((client) => {
      const matchesSearch =
        !searchValue ||
        client.company
          .toLowerCase()
          .includes(searchValue) ||
        client.primaryPoc
          .toLowerCase()
          .includes(searchValue);

      let matchesFilter = true;

      switch (activeFilter) {
        case "active":
          matchesFilter =
            client.status === "active";
          break;

        case "inactive":
          matchesFilter =
            client.status === "inactive";
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
  /* Table Columns                                                          */
  /* ---------------------------------------------------------------------- */

  const clientColumns = [
    {
      key: "company",
      label: "COMPANY",
      render: (client: Client) => (
        <span className="font-medium uppercase text-gray-900">
          {client.company}
        </span>
      ),
    },

    {
      key: "primaryPoc",
      label: "PRIMARY POC",
      render: (client: Client) => (
        <span className="text-sm text-gray-700">
          {client.primaryPoc}
        </span>
      ),
    },

    {
      key: "contact",
      label: "CONTACT",
      render: (client: Client) => (
        <DashboardContact
          phone={client.phone}
          email={client.email}
        />
      ),
    },

    {
      key: "contracts",
      label: "CONTRACTS",
      render: (client: Client) => (
        <span className="text-sm text-gray-700">
          {client.contracts}
        </span>
      ),
    },
  ];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <DashboardLayout
      title="Clients"
      description="Client register — companies, primary points of contact, contact details, and active contracts."
      tabs={[
        {
          label: "Clients",
          href: "/customer",
        },
      ]}
      activeTab="/customer"
      action={
        <Button
          type="button"
          onClick={handleAddClient}
        >
          + Add Client
        </Button>
      }
    >
      {/* ---------------------------------------------------------------- */}
      {/* Client Filters                                                   */}
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
            placeholder="Search by company or point of contact name"
            className="
                            h-9
                            w-full
                            rounded-md
                            border
                            border-gray-200
                            bg-white
                            px-3
                            text-sm
                            text-gray-900
                            outline-none
                            placeholder:text-gray-400
                            focus:border-gray-300
                            focus:ring-1
                            focus:ring-gray-200
                        "
          />
        </div>

      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Empty State                                                      */}
      {/* ---------------------------------------------------------------- */}

      {MOCK_CLIENTS.length === 0 ? (
        <DashboardEmptyState
          icon={
            <Building2
              className="h-7 w-7"
              strokeWidth={1.4}
            />
          }
          title="No clients added yet"
          description="Add your first client to this organisation."
          buttonLabel="Add Client"
          onButtonClick={handleAddClient}
        />
      ) : filteredClients.length === 0 ? (
        <div
          className="
                        flex
                        min-h-[180px]
                        flex-col
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-gray-200
                        bg-white
                        text-center
                    "
        >
          <Building2
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />

          <h3 className="text-sm font-semibold text-gray-900">
            No clients found
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Try changing your search or filters.
          </p>

          <button
            type="button"
            onClick={handleClearFilters}
            className="
                            mt-3
                            text-xs
                            font-medium
                            text-[#FE5720]
                            hover:underline
                        "
          >
            Clear filters
          </button>
        </div>
      ) : (
        <DashboardTable
          columns={clientColumns}
          data={filteredClients}
          getRowKey={(client) => client.id}
          renderActions={(client) => (
            <DashboardTableActions
              status={client.status}
              locationId={client.id}
              viewHref={`/organization/clients/${client.id}`}
              onEdit={() =>
                handleEdit(client)
              }
              onToggleStatus={() => {
                console.log(
                  "Toggle client status:",
                  client.id,
                );
              }}
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}