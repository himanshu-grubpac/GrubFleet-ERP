"use client";

import { Users, Plus, Search } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";

export default function ClientsModule() {
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Clients
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your organization&apos;s clients.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
        <Search className="h-4 w-4 text-slate-400" />

        <input
          type="text"
          placeholder="Search clients..."
          className="h-10 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
            <Users className="h-6 w-6 text-[#FE5720]" />
          </div>

          <h2 className="text-base font-semibold text-slate-900">
            No clients yet
          </h2>

          <p className="mt-1 max-w-md text-sm text-slate-500">
            Add a client to start managing your organization&apos;s
            customer relationships.
          </p>
        </div>
      </div>
    </div>
  );
}