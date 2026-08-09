/* eslint-disable */
"use client";

import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isArabic: boolean;
  total?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isArabic,
  total,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between gap-4 mt-4 px-2 py-3 border-t border-border">
      {total !== undefined && (
        <span className="text-sm text-text-muted">
          {isArabic ? `إجمالي ${total}` : `${total} total`}
        </span>
      )}
      <div className="flex items-center gap-1.5" role="navigation" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          {isArabic ? "السابق" : "←"}
        </button>
        {getPageNumbers().map((page, index) =>
          page === "..." ? (
            <span key={`e-${index}`} className="px-2 py-1 text-sm text-text-muted">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={cn(
                "min-w-[36px] px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                currentPage === page
                  ? "bg-primary text-text-inverse shadow-sm"
                  : "text-text-secondary hover:bg-surface-secondary"
              )}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          {isArabic ? "التالي" : "→"}
        </button>
      </div>
    </div>
  );
}
