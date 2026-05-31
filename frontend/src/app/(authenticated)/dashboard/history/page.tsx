'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 20;

  const fetchHistory = useCallback(async (currentOffset: number) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get<HistoryResponse>(
        `/api/attendance/history?limit=${limit}&offset=${currentOffset}`
      );
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(offset);
  }, [offset, fetchHistory]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevious = () => {
    if (offset > 0) setOffset(offset - limit);
  };

  const handleNext = () => {
    if (offset + limit < total) setOffset(offset + limit);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6" />
          Attendance History
        </h2>
        <p className="text-muted-foreground mt-1">
          View your past attendance records
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Records</span>
            {!isLoading && (
              <span className="text-sm font-normal text-muted-foreground">
                {total} total record{total !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No attendance records
              </h3>
              <p className="text-muted-foreground">
                Your attendance history will appear here once you start clocking in and out.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Clock In
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Clock Out
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
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
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={offset + limit >= total}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
