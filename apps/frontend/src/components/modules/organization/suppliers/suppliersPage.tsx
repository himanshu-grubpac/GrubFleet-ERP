"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Star,
  ShieldCheck,
  X,
  FileCheck,
  AlertCircle,
  Tag,
  DollarSign,
} from "lucide-react";
import { OrganizationSubNav } from "../organization-subnav";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import {
  DASHBOARD_DEFAULT_PAGE_SIZE,
  paginateClientRows,
} from "@/components/dashboard/dashboard-pagination";

export type SupplierRecord = {
  id: string;
  code: string;
  companyName: string;
  category:
    | "OEM Dealerships"
    | "Spare Parts"
    | "Telematics & IoT"
    | "Tires & Batteries"
    | "Fuel & Lubricants"
    | "Insurance & Legal";
  contactPerson: string;
  email: string;
  phone: string;
  taxNumber: string;
  paymentTerms: "Net 15" | "Net 30" | "Net 60" | "Cash on Delivery";
  rating: number;
  complianceStatus: "Verified" | "Expiring Soon" | "Pending Review";
  status: "Preferred" | "Active" | "Under Review" | "Suspended";
  annualSpend: string;
};

const initialSuppliers: SupplierRecord[] = [
  {
    id: "sup-1",
    code: "SUP-ALF-01",
    companyName: "Al-Futtaim Automotive Group",
    category: "OEM Dealerships",
    contactPerson: "Marc Vanderberg",
    email: "m.vanderberg@alfuttaim.ae",
    phone: "+971 4 208 5000",
    taxNumber: "AE-TRN-1002391000",
    paymentTerms: "Net 30",
    rating: 4.9,
    complianceStatus: "Verified",
    status: "Preferred",
    annualSpend: "AED 3,450,000",
  },
  {
    id: "sup-2",
    code: "SUP-BRD-02",
    companyName: "Bridgestone Middle East & Africa",
    category: "Tires & Batteries",
    contactPerson: "Kenji Sato",
    email: "fleet-sales@bridgestone-me.com",
    phone: "+971 4 887 0122",
    taxNumber: "AE-TRN-1003450912",
    paymentTerms: "Net 60",
    rating: 4.8,
    complianceStatus: "Verified",
    status: "Preferred",
    annualSpend: "AED 820,000",
  },
  {
    id: "sup-3",
    code: "SUP-GEO-03",
    companyName: "Geotab Fleet Telematics UAE",
    category: "Telematics & IoT",
    contactPerson: "Lina Al-Husseini",
    email: "support.ae@geotab-partner.com",
    phone: "+971 4 449 8100",
    taxNumber: "AE-TRN-1008892134",
    paymentTerms: "Net 30",
    rating: 4.7,
    complianceStatus: "Verified",
    status: "Active",
    annualSpend: "AED 490,000",
  },
  {
    id: "sup-4",
    code: "SUP-ADN-04",
    companyName: "ADNOC Distribution Fleet Services",
    category: "Fuel & Lubricants",
    contactPerson: "Sultan Al-Dhaheri",
    email: "corporate.cards@adnocdistribution.ae",
    phone: "+971 2 677 1300",
    taxNumber: "AE-TRN-1001128794",
    paymentTerms: "Net 15",
    rating: 4.9,
    complianceStatus: "Verified",
    status: "Preferred",
    annualSpend: "AED 2,150,000",
  },
  {
    id: "sup-5",
    code: "SUP-BOS-05",
    companyName: "Bosch Auto Parts Regional Distribution",
    category: "Spare Parts",
    contactPerson: "Dietmar Weber",
    email: "parts.me@bosch-aftermarket.com",
    phone: "+971 4 333 4410",
    taxNumber: "AE-TRN-1009941203",
    paymentTerms: "Net 30",
    rating: 4.6,
    complianceStatus: "Expiring Soon",
    status: "Active",
    annualSpend: "AED 610,000",
  },
  {
    id: "sup-6",
    code: "SUP-ORX-06",
    companyName: "Oryx Fleet Insurance Brokers",
    category: "Insurance & Legal",
    contactPerson: "Nabil Farooq",
    email: "underwriting@oryxinsurance.ae",
    phone: "+971 4 391 7700",
    taxNumber: "AE-TRN-1005541890",
    paymentTerms: "Net 30",
    rating: 4.3,
    complianceStatus: "Pending Review",
    status: "Under Review",
    annualSpend: "AED 1,200,000",
  },
];

export function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState<SupplierRecord | null>(null);
  const [page, setPage] = useState(1);

  // Add Supplier Form State
  const [companyName, setCompanyName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<SupplierRecord["category"]>("Spare Parts");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<SupplierRecord["paymentTerms"]>("Net 30");

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      const matchesSearch =
        sup.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.taxNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "ALL" || sup.category === selectedCategory;

      const matchesStat =
        selectedStatus === "ALL" || sup.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStat;
    });
  }, [suppliers, searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedStatus]);

  const {
    rows: paginatedSuppliers,
    safePage: suppliersPage,
    total: suppliersTotal,
  } = paginateClientRows(
    filteredSuppliers,
    page,
    DASHBOARD_DEFAULT_PAGE_SIZE,
  );

  const preferredCount = suppliers.filter((s) => s.status === "Preferred").length;
  const pendingCount = suppliers.filter((s) => s.complianceStatus !== "Verified").length;

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !code.trim()) return;

    const newSup: SupplierRecord = {
      id: `sup-${Date.now()}`,
      code: code.trim().toUpperCase(),
      companyName: companyName.trim(),
      category,
      contactPerson: contactPerson.trim() || "Account Representative",
      email: email.trim() || "vendor@partner.com",
      phone: phone.trim() || "+971 4 000 0000",
      taxNumber: taxNumber.trim() || "AE-TRN-1000000000",
      paymentTerms,
      rating: 5.0,
      complianceStatus: "Verified",
      status: "Active",
      annualSpend: "AED 0",
    };

    setSuppliers([newSup, ...suppliers]);
    setIsAddModalOpen(false);

    // Reset
    setCompanyName("");
    setCode("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setTaxNumber("");
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
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Suppliers &amp; Vendors
              </h1>
              <p className="text-xs text-slate-500">
                Manage OEM partners, spare parts distributors, telematics vendors, and maintenance contractors.
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
            Add Supplier
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Vendors
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{suppliers.length}</span>
            <span className="text-xs font-medium text-emerald-600">Approved Vendors</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">6 Specialized categories</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Preferred Tier
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{preferredCount}</span>
            <span className="text-xs text-slate-500">Key OEM Partners</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Priority SLA agreements</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contract Volume
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">AED 8.7M</span>
            <span className="text-xs font-medium text-purple-600">YTD Procurement</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">92% on Net 30/60</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Compliance Alerts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
            <span className="text-xs font-medium text-amber-600">Require Audit</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">VAT &amp; Trade License checks</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company, vendor code, contact, tax TRN..."
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="OEM Dealerships">OEM Dealerships</option>
            <option value="Spare Parts">Spare Parts</option>
            <option value="Telematics & IoT">Telematics &amp; IoT</option>
            <option value="Tires & Batteries">Tires &amp; Batteries</option>
            <option value="Fuel & Lubricants">Fuel &amp; Lubricants</option>
            <option value="Insurance & Legal">Insurance &amp; Legal</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Preferred">Preferred Tier</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Vendor / Entity</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Key Contact</th>
                <th className="px-5 py-3.5">Payment Terms</th>
                <th className="px-5 py-3.5">Compliance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Truck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No suppliers found</p>
                    <p className="mt-1 text-xs">Try clearing the search or category filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Entity */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#FE5720] transition-colors">
                        {sup.companyName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                          {sup.code}
                        </span>
                        <span className="text-slate-400">• {sup.taxNumber}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {sup.category}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{sup.contactPerson}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{sup.email}</span>
                      </div>
                    </td>

                    {/* Terms & Spend */}
                    <td className="px-5 py-4">
                      <span className="inline-block font-medium text-slate-700">
                        {sup.paymentTerms}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        Annual: {sup.annualSpend}
                      </div>
                    </td>

                    {/* Compliance */}
                    <td className="px-5 py-4">
                      {sup.complianceStatus === "Verified" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Verified
                        </span>
                      )}
                      {sup.complianceStatus === "Expiring Soon" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          Expiring (15d)
                        </span>
                      )}
                      {sup.complianceStatus === "Pending Review" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                          <FileCheck className="h-3.5 w-3.5 text-purple-600" />
                          Pending Audit
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {sup.status === "Preferred" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                          Preferred
                        </span>
                      )}
                      {sup.status === "Active" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          Active
                        </span>
                      )}
                      {sup.status === "Under Review" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Reviewing
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setViewSupplier(sup)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                      >
                        View Profile
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
            page={suppliersPage}
            pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
            total={suppliersTotal}
            onPageChange={setPage}
            className="mt-0"
          />
        </div>
      </div>

      {/* ADD SUPPLIER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Supplier / Vendor</h3>
                  <p className="text-xs text-slate-500">Register a new fleet supplier or maintenance vendor.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Michelin Fleet Solutions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Vendor Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUP-MCH-07"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupplierRecord["category"])}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="OEM Dealerships">OEM Dealerships</option>
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Telematics & IoT">Telematics &amp; IoT</option>
                    <option value="Tires & Batteries">Tires &amp; Batteries</option>
                    <option value="Fuel & Lubricants">Fuel &amp; Lubricants</option>
                    <option value="Insurance & Legal">Insurance &amp; Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as SupplierRecord["paymentTerms"])}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Tax TRN / VAT Registration No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AE-TRN-1002345000"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Account Manager / Contact Name
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="vendor@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Phone Number
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SUPPLIER PROFILE MODAL */}
      {viewSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="inline-block rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-[#FE5720]">
                  {viewSupplier.code}
                </span>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {viewSupplier.companyName}
                </h3>
                <p className="text-xs text-slate-500">{viewSupplier.category}</p>
              </div>
              <button
                onClick={() => setViewSupplier(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Partner Status
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                    {viewSupplier.status}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Payment Terms
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-800">
                    {viewSupplier.paymentTerms}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Tax Registration &amp; Legal
                </span>
                <p className="text-xs font-mono font-semibold text-slate-800">
                  {viewSupplier.taxNumber}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Compliance Status: {viewSupplier.complianceStatus}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Key Contact Person
                </span>
                <p className="text-xs font-bold text-slate-800">{viewSupplier.contactPerson}</p>
                <p className="text-xs text-slate-600">{viewSupplier.email} • {viewSupplier.phone}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Annual Procurement Spend
                </span>
                <p className="mt-1 text-base font-bold text-slate-900">{viewSupplier.annualSpend}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewSupplier(null)}
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
