'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1.5',
        className
      )}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-95"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex items-center justify-center h-9 w-9 text-muted-foreground text-sm"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'flex items-center justify-center h-9 min-w-[2.25rem] rounded-lg text-sm font-medium transition-all duration-200 active:scale-95',
              p === currentPage
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-95"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
