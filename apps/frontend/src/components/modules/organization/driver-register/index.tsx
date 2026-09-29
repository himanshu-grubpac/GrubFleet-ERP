"use client";

import React, { useState, useMemo } from "react";
import {
  Contact,
  Plus,
  Search,
  Filter,
  Car,
  ShieldCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Phone,
  FileBadge,
  X,
  Clock,
  UserCheck,
} from "lucide-react";
import { OrganizationSubNav } from "../organization-subnav";

export type DriverRecord = {
  id: string;
  driverCode: string;
  fullName: string;
  licenseNumber: string;
  licenseClass: "Heavy Commercial Truck" | "Light Commercial Van" | "Delivery Motorcycle" | "Hazardous Cargo";
  licenseExpiry: string;
  assignedVehicle: string;
  assignedHub: string;
  phone: string;
  safetyScore: number;
  dutyStatus: "On Duty" | "Available" | "Off Duty" | "On Leave" | "Suspended";
  medicalFitnessValid: boolean;
};

const initialDrivers: DriverRecord[] = [
  {
    id: "drv-1",
    driverCode: "DRV-DXB-001",
    fullName: "Kamal Uddin",
    licenseNumber: "DXB-HV-8849102",
    licenseClass: "Heavy Commercial Truck",
    licenseExpiry: "2027-05-14",
    assignedVehicle: "Mercedes Actros (DXB-44120)",
    assignedHub: "Dubai Central Logistics Hub",
    phone: "+971 50 812 3456",
    safetyScore: 4.95,
    dutyStatus: "On Duty",
    medicalFitnessValid: true,
  },
  {
    id: "drv-2",
    driverCode: "DRV-DXB-002",
    fullName: "Arjun Suresh",
    licenseNumber: "DXB-LV-5591021",
    licenseClass: "Light Commercial Van",
    licenseExpiry: "2026-10-15", // Expiring soon!
    assignedVehicle: "Toyota Hiace (DXB-18492)",
    assignedHub: "Dubai Investments Park Hub",
    phone: "+971 55 934 1122",
    safetyScore: 4.88,
    dutyStatus: "Available",
    medicalFitnessValid: true,
  },
  {
    id: "drv-3",
    driverCode: "DRV-AUH-003",
    fullName: "Faisal Mahmoud",
    licenseNumber: "AUH-MC-3310928",
    licenseClass: "Delivery Motorcycle",
    licenseExpiry: "2028-01-30",
    assignedVehicle: "Yamaha YBR 125 (AUH-9921)",
    assignedHub: "Abu Dhabi South Depot",
    phone: "+971 52 443 2190",
    safetyScore: 4.92,
    dutyStatus: "On Duty",
    medicalFitnessValid: true,
  },
  {
    id: "drv-4",
    driverCode: "DRV-SHJ-004",
    fullName: "Mansoor Alam",
    licenseNumber: "SHJ-HV-1109482",
    licenseClass: "Hazardous Cargo",
    licenseExpiry: "2027-11-20",
    assignedVehicle: "Volvo FH16 (SHJ-33901)",
    assignedHub: "Sharjah Rapid Maintenance Yard",
    phone: "+971 50 771 9043",
    safetyScore: 4.98,
    dutyStatus: "Available",
    medicalFitnessValid: true,
  },
  {
    id: "drv-5",
    driverCode: "DRV-DXB-005",
    fullName: "Muhammad Rizwan",
    licenseNumber: "DXB-LV-2039182",
    licenseClass: "Light Commercial Van",
    licenseExpiry: "2026-10-05", // Expiring very soon!
    assignedVehicle: "Ford Transit (DXB-77291)",
    assignedHub: "Dubai Central Logistics Hub",
    phone: "+971 56 339 8812",
    safetyScore: 4.65,
    dutyStatus: "Off Duty",
    medicalFitnessValid: true,
  },
  {
    id: "drv-6",
    driverCode: "DRV-RAK-006",
    fullName: "Youssef Ibrahim",
    licenseNumber: "RAK-LV-9920194",
    licenseClass: "Light Commercial Van",
    licenseExpiry: "2028-09-12",
    assignedVehicle: "Unassigned",
    assignedHub: "Ras Al Khaimah Fleet Service Center",
    phone: "+971 54 882 1290",
    safetyScore: 4.8,
    dutyStatus: "On Leave",
    medicalFitnessValid: true,
  },
];

export function DriverRegisterModule() {
  const [drivers, setDrivers] = useState<DriverRecord[]>(initialDrivers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDriver, setViewDriver] = useState<DriverRecord | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseClass, setLicenseClass] = useState<DriverRecord["licenseClass"]>("Light Commercial Van");
  const [licenseExpiry, setLicenseExpiry] = useState("2028-12-31");
  const [assignedVehicle, setAssignedVehicle] = useState("Toyota Hiace (DXB-1002)");
  const [assignedHub, setAssignedHub] = useState("Dubai Central Logistics Hub");
  const [phone, setPhone] = useState("");

  const filteredDrivers = useMemo(() => {
    return drivers.filter((drv) => {
      const matchesSearch =
        drv.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drv.driverCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drv.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drv.assignedVehicle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        selectedClass === "ALL" || drv.licenseClass === selectedClass;

      const matchesStat =
        selectedStatus === "ALL" || drv.dutyStatus === selectedStatus;

      return matchesSearch && matchesClass && matchesStat;
    });
  }, [drivers, searchQuery, selectedClass, selectedStatus]);

  const onDutyCount = drivers.filter((d) => d.dutyStatus === "On Duty").length;
  const availableCount = drivers.filter((d) => d.dutyStatus === "Available").length;
  const expiringCount = drivers.filter((d) => {
    const exp = new Date(d.licenseExpiry).getTime();
    const now = new Date("2026-09-28").getTime();
    const diffDays = (exp - now) / (1000 * 3600 * 24);
    return diffDays <= 45 && diffDays >= 0;
  }).length;

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !driverCode.trim() || !licenseNumber.trim()) return;

    const newDrv: DriverRecord = {
      id: `drv-${Date.now()}`,
      driverCode: driverCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
      licenseClass,
      licenseExpiry,
      assignedVehicle: assignedVehicle.trim() || "Unassigned",
      assignedHub,
      phone: phone.trim() || "+971 50 000 0000",
      safetyScore: 5.0,
      dutyStatus: "Available",
      medicalFitnessValid: true,
    };

    setDrivers([newDrv, ...drivers]);
    setIsAddModalOpen(false);

    // Reset
    setFullName("");
    setDriverCode("");
    setLicenseNumber("");
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
              <Contact className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Driver Registry
              </h1>
              <p className="text-xs text-slate-500">
                Commercial vehicle operators, licenses, safety compliance ratings, and duty rosters.
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
            Register Driver
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Drivers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Contact className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{drivers.length}</span>
            <span className="text-xs font-medium text-emerald-600">Licensed Operators</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">100% verified medical records</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active On Duty
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{onDutyCount}</span>
            <span className="text-xs text-slate-500">in transit</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Real-time GPS tracking enabled</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available for Dispatch
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">{availableCount}</span>
            <span className="text-xs font-medium text-purple-600">Ready at Hubs</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Immediate route assignment</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Expiring Licenses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{expiringCount}</span>
            <span className="text-xs font-medium text-amber-600">Due Renewal (&lt;45d)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">RTA renewal reminders sent</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by driver name, code, license number, vehicle..."
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
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All License Classes</option>
            <option value="Heavy Commercial Truck">Heavy Commercial Truck</option>
            <option value="Light Commercial Van">Light Commercial Van</option>
            <option value="Delivery Motorcycle">Delivery Motorcycle</option>
            <option value="Hazardous Cargo">Hazardous Cargo</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#FE5720] focus:outline-none"
          >
            <option value="ALL">All Duty Statuses</option>
            <option value="On Duty">On Duty</option>
            <option value="Available">Available</option>
            <option value="Off Duty">Off Duty</option>
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Driver / Code</th>
                <th className="px-5 py-3.5">License &amp; Expiry</th>
                <th className="px-5 py-3.5">Assigned Vehicle</th>
                <th className="px-5 py-3.5">Assigned Hub</th>
                <th className="px-5 py-3.5">Safety Rating</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Contact className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No drivers found</p>
                    <p className="mt-1 text-xs">Try clearing the search or license filter.</p>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((drv) => {
                  const expTime = new Date(drv.licenseExpiry).getTime();
                  const nowTime = new Date("2026-09-28").getTime();
                  const isExpiringSoon = (expTime - nowTime) / (1000 * 3600 * 24) <= 45;

                  return (
                    <tr
                      key={drv.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      {/* Driver */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#FE5720] transition-colors">
                          {drv.fullName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                            {drv.driverCode}
                          </span>
                          <span>• {drv.phone}</span>
                        </div>
                      </td>

                      {/* License */}
                      <td className="px-5 py-4">
                        <div className="font-mono font-medium text-slate-800">
                          {drv.licenseNumber}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500">{drv.licenseClass}</span>
                          {isExpiringSoon && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                              Exp: {drv.licenseExpiry}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Vehicle */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{drv.assignedVehicle}</span>
                        </div>
                      </td>

                      {/* Hub */}
                      <td className="px-5 py-4">
                        <div className="text-slate-700">{drv.assignedHub}</div>
                      </td>

                      {/* Safety Score */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{drv.safetyScore.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">/ 5.0</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {drv.dutyStatus === "On Duty" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            On Duty
                          </span>
                        )}
                        {drv.dutyStatus === "Available" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Available
                          </span>
                        )}
                        {drv.dutyStatus === "Off Duty" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Off Duty
                          </span>
                        )}
                        {drv.dutyStatus === "On Leave" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            On Leave
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setViewDriver(drv)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                        >
                          View File
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER DRIVER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                  <Contact className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Register Commercial Driver</h3>
                  <p className="text-xs text-slate-500">Enroll a fleet driver and verify traffic authority credentials.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterDriver} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rashid Khan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Driver Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DRV-DXB-008"
                    value={driverCode}
                    onChange={(e) => setDriverCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    License Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DXB-HV-998811"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    License Class
                  </label>
                  <select
                    value={licenseClass}
                    onChange={(e) => setLicenseClass(e.target.value as DriverRecord["licenseClass"])}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Light Commercial Van">Light Commercial Van</option>
                    <option value="Heavy Commercial Truck">Heavy Commercial Truck</option>
                    <option value="Delivery Motorcycle">Delivery Motorcycle</option>
                    <option value="Hazardous Cargo">Hazardous Cargo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Initial Assigned Vehicle
                  </label>
                  <input
                    type="text"
                    placeholder="Vehicle Make & Reg Plate"
                    value={assignedVehicle}
                    onChange={(e) => setAssignedVehicle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Home Base Hub
                  </label>
                  <select
                    value={assignedHub}
                    onChange={(e) => setAssignedHub(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none"
                  >
                    <option value="Dubai Central Logistics Hub">Dubai Central Logistics Hub</option>
                    <option value="Abu Dhabi South Depot">Abu Dhabi South Depot</option>
                    <option value="Sharjah Rapid Maintenance Yard">Sharjah Rapid Maintenance Yard</option>
                    <option value="Dubai Investments Park Hub">Dubai Investments Park Hub</option>
                    <option value="Ajman Express Depot">Ajman Express Depot</option>
                  </select>
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
                  Save Driver Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DRIVER PROFILE MODAL */}
      {viewDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="inline-block rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-[#FE5720]">
                  {viewDriver.driverCode}
                </span>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {viewDriver.fullName}
                </h3>
                <p className="text-xs text-slate-500">{viewDriver.licenseClass}</p>
              </div>
              <button
                onClick={() => setViewDriver(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Duty Status
                  </span>
                  <span className="mt-1 block text-xs font-bold text-emerald-700">
                    {viewDriver.dutyStatus}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Safety Score
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-900">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{viewDriver.safetyScore} / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Traffic License Details
                </span>
                <p className="text-xs font-mono font-bold text-slate-800">
                  {viewDriver.licenseNumber}
                </p>
                <p className="text-xs text-slate-600">Expires: {viewDriver.licenseExpiry}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Vehicle &amp; Staging Depot
                </span>
                <p className="text-xs font-bold text-slate-800">{viewDriver.assignedVehicle}</p>
                <p className="text-xs text-slate-600">{viewDriver.assignedHub}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Direct Contact
                </span>
                <p className="text-xs font-medium text-slate-800">{viewDriver.phone}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewDriver(null)}
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
