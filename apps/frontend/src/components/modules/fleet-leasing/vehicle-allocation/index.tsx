import { DashboardBreadcrumbsFromPath } from "@/components/dashboard/DashboardBreadcrumbsFromPath";

export function VehicleAllocationModule() {
  return (
    <div className="space-y-4">
      <DashboardBreadcrumbsFromPath pathname="/fleet-leasing/vehicle-allocation" />
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Vehicle Allocation & Reallocation</h2>
          <p className="mt-2 text-slate-500">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
