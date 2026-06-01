'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  status: string;
  notes?: string;
}

interface HistoryResponse {
  records: AttendanceRecord[];
  total: number;
  limit: number;
  offset: number;
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'present': return 'success' as const;
    case 'late': return 'warning' as const;
    case 'half_day': return 'info' as const;
    case 'absent': return 'danger' as const;
    default: return 'default' as const;
  }
};

export default function HistoryPage() {
  const t = useTranslations('attendance');
  const tc = useTranslations('common');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const fetchHistory = useCallback(async (currentOffset: number) => {
    setIsLoading(true);
    setError('');
    try {
      let url = `/api/v1/attendance/history?limit=${limit}&offset=${currentOffset}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const data = await api.get<HistoryResponse>(url);
      setRecords((data as HistoryResponse)?.records || []);
      setTotal((data as HistoryResponse)?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchHistory(offset);
  }, [offset, fetchHistory]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevious = () => {
    if (offset > 0) setOffset(offset - limit);
  };

  const handleNext = () => {
    if (offset + limit < total) setOffset(offset + limit);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 text-balance">
          <History className="h-6 w-6" />
          {t('history')}
        </h2>
        <p className="text-muted-foreground mt-1">
          View your past attendance records
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger animate-slide-up">
          {error}
        </div>
      )}

      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Records</span>
              <FilterDropdown label={t('status')} options={[
                {value: 'present', label: t('present')},
                {value: 'late', label: t('late')},
                {value: 'half_day', label: t('halfDay')},
                {value: 'absent', label: t('absent')}
              ]} value={statusFilter} onChange={setStatusFilter} />
            </div>
            {!isLoading && (
              <span className="text-sm font-normal text-muted-foreground">
                {total} total record{total !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8">
              <LoadingState variant="list" rows={5} />
            </div>
          ) : records.length === 0 ? (
            <EmptyState icon="inbox" title={t('noRecords')} description="Your attendance history will appear here once you start clocking in and out." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('date')}
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('clockIn')}
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('clockOut')}
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('status')}
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                          {format(new Date(record.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                          {record.clock_in_time
                            ? format(new Date(record.clock_in_time), 'h:mm a')
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                          {record.clock_out_time
                            ? format(new Date(record.clock_out_time), 'h:mm a')
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusVariant(record.status)}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                          {record.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {records.map((record) => (
                  <div key={record.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(record.date), 'MMM d, yyyy')}
                      </span>
                      <Badge variant={statusVariant(record.status)}>
                        {record.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        In: {record.clock_in_time ? format(new Date(record.clock_in_time), 'h:mm a') : '—'}
                      </span>
                      <span>
                        Out: {record.clock_out_time ? format(new Date(record.clock_out_time), 'h:mm a') : '—'}
                      </span>
                    </div>
                    {record.notes && (
                      <p className="text-xs text-muted-foreground truncate">
                        {record.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc('page', { current: currentPage, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="active:scale-95 transition-all duration-200"
              onClick={handlePrevious}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {tc('prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="active:scale-95 transition-all duration-200"
              onClick={handleNext}
              disabled={offset + limit >= total}
            >
              {tc('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
