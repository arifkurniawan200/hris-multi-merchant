'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, CalendarCheck, Timer, LogIn, LogOut, AlertCircle, CheckCircle2, Users, TrendingUp, FileText, Clock3, CalendarDays, UserCheck, Ban, Umbrella, ListChecks, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_date: string;
  status: string;
  employee_name?: string;
  employee_code?: string;
  employee_id?: string;
}

interface ClockInResponse {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_date: string;
  status: string;
  employee_name: string;
  employee_code: string;
}

type ClockOutResponse = ClockInResponse;

interface TodayStats {
  total_employees: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  on_leave_count: number;
}

interface PendingCounts {
  corrections: number;
  leaves: number;
  overtime: number;
  reimbursements: number;
  shift_swaps: number;
}

interface DashboardData {
  today_stats?: TodayStats;
  pending_approvals?: PendingCounts;
  recent_attendance: AttendanceRecord[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const [shift, setShift] = useState<Shift | null>(null);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [lastRecord, setLastRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Dashboard summary data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const isManager = user?.role === 'manager' || user?.role === 'tenant_admin' || user?.role === 'super_admin';

  const statusVariant = (status: string) => {
    switch (status) {
      case 'present': return 'success' as const;
      case 'late': return 'warning' as const;
      case 'half_day': return 'info' as const;
      case 'absent': return 'danger' as const;
      default: return 'default' as const;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'half_day': return 'Half Day';
      case 'absent': return 'Absent';
      default: return status;
    }
  };

  const fetchShift = useCallback(async () => {
    try {
      const data = await api.get<Shift>('/api/v1/employee/me/shift');
      setShift(data);
    } catch {
      // Shift not assigned — okay
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<AttendanceRecord[]>('/api/v1/attendance/history?limit=1&offset=0');
      if (data && data.length > 0) {
        const latest = data[0];
        if (!latest.clock_out) {
          setCurrentRecord(latest);
        } else {
          setLastRecord(latest);
        }
      }
    } catch {
      // No records yet
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await api.get<DashboardData>('/api/v1/dashboard/summary');
      setDashboardData(data);
    } catch {
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchShift(), fetchStatus(), fetchDashboard()]);
      setIsLoading(false);
    };
    init();
  }, [fetchShift, fetchStatus, fetchDashboard]);

  const handleClockIn = async () => {
    setIsClocking(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await api.post<ClockInResponse>('/api/v1/attendance/clock-in', {});
      setCurrentRecord(response);
      setLastRecord(null);
      setSuccessMessage(`Clocked in successfully at ${format(new Date(response.clock_in), 'h:mm a')}`);
      // Refresh dashboard after clock-in
      fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock-in failed');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    setIsClocking(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await api.post<ClockOutResponse>('/api/v1/attendance/clock-out', {});
      setLastRecord(response);
      setCurrentRecord(null);
      setSuccessMessage(`Clocked out at ${format(new Date(response.clock_out!), 'h:mm a')}`);
      // Refresh dashboard after clock-out
      fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock-out failed');
    } finally {
      setIsClocking(false);
    }
  };

  if (isLoading) {
    return <LoadingState variant="card" rows={3} />;
  }

  const clockedIn = !!currentRecord;
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const ts = dashboardData?.today_stats;
  const pc = dashboardData?.pending_approvals;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting + Shift Info */}
      <Card className="card-hover transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground text-balance">
                Welcome, {user?.name || user?.email?.split('@')[0] || 'Employee'}
              </h2>
              <p className="text-muted-foreground mt-1">{today}</p>
            </div>
            {shift && (
              <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{shift.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.start_time} — {shift.end_time}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* === STAT CARDS (Manager+) === */}
      {isManager && ts && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Present</p>
                  <p className="text-2xl font-bold">{ts.present_count}</p>
                </div>
                <UserCheck className="h-8 w-8 text-emerald-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Late</p>
                  <p className="text-2xl font-bold">{ts.late_count}</p>
                </div>
                <Clock3 className="h-8 w-8 text-amber-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Absent</p>
                  <p className="text-2xl font-bold">{ts.absent_count}</p>
                </div>
                <Ban className="h-8 w-8 text-red-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">On Leave</p>
                  <p className="text-2xl font-bold">{ts.on_leave_count}</p>
                </div>
                <Umbrella className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold">{ts.total_employees}</p>
                </div>
                <Users className="h-8 w-8 text-violet-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger animate-slide-up">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === LEFT COLUMN: Clock In/Out === */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clock In / Out Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Clock In Card */}
            <Card className="card-hover transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LogIn className="h-5 w-5 text-success" />
                  {t('clockIn')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleClockIn}
                  disabled={isClocking || clockedIn}
                  variant="success"
                  size="2xl"
                  className="w-full active:scale-95 transition-all duration-200"
                >
                  {isClocking ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Clocking In...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-6 w-6" />
                      {t('clockIn')}
                    </span>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {clockedIn
                    ? t('alreadyClockedIn')
                    : 'Tap to record your start time'}
                </p>
              </CardContent>
            </Card>

            {/* Clock Out Card */}
            <Card className="card-hover transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LogOut className="h-5 w-5 text-warning" />
                  {t('clockOut')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleClockOut}
                  disabled={isClocking || !clockedIn}
                  variant="warning"
                  size="2xl"
                  className="w-full active:scale-95 transition-all duration-200"
                >
                  {isClocking ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Clocking Out...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogOut className="h-6 w-6" />
                      {t('clockOut')}
                    </span>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {clockedIn
                    ? 'Tap to record your end time'
                    : 'Clock in first to enable clock out'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Current Status */}
          {clockedIn && currentRecord && (
            <Card className="border-success/30 bg-success/5 card-hover transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Timer className="h-5 w-5 text-success" />
                  Currently Clocked In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 border border-border">
                    <span className="text-sm text-muted-foreground">Clock-in time:</span>
                    <span className="text-sm font-semibold text-foreground">
                      {format(new Date(currentRecord.clock_in), 'h:mm:ss a')}
                    </span>
                  </div>
                  <Badge variant="success" className="text-sm px-3 py-1">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Clock-out Summary */}
          {lastRecord && !clockedIn && (
            <Card className="card-hover transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                  Last Attendance Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <p className="text-xs text-muted-foreground">Clock In</p>
                    <p className="text-sm font-semibold text-foreground">
                      {format(new Date(lastRecord.clock_in), 'h:mm:ss a')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <p className="text-xs text-muted-foreground">Clock Out</p>
                    <p className="text-sm font-semibold text-foreground">
                      {lastRecord.clock_out
                        ? format(new Date(lastRecord.clock_out), 'h:mm:ss a')
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={statusVariant(lastRecord.status)} className="mt-1">
                      {lastRecord.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No records yet */}
          {!clockedIn && !lastRecord && (
            <Card className="card-hover transition-all duration-200">
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to start your day?
                </h3>
                <p className="text-muted-foreground">
                  Tap &quot;Clock In&quot; above to begin recording your attendance for today.
                </p>
              </CardContent>
            </Card>
          )}

          {/* === MANAGER: Recent Attendance Feed === */}
          {isManager && dashboardData?.recent_attendance && dashboardData.recent_attendance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Recent Attendance
                  </span>
                  <Link href="/manager/report" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.recent_attendance.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          record.status === 'present' ? 'bg-emerald-500' :
                          record.status === 'late' ? 'bg-amber-500' :
                          record.status === 'half_day' ? 'bg-blue-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <span className="font-medium text-foreground">{record.employee_name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({record.employee_code})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">
                          {record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '—'}
                        </span>
                        <Badge variant={statusVariant(record.status)} className="text-xs">
                          {statusLabel(record.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* === RIGHT COLUMN: Pending + Quick Actions === */}
        <div className="space-y-6">
          {/* PENDING APPROVALS (Manager+) */}
          {isManager && pc && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <PendingItem
                  label="Corrections"
                  count={pc.corrections}
                  href="/manager/report"
                  icon={<FileText className="h-4 w-4" />}
                />
                <PendingItem
                  label="Leave Requests"
                  count={pc.leaves}
                  href="/manager/leaves/pending"
                  icon={<CalendarDays className="h-4 w-4" />}
                />
                <PendingItem
                  label="Overtime"
                  count={pc.overtime}
                  href="/manager/overtime"
                  icon={<Clock3 className="h-4 w-4" />}
                />
                <PendingItem
                  label="Reimbursements"
                  count={pc.reimbursements}
                  href="/manager/reimbursement"
                  icon={<FileText className="h-4 w-4" />}
                />
                <PendingItem
                  label="Shift Swaps"
                  count={pc.shift_swaps}
                  href="/manager/shift-swaps"
                  icon={<Users className="h-4 w-4" />}
                />
              </CardContent>
            </Card>
          )}

          {/* QUICK ACTIONS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/history" className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm hover:bg-muted transition-colors">
                <FileText className="h-4 w-4 text-primary" />
                View Attendance History
              </Link>
              <Link href="/dashboard/leave" className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm hover:bg-muted transition-colors">
                <Umbrella className="h-4 w-4 text-blue-500" />
                Apply for Leave
              </Link>
              {isManager && (
                <Link href="/manager/analytics" className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm hover:bg-muted transition-colors">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  View Analytics
                </Link>
              )}
              {isManager && (
                <Link href="/manager/report" className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm hover:bg-muted transition-colors">
                  <Users className="h-4 w-4 text-amber-500" />
                  Manage Attendance
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PendingItem({ label, count, href, icon }: {
  label: string;
  count: number;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm hover:bg-muted transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count > 0 ? (
          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
            {count}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}
