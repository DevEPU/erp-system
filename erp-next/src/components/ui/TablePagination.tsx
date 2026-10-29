import React from "react";

interface TablePaginationProps {
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export default function TablePagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers to show (simplified: show current, previous, next, first, last)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-gray-100 mt-auto">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="border border-gray-200 rounded-md text-xs font-bold text-gray-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
        <span className="text-xs text-gray-500">
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          disabled={page === 1}
          onClick={() => onPageChange?.(page - 1)}
          className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pNum, i) =>
            pNum === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="text-gray-400 font-bold px-1 text-xs"
              >
                ...
              </span>
            ) : (
              <button
                key={pNum}
                onClick={() => onPageChange?.(pNum as number)}
                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${
                  page === pNum
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 border-none"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {pNum}
              </button>
            ),
          )}
        </div>
        <button
          disabled={page === totalPages || totalPages === 0}
          onClick={() => onPageChange?.(page + 1)}
          className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
