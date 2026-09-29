import { Skeleton } from "@/components/states/skeleton";

type OrganisationDashboardFormSkeletonProps = {
  fieldRows?: number;
  /** Screen-reader label while the form shell loads */
  label?: string;
};

/**
 * Pulse placeholder matching Organisation add/edit form cards (DashboardLayout body).
 */
export function OrganisationDashboardFormSkeleton({
  fieldRows = 8,
  label = "Loading form",
}: OrganisationDashboardFormSkeletonProps) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-6">
        {Array.from({ length: fieldRows }, (_, index) => (
          <div key={index}>
            <Skeleton className="mb-2 h-3 w-28 max-w-[40%]" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
