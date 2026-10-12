
"use client";

type DashboardPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
};

export default function DashboardPagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    disabled = false,
}: DashboardPaginationProps) {
    const safeTotalPages = Math.max(1, totalPages);
    const safeCurrentPage = Math.min(
        Math.max(1, currentPage),
        safeTotalPages,
    );

    const startItem =
        totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;

    const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

    return (
        <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
                Showing {startItem}–{endItem} of {totalItems}
            </p>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    disabled={disabled || safeCurrentPage <= 1}
                    onClick={() => onPageChange(safeCurrentPage - 1)}
                    className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Prev
                </button>

                <span
                    aria-current="page"
                    className="flex h-8 min-w-8 items-center justify-center rounded-md bg-[#FE5720] px-2 text-xs font-medium text-white"
                >
                    {safeCurrentPage}
                </span>

                <button
                    type="button"
                    disabled={disabled || safeCurrentPage >= safeTotalPages}
                    onClick={() => onPageChange(safeCurrentPage + 1)}
                    className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
