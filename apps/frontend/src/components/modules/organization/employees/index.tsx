"use client";

import React, { useState, useMemo } from "react";
import {
  UserRound,
  Plus,
  Search,
  Filter,
  Users,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Calendar,
  X,
  Shield,
  CheckCircle2,
  Clock,
  Building,
} from "lucide-react";
import { OrganizationSubNav } from "../organization-subnav";

export type EmployeeRecord = {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  department:
    | "Fleet Operations"
    | "Workshop & Maintenance"
    | "Dispatch & Logistics"
    | "Customer Success"
    | "Finance & Legal"
    | "Administration";
  hubLocation: string;
  email: string;
  phone: string;
  employmentType: "Full-Time" | "Contractor" | "Part-Time";
  status: "Active" | "On Leave" | "Suspended";
  joinedDate: string;
};

const initialEmployees: EmployeeRecord[] = [
  {
    id: "emp-1",
    employeeCode: "EMP-DXB-101",
    fullName: "Ahmad Tariq",
    jobTitle: "Senior Fleet Operations Director",
    department: "Fleet Operations",
    hubLocation: "Dubai Central Logistics Hub",
    email: "ahmad.tariq@grubfleet.io",
    phone: "+971 50 123 4567",
    employmentType: "Full-Time",
    status: "Active",
    joinedDate: "2023-01-15",
  },
  {
    id: "emp-2",
    employeeCode: "EMP-DXB-102",
    fullName: "Mariam Al-Mansouri",
    jobTitle: "Lead Fleet Dispatch Coordinator",
    department: "Dispatch & Logistics",
    hubLocation: "Dubai Central Logistics Hub",
    email: "mariam.m@grubfleet.io",
    phone: "+971 52 345 6789",
    employmentType: "Full-Time",
    status: "Active",
    joinedDate: "2023-04-10",
  },
  {
    id: "emp-3",
    employeeCode: "EMP-SHJ-204",
    fullName: "Bilal Farouqi",
    jobTitle: "Master Workshop Technician",
    department: "Workshop & Maintenance",
    hubLocation: "Sharjah Rapid Maintenance Yard",
    email: "bilal.f@grubfleet.io",
    phone: "+971 55 987 6543",
    employmentType: "Full-Time",
    status: "Active",
    joinedDate: "2022-11-01",
  },
  {
    id: "emp-4",
    employeeCode: "EMP-AUH-305",
    fullName: "Sarah Jenkins",
    jobTitle: "Key Account Client Manager",
    department: "Customer Success",
    hubLocation: "Abu Dhabi South Depot",
    email: "sarah.j@grubfleet.io",
    phone: "+971 50 776 5432",
    employmentType: "Full-Time",
    status: "On Leave",
    joinedDate: "2023-08-20",
  },
  {
    id: "emp-5",
    employeeCode: "EMP-DIP-410",
    fullName: "Zubair Khan",
    jobTitle: "Yard Safety & Staging Inspector",
    department: "Fleet Operations",
    hubLocation: "Dubai Investments Park Hub",
    email: "zubair.k@grubfleet.io",
    phone: "+971 54 223 8899",
    employmentType: "Contractor",
    status: "Active",
    joinedDate: "2024-02-01",
  },
  {
    id: "emp-6",
    employeeCode: "EMP-DXB-501",
    fullName: "Pooja Sharma",
    jobTitle: "Fleet Financial Analyst",
    department: "Finance & Legal",
    hubLocation: "Dubai Central Logistics Hub",
    email: "pooja.s@grubfleet.io",
    phone: "+971 56 112 3344",
    employmentType: "Full-Time",
    status: "Active",
    joinedDate: "2023-06-15",
  },
];

export function EmployeesModule() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState<EmployeeRecord | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState<EmployeeRecord["department"]>("Fleet Operations");
  const [hubLocation, setHubLocation] = useState("Dubai Central Logistics Hub");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employmentType, setEmploymentType] = useState<EmployeeRecord["employmentType"]>("Full-Time");

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.hubLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        selectedDept === "ALL" || emp.department === selectedDept;

      const matchesStat =
        selectedStatus === "ALL" || emp.status === selectedStatus;

      return matchesSearch && matchesDept && matchesStat;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;
  const opsCount = employees.filter(
    (e) => e.department === "Fleet Operations" || e.department === "Workshop & Maintenance"
  ).length;

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !employeeCode.trim()) return;

    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      employeeCode: employeeCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      jobTitle: jobTitle.trim() || "Operations Associate",
      department,
      hubLocation,
      email: email.trim() || "staff@grubfleet.io",
      phone: phone.trim() || "+971 50 000 0000",
      employmentType,
      status: "Active",
      joinedDate: new Date().toISOString().split("T")[0],
    };

    setEmployees([newEmp, ...employees]);
    setIsAddModalOpen(false);

    // Reset
    setFullName("");
    setEmployeeCode("");
    setJobTitle("");
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
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Workforce &amp; Employees
              </h1>
              <p className="text-xs text-slate-500">
                Staff directory, department allocations, duty stations, and workforce roster.
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
            Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Headcount
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{employees.length}</span>
            <span className="text-xs font-medium text-emerald-600">Staff Members</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Across 6 departments</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active on Roster
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
            <span className="text-xs text-slate-500">active staff</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">95% roster attendance</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ops &amp; Maintenance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{opsCount}</span>
            <span className="text-xs font-medium text-purple-600">Field Engineers &amp; Techs</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Dedicated yard crews</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              On Leave
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{onLeaveCount}</span>
            <span className="text-xs font-medium text-amber-600">Scheduled Leave</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">All shifts covered</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, employee code, job title, hub..."
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
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Fleet Operations">Fleet Operations</option>
            <option value="Workshop & Maintenance">Workshop &amp; Maintenance</option>
            <option value="Dispatch & Logistics">Dispatch &amp; Logistics</option>
            <option value="Customer Success">Customer Success</option>
            <option value="Finance & Legal">Finance &amp; Legal</option>
            <option value="Administration">Administration</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Role &amp; Department</th>
                <th className="px-5 py-3.5">Assigned Facility</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No employees found</p>
                    <p className="mt-1 text-xs">Try clearing the search or department filter.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Employee Profile */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 group-hover:bg-orange-100 group-hover:text-[#FE5720] transition-colors">
                          {emp.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-[#FE5720] transition-colors">
                            {emp.fullName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {emp.employeeCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Dept */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{emp.jobTitle}</div>
                      <span className="inline-block mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {emp.department}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{emp.hubLocation}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="text-slate-800">{emp.email}</div>
                      <div className="text-[11px] text-slate-400">{emp.phone}</div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {emp.employmentType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {emp.status === "Active" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                      {emp.status === "On Leave" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          On Leave
                        </span>
                      )}
                      {emp.status === "Suspended" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Suspended
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setViewEmployee(emp)}
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
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Staff Member</h3>
                  <p className="text-xs text-slate-500">Provision a new employee record and assign to an operating facility.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Mansour"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-DXB-108"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as EmployeeRecord["department"])}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Fleet Operations">Fleet Operations</option>
                    <option value="Workshop & Maintenance">Workshop &amp; Maintenance</option>
                    <option value="Dispatch & Logistics">Dispatch &amp; Logistics</option>
                    <option value="Customer Success">Customer Success</option>
                    <option value="Finance & Legal">Finance &amp; Legal</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Designation / Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Workshop Supervisor"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Assigned Hub / Depot
                  </label>
                  <select
                    value={hubLocation}
                    onChange={(e) => setHubLocation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Dubai Central Logistics Hub">Dubai Central Logistics Hub</option>
                    <option value="Abu Dhabi South Depot">Abu Dhabi South Depot</option>
                    <option value="Sharjah Rapid Maintenance Yard">Sharjah Rapid Maintenance Yard</option>
                    <option value="Dubai Investments Park Hub">Dubai Investments Park Hub</option>
                    <option value="Ajman Express Depot">Ajman Express Depot</option>
                    <option value="Ras Al Khaimah Fleet Service Center">Ras Al Khaimah Fleet Service Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmployeeRecord["employmentType"])}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Part-Time">Part-Time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="employee@grubfleet.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Mobile Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+971 50 000 0000"
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
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW EMPLOYEE PROFILE MODAL */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-[#FE5720]">
                  {viewEmployee.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-700">
                    {viewEmployee.employeeCode}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {viewEmployee.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">{viewEmployee.jobTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setViewEmployee(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Department
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900">
                    {viewEmployee.department}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Employment
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900">
                    {viewEmployee.employmentType}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Duty Location / Facility
                </span>
                <p className="text-xs font-bold text-slate-800">{viewEmployee.hubLocation}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Contact Information
                </span>
                <p className="text-xs text-slate-800 font-medium">{viewEmployee.email}</p>
                <p className="text-xs text-slate-600">{viewEmployee.phone}</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600">
                <span>Joined Organization:</span>
                <span className="font-semibold text-slate-900">{viewEmployee.joinedDate}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewEmployee(null)}
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
