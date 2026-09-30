"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Car,
  Building,
  DollarSign,
  ShieldCheck,
  X,
} from "lucide-react";
import { OrganizationSubNav } from "../organization-subnav";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import {
  DASHBOARD_DEFAULT_PAGE_SIZE,
  paginateClientRows,
} from "@/components/dashboard/dashboard-pagination";

export type ClientRecord = {
  id: string;
  clientCode: string;
  companyName: string;
  industry: "Quick-Commerce" | "Food & Beverage" | "3PL Logistics" | "E-commerce" | "Corporate Enterprise";
  accountManager: string;
  contactPerson: string;
  email: string;
  phone: string;
  leasedVehiclesCount: number;
  monthlyRevenue: string;
  contractStatus: "Active" | "Renewal Due" | "Onboarding" | "Suspended";
  joinedDate: string;
};

const initialClients: ClientRecord[] = [
  {
    id: "cli-1",
    clientCode: "CLI-TAL-01",
    companyName: "Talabat Delivery Logistics UAE",
    industry: "Quick-Commerce",
    accountManager: "Sarah Jenkins",
    contactPerson: "Kareem El-Sayed",
    email: "fleet.ops@talabat.com",
    phone: "+971 4 456 7890",
    leasedVehiclesCount: 180,
    monthlyRevenue: "AED 340,000",
    contractStatus: "Active",
    joinedDate: "2023-03-15",
  },
  {
    id: "cli-2",
    clientCode: "CLI-NOO-02",
    companyName: "Noon Express Logistics",
    industry: "E-commerce",
    accountManager: "Sarah Jenkins",
    contactPerson: "Majid Al-Suwaidi",
    email: "fleet-partners@noon.com",
    phone: "+971 4 800 6666",
    leasedVehiclesCount: 140,
    monthlyRevenue: "AED 290,000",
    contractStatus: "Active",
    joinedDate: "2023-05-20",
  },
  {
    id: "cli-3",
    clientCode: "CLI-AMZ-03",
    companyName: "Amazon Middle East Middle Mile",
    industry: "3PL Logistics",
    accountManager: "Ahmad Tariq",
    contactPerson: "David Miller",
    email: "uae-fleet@amazon.com",
    phone: "+971 4 700 1234",
    leasedVehiclesCount: 120,
    monthlyRevenue: "AED 260,000",
    contractStatus: "Renewal Due",
    joinedDate: "2022-10-01",
  },
  {
    id: "cli-4",
    clientCode: "CLI-CAR-04",
    companyName: "Careem Quick Delivery",
    industry: "Quick-Commerce",
    accountManager: "Sarah Jenkins",
    contactPerson: "Sami Haddad",
    email: "captains-fleet@careem.com",
    phone: "+971 4 440 5222",
    leasedVehiclesCount: 95,
    monthlyRevenue: "AED 180,000",
    contractStatus: "Active",
    joinedDate: "2023-09-10",
  },
  {
    id: "cli-5",
    clientCode: "CLI-KFC-05",
    companyName: "Americana Food Delivery Fleet",
    industry: "Food & Beverage",
    accountManager: "Ahmad Tariq",
    contactPerson: "Ashraf Nour",
    email: "logistics@americana-group.com",
    phone: "+971 4 330 9900",
    leasedVehiclesCount: 65,
    monthlyRevenue: "AED 125,000",
    contractStatus: "Onboarding",
    joinedDate: "2024-03-01",
  },
];

export function ClientsModule() {
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<ClientRecord | null>(null);
  const [page, setPage] = useState(1);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [industry, setIndustry] = useState<ClientRecord["industry"]>("Quick-Commerce");
  const [accountManager, setAccountManager] = useState("Sarah Jenkins");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leasedVehiclesCount, setLeasedVehiclesCount] = useState(25);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clientCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.accountManager.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesInd =
        selectedIndustry === "ALL" || c.industry === selectedIndustry;

      const matchesStat =
        selectedStatus === "ALL" || c.contractStatus === selectedStatus;

      return matchesSearch && matchesInd && matchesStat;
    });
  }, [clients, searchQuery, selectedIndustry, selectedStatus]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedIndustry, selectedStatus]);

  const {
    rows: paginatedClients,
    safePage: clientsPage,
    total: clientsTotal,
  } = paginateClientRows(
    filteredClients,
    page,
    DASHBOARD_DEFAULT_PAGE_SIZE,
  );

  const totalLeased = clients.reduce((acc, c) => acc + c.leasedVehiclesCount, 0);
  const activeClientsCount = clients.filter((c) => c.contractStatus === "Active").length;

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !clientCode.trim()) return;

    const newClient: ClientRecord = {
      id: `cli-${Date.now()}`,
      clientCode: clientCode.trim().toUpperCase(),
      companyName: companyName.trim(),
      industry,
      accountManager,
      contactPerson: contactPerson.trim() || "Operations Lead",
      email: email.trim() || "contact@client.com",
      phone: phone.trim() || "+971 4 000 0000",
      leasedVehiclesCount: Number(leasedVehiclesCount) || 10,
      monthlyRevenue: "AED 50,000",
      contractStatus: "Active",
      joinedDate: new Date().toISOString().split("T")[0],
    };

    setClients([newClient, ...clients]);
    setIsAddModalOpen(false);

    // Reset
    setCompanyName("");
    setClientCode("");
    setContactPerson("");
    setEmail("");
    setPhone("");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Header */}
      <OrganizationSubNav />

      {/* Page Title & Actions */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-[#FE5720]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Corporate Clients &amp; B2B Accounts
              </h1>
              <p className="text-xs text-slate-500">
                Enterprise fleet lease clients, contract management, account managers, and allocation volume.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FE5720] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e04815] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Accounts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{clients.length}</span>
            <span className="text-xs font-medium text-emerald-600">Enterprise Leases</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Q-Commerce &amp; 3PL dominance</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Contracts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{activeClientsCount}</span>
            <span className="text-xs text-slate-500">/ {clients.length} active</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">100% compliant contracts</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Leased Fleet
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalLeased}</span>
            <span className="text-xs font-medium text-purple-600">Vehicles Allocated</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Vans, trucks &amp; delivery bikes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly Lease Billing
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">AED 1.19M</span>
            <span className="text-xs font-medium text-amber-600">Recurring MRR</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Avg 24-month lease terms</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, code, contact person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Industries</option>
            <option value="Quick-Commerce">Quick-Commerce</option>
            <option value="Food & Beverage">Food &amp; Beverage</option>
            <option value="3PL Logistics">3PL Logistics</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Corporate Enterprise">Corporate Enterprise</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Renewal Due">Renewal Due</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Client Enterprise</th>
                <th className="px-5 py-3.5">Industry</th>
                <th className="px-5 py-3.5">Key Contact</th>
                <th className="px-5 py-3.5">Leased Vehicles</th>
                <th className="px-5 py-3.5">Account Manager</th>
                <th className="px-5 py-3.5">Contract Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No clients found</p>
                    <p className="mt-1 text-xs">Try clearing the search or industry filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Entity */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#FE5720] transition-colors">
                        {client.companyName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                          {client.clientCode}
                        </span>
                        <span>• Since {client.joinedDate}</span>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        {client.industry}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{client.contactPerson}</div>
                      <div className="text-[11px] text-slate-400">{client.email}</div>
                    </td>

                    {/* Leased Vehicles */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Car className="h-4 w-4 text-[#FE5720]" />
                        <span>{client.leasedVehiclesCount} Units</span>
                      </div>
                      <div className="text-[11px] text-slate-500">MRR: {client.monthlyRevenue}</div>
                    </td>

                    {/* Manager */}
                    <td className="px-5 py-4">
                      <div className="text-slate-800 font-medium">{client.accountManager}</div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {client.contractStatus === "Active" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active Contract
                        </span>
                      )}
                      {client.contractStatus === "Renewal Due" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Renewal Due
                        </span>
                      )}
                      {client.contractStatus === "Onboarding" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          Onboarding
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setViewClient(client)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                      >
                        Account File
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <DashboardTablePagination
            page={clientsPage}
            pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
            total={clientsTotal}
            onPageChange={setPage}
            className="mt-0"
          />
        </div>
      </div>

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Corporate Client</h3>
                  <p className="text-xs text-slate-500">Create an enterprise lease client profile and contract.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deliveroo UAE Logistics"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Client Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CLI-DEL-06"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Industry Sector
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value as ClientRecord["industry"])}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Quick-Commerce">Quick-Commerce</option>
                    <option value="Food & Beverage">Food &amp; Beverage</option>
                    <option value="3PL Logistics">3PL Logistics</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Corporate Enterprise">Corporate Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Initial Leased Fleet (Units)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={leasedVehiclesCount}
                    onChange={(e) => setLeasedVehiclesCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Assigned Account Manager
                  </label>
                  <select
                    value={accountManager}
                    onChange={(e) => setAccountManager(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Sarah Jenkins">Sarah Jenkins (Enterprise Accounts)</option>
                    <option value="Ahmad Tariq">Ahmad Tariq (Logistics &amp; 3PL)</option>
                    <option value="Mariam Al-Mansouri">Mariam Al-Mansouri (Quick-Commerce)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Key Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="Contact person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="fleet@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+971 4 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FE5720] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#e04815] transition"
                >
                  <Plus className="h-4 w-4" />
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CLIENT PROFILE MODAL */}
      {viewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="inline-block rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-[#FE5720]">
                  {viewClient.clientCode}
                </span>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {viewClient.companyName}
                </h3>
                <p className="text-xs text-slate-500">{viewClient.industry}</p>
              </div>
              <button
                onClick={() => setViewClient(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Leased Fleet Volume
                  </span>
                  <span className="mt-1 block text-base font-bold text-slate-900">
                    {viewClient.leasedVehiclesCount} Units
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Monthly Lease Billing
                  </span>
                  <span className="mt-1 block text-base font-bold text-emerald-700">
                    {viewClient.monthlyRevenue}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Account Manager
                </span>
                <p className="text-xs font-bold text-slate-800">{viewClient.accountManager}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Client Primary Contact
                </span>
                <p className="text-xs font-bold text-slate-800">{viewClient.contactPerson}</p>
                <p className="text-xs text-slate-600">{viewClient.email} • {viewClient.phone}</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600">
                <span>Contract Status:</span>
                <span className="font-bold text-emerald-700">{viewClient.contractStatus}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewClient(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
