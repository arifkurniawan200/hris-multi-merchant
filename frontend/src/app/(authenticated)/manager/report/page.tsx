'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, UserCheck, Clock, UserX, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ReportRecord {
  id: string;
  employee_name: string;
  employee_code: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: string;
  notes?: string;
}

interface ReportResponse {
  total: number;
  present: number;
  late: number;
  absent: number;
  data: ReportRecord[];
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

export default function ReportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const fetchReport = useCallback(async (reportDate: string) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get<ReportResponse>(`/api/attendance/report?date=${reportDate}`);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManager) {
      fetchReport(date);
    }
  }, [date, fetchReport, isManager]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isManager) return null;

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Attendance Report
        </h2>
        <p className="text-muted-foreground mt-1">
          Daily attendance overview for your team
        </p>
      </div>

      {/* Date Picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label htmlFor="report-date" className="text-sm font-medium text-foreground">
              Select Date:
            </label>
            <Input
              id="report-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full sm:w-auto"
            />
            {date !== format(new Date(), 'yyyy-MM-dd') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(today)}
              >
                Today
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : report ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{report.total}</p>
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{report.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{report.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{report.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Employee Attendance — {format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy')}
          </CardTitle>
          <CardDescription>
            {report ? `${report.data.length} employees` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !report || report.data.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No attendance data
              </h3>
              <p className="text-muted-foreground">
                No attendance records found for this date.
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
                        Employee
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Code
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.data.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {record.employee_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {record.employee_code}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {report.data.map((record) => (
                  <div key={record.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {record.employee_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.employee_code}
                        </p>
                      </div>
                      <Badge variant={statusVariant(record.status)}>
                        {record.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        In: {record.clock_in_time
                          ? format(new Date(record.clock_in_time), 'h:mm a')
                          : '—'}
                      </span>
                      <span>
                        Out: {record.clock_out_time
                          ? format(new Date(record.clock_out_time), 'h:mm a')
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
