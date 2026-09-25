"use client";

import { ClipboardList, Tag, Calendar, Wrench, CheckCircle2, Plus } from "lucide-react";

const kpis = [
  { label: "Total Assets", value: "—", icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "In Service", value: "—", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Under Maintenance", value: "—", icon: Wrench, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Retired", value: "—", icon: Tag, color: "text-slate-500", bg: "bg-slate-100" },
];

const columns = ["Asset ID", "Name", "Category", "Location", "Acquired", "Condition", "Status"];

export function AssetRegisterModule() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Asset Register</h1>
          <p className="text-sm text-slate-500">Track all company assets, their condition, lifecycle, and location.</p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-[#FE5720] px-4 py-2 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Register Asset
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-400">API not connected</p>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {["All", "Vehicles", "Equipment", "IT Assets", "Furniture"].map((cat) => (
          <button
            key={cat}
            disabled
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              cat === "All"
                ? "bg-[#FE5720] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            } cursor-not-allowed opacity-70`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#FE5720]" />
            <h2 className="font-semibold text-slate-800">Asset Inventory</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">0 records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-6 py-3 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-400">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                  <p className="text-sm font-medium">No assets registered</p>
                  <p className="text-xs mt-1">Connect the Asset API to populate this register.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
