'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ── Column definition ── */
export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

/* ── Props ── */
interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  /* Mobile card label overrides — defaults to column.header */
  mobileLabels?: boolean;
}

/* ── Component ── */
export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyState,
  className,
  mobileLabels = true,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop table ── */}
      <div className={cn('hidden md:block overflow-x-auto', className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-muted/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-6 py-4 text-sm',
                      col.hideOnMobile ? 'hidden md:table-cell' : '',
                      col.className
                    )}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden divide-y divide-border">
        {data.map((item) => (
          <div key={keyExtractor(item)} className="px-4 py-3 space-y-1.5">
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between text-sm"
                >
                  {mobileLabels && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {col.header}
                    </span>
                  )}
                  <span className="text-foreground text-right">
                    {col.render(item)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
