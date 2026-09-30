"use client";

import { capPageSize } from "./dashboard-pagination";

type DashboardTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

const controlClassName =
  "rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-[#FE5720] hover:text-[#FE5720] disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:border-gray-200 disabled:hover:text-gray-400";

export default function DashboardTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  className = "",
}: DashboardTablePaginationProps) {
  if (total <= 0) {
    return null;
  }

  const cappedSize = capPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(total / cappedSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * cappedSize + 1;
  const endIndex = Math.min(safePage * cappedSize, total);
  const showNav = totalPages > 1;

  return (
    <div
      className={`mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <p className="text-sm text-gray-600">
        Showing {startIndex}–{endIndex} of {total}
      </p>
      {showNav ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={disabled || safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            className={controlClassName}
          >
            Prev
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={disabled || safePage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            className={controlClassName}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
