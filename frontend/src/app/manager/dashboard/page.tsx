'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  DollarSign,
  BarChart3,
  ArrowRight,
  UserX,
  Briefcase,
} from 'lucide-react';
import {
  fetchDashboardSummary,
  fetchPendingApprovals,
  type DashboardSummary,
  type PendingApprovals,
  type AttendanceRecord,
} from '@/lib/api-dashboard';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TodayAttendanceRecord {
  id: string;
  employee_name: string;
  employee_code: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const statusColor = (status: string) => {
  switch (status) {
    case 'present':
      return { dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'late':
      return { dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'half_day':
      return { dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'absent':
    default:
      return { dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-200' };
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'present':
      return 'Present';
    case 'late':
      return 'Late';
    case 'half_day':
      return 'Half Day';
    case 'absent':
      return 'Absent';
    default:
      return status.replace('_', ' ');
  }
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'h:mm a');
  } catch {
    return '—';
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<TodayAttendanceRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (!isManager) return;

    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError('');

      try {
        const [summaryData, pendingData, attData] = await Promise.all([
          fetchDashboardSummary(user?.tenant_id),
          fetchPendingApprovals(user?.tenant_id),
          api.get<{ total: number; present: number; late: number; absent: number; data: AttendanceRecord[] }>(
            `/api/v1/attendance/report?date=${todayDate()}`
          ).catch(() => null),
        ]);

        if (cancelled) return;

        setSummary(summaryData);
        setPendingApprovals(pendingData);
        setAttendanceToday(
          (attData?.data ?? []).map((r) => ({
            id: r.id,
            employee_name: r.employee_name,
            employee_code: r.employee_code,
            clock_in_time: r.clock_in_time,
            clock_out_time: r.clock_out_time,
            status: r.status,
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isManager, user?.tenant_id]);

  if (authLoading || !isManager) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6" />
          Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Executive overview of your organization
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Row 1: Stat Cards ─────────────────────────────────────────────*/}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {summary.employeeCount}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Total Employees
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Today Present */}
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-emerald-600">
                  {summary.todayPresent}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Today Present
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {summary.todayLate} late &middot; {summary.todayAbsent} absent
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-amber-600">
                  {summary.pendingApprovalsTotal}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Pending Approvals
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {summary.pendingLeaves} leaves &middot; {summary.pendingOvertime} OT &middot;{' '}
                  {summary.pendingReimbursements} reimb.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* This Month Payroll */}
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  ${summary.thisMonthPayroll.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  This Month Payroll
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {summary.payrollCount} employees
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Row 2: Attendance Today Table ──────────────────────────────────*/}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Attendance Today — {format(new Date(), 'MMMM d, yyyy')}
            </CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading...'
                : `${attendanceToday.length} employee${attendanceToday.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/manager/report')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Full Report
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : attendanceToday.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No attendance data
              </h3>
              <p className="text-muted-foreground">
                No attendance records found for today.
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
                    {attendanceToday.map((record) => {
                      const colors = statusColor(record.status);
                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${colors.dot}`}
                              />
                              {record.employee_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {record.employee_code}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap font-mono">
                            {formatTime(record.clock_in_time)}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap font-mono">
                            {formatTime(record.clock_out_time)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors.bg}`}
                            >
                              {statusLabel(record.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {attendanceToday.map((record) => {
                  const colors = statusColor(record.status);
                  return (
                    <div key={record.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${colors.dot}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {record.employee_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.employee_code}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors.bg}`}
                        >
                          {statusLabel(record.status)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>In: {formatTime(record.clock_in_time)}</span>
                        <span>Out: {formatTime(record.clock_out_time)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Row 3: Pending Approvals Summary ───────────────────────────────*/}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pending Leaves */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Leaves
            </CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading...'
                : `${pendingApprovals?.leaves.count ?? 0} pending`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? (
              <div className="h-16 bg-muted rounded animate-pulse" />
            ) : pendingApprovals && pendingApprovals.leaves.count > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {pendingApprovals.leaves.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground truncate mr-2">
                      {item.employee_name}
                    </span>
                    <Badge variant="info">
                      {item.days ? `${item.days}d` : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {pendingApprovals.leaves.count > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingApprovals.leaves.count - 5} more
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No pending leaves
              </div>
            )}
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={() => router.push('/manager/leaves/pending')}
              >
                View All Leaves
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Overtime */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-600" />
              Overtime
            </CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading...'
                : `${pendingApprovals?.overtime.count ?? 0} pending`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? (
              <div className="h-16 bg-muted rounded animate-pulse" />
            ) : pendingApprovals && pendingApprovals.overtime.count > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {pendingApprovals.overtime.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground truncate mr-2">
                      {item.employee_name}
                    </span>
                    <Badge variant="warning">
                      {item.reason ? item.reason.substring(0, 12) : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {pendingApprovals.overtime.count > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingApprovals.overtime.count - 5} more
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No pending overtime
              </div>
            )}
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={() => router.push('/manager/overtime')}
              >
                View All Overtime
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Reimbursements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Reimbursements
            </CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading...'
                : `${pendingApprovals?.reimbursements.count ?? 0} pending`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? (
              <div className="h-16 bg-muted rounded animate-pulse" />
            ) : pendingApprovals && pendingApprovals.reimbursements.count > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {pendingApprovals.reimbursements.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground truncate mr-2">
                      {item.employee_name}
                    </span>
                    <Badge variant="success">
                      {item.amount ? `$${item.amount}` : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {pendingApprovals.reimbursements.count > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingApprovals.reimbursements.count - 5} more
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No pending reimbursements
              </div>
            )}
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={() => router.push('/manager/reimbursement')}
              >
                View All Reimbursements
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Quick Actions ────────────────────────────────────────────*/}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>
            Navigate to key management areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/manager/report')}
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Attendance Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/manager/leaves/pending')}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Leaves
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/manager/overtime')}
            >
              <Briefcase className="h-4 w-4 mr-1.5" />
              Overtime
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/manager/attendance/export')}
            >
              <DollarSign className="h-4 w-4 mr-1.5" />
              Payroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/manager/reimbursement')}
            >
              <DollarSign className="h-4 w-4 mr-1.5" />
              Reimbursement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
