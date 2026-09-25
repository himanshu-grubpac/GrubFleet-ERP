import LeaseContractsTable from "@/components/modules/fleet-leasing/lease-contracts/LeaseContractsTable";

export default function LeaseContractsPage() {
  return (
    <div className="space-y-6">
      {/* =====================================================
                PAGE HEADER
            ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lease Contracts
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage fleet and leasing contracts.
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg bg-[#FE5720] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e94d1c]"
        >
          New Contract
        </button>
      </div>

      {/* =====================================================
                LEASE CONTRACTS TABLE
            ====================================================== */}

      <LeaseContractsTable />
    </div>
  );
}