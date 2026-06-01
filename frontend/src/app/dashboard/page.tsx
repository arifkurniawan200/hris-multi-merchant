'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, CalendarCheck, Timer, LogIn, LogOut, AlertCircle, CheckCircle2, 
  Umbrella, UserCheck, Clock3, CalendarDays, TrendingUp, BarChart3,
  ArrowRight, FileText
} from 'lucide-react';
import { format } from 'date-fns';

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
}

interface ClockInResponse {
  id: string;
  employee_id: string;
  tenant_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_date: string;
  status: string;
  employee_name: string;
  employee_code: string;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  total_allocated: number;
  used: number;
  remaining: number;
}

interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
}

interface UpcomingLeave {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}

interface DashboardData {
  leave_balances: LeaveBalance[];
  pending_leave_count: number;
  attendance_summary: AttendanceSummary;
  upcoming_leaves: UpcomingLeave[];
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  present: 'success',
  late: 'warning',
  half_day: 'info',
  absent: 'danger',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [lastRecord, setLastRecord] = useState<AttendanceRecord | null>(null);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchShift = useCallback(async () => {
    try {
      const data = await api.get<Shift>('/api/v1/employee/me/shift');
      setShift(data);
    } catch {}
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
    } catch {}
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await api.get<DashboardData>('/api/v1/employee/dashboard');
      setDashData(data);
    } catch {}
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
      setSuccessMessage(`Clocked in at ${format(new Date(response.clock_in), 'h:mm a')}`);
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
      const response = await api.post<ClockInResponse>('/api/v1/attendance/clock-out', {});
      setLastRecord(response);
      setCurrentRecord(null);
      setSuccessMessage(`Clocked out at ${format(new Date(response.clock_out!), 'h:mm a')}`);
      fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock-out failed');
    } finally {
      setIsClocking(false);
    }
  };

  const isManager = user?.role === 'manager' || user?.role === 'tenant_admin' || user?.role === 'super_admin';

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-card border border-border rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card border border-border rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-card border border-border rounded-lg" />
          <div className="h-48 bg-card border border-border rounded-lg" />
        </div>
      </div>
    );
  }

  const clockedIn = !!currentRecord;
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const attendance = dashData?.attendance_summary;
  const attendanceRate = attendance && attendance.total > 0
    ? Math.round((attendance.present / attendance.total) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Welcome, {user?.name || user?.email?.split('@')[0] || 'Employee'}
              </h2>
              <p className="text-muted-foreground mt-1">{today}</p>
            </div>
            {shift && (
              <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{shift.name}</p>
                  <p className="text-xs text-muted-foreground">{shift.start_time} — {shift.end_time}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </p>
                {attendance && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {attendance.present + attendance.late} attended / {attendance.total} days
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Umbrella className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Leave Balance</p>
                {dashData?.leave_balances?.length ? (
                  <>
                    <p className="text-2xl font-bold">
                      {dashData.leave_balances.reduce((s, b) => s + b.remaining, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      total {dashData.leave_balances.length} type(s) remaining
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Leaves */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className={`text-2xl font-bold ${(dashData?.pending_leave_count ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                  {dashData?.pending_leave_count ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">leave requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${clockedIn ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                <UserCheck className={`h-5 w-5 ${clockedIn ? 'text-emerald-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold truncate">
                  {clockedIn ? 'Active' : 'Not Clocked'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {clockedIn 
                    ? format(new Date(currentRecord!.clock_in), 'h:mm a')
                    : lastRecord ? `Last: ${format(new Date(lastRecord.clock_out || lastRecord.clock_in), 'h:mm a')}` : 'No records'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance summary chart bar */}
      {attendance && attendance.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              This Month Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-3xl font-bold text-emerald-600">{attendance.present}</p>
                <p className="text-xs text-emerald-700 mt-1">Present</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-3xl font-bold text-amber-600">{attendance.late}</p>
                <p className="text-xs text-amber-700 mt-1">Late</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-3xl font-bold text-red-600">{attendance.absent}</p>
                <p className="text-xs text-red-700 mt-1">Absent</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-3 rounded-full bg-gray-100 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${attendance.total > 0 ? (attendance.present / attendance.total) * 100 : 0}%` }}
              />
              <div 
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${attendance.total > 0 ? (attendance.late / attendance.total) * 100 : 0}%` }}
              />
              <div 
                className="bg-red-400 h-full transition-all duration-500"
                style={{ width: `${attendance.total > 0 ? (attendance.absent / attendance.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {attendance.total} total working days this month
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leave Balances Detail */}
      {dashData?.leave_balances && dashData.leave_balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Umbrella className="h-5 w-5 text-primary" />
              Leave Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashData.leave_balances.map((b) => (
                <div key={b.leave_type_id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{b.leave_type_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {b.remaining} / {b.total_allocated} days
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          b.remaining <= 0 ? 'bg-red-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${b.total_allocated > 0 ? ((b.total_allocated - b.remaining) / b.total_allocated) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Leaves */}
      {dashData?.upcoming_leaves && dashData.upcoming_leaves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashData.upcoming_leaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="font-medium text-sm">{l.leave_type_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.start_date} <ArrowRight className="h-3 w-3 inline" /> {l.end_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{l.total_days}d</p>
                    <Badge variant={l.status === 'approved' ? 'success' : 'warning'} className="text-xs">
                      {l.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clock In/Out */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogIn className="h-5 w-5 text-emerald-600" />
              Clock In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleClockIn}
              disabled={isClocking || clockedIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14"
            >
              {isClocking ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Clocking In...
                </span>
              ) : (
                <span className="flex items-center gap-2 text-lg">
                  <LogIn className="h-6 w-6" />
                  Clock In
                </span>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {clockedIn ? 'Already clocked in' : 'Record your start time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogOut className="h-5 w-5 text-amber-600" />
              Clock Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleClockOut}
              disabled={isClocking || !clockedIn}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white h-14"
            >
              {isClocking ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Clocking Out...
                </span>
              ) : (
                <span className="flex items-center gap-2 text-lg">
                  <LogOut className="h-6 w-6" />
                  Clock Out
                </span>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {clockedIn ? 'Record your end time' : 'Clock in first'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/leave'} className="gap-2">
          <FileText className="h-4 w-4" /> Submit Leave
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/attendance'} className="gap-2">
          <CalendarCheck className="h-4 w-4" /> View Attendance
        </Button>
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/manager/leaves/pending'} className="gap-2">
            <Clock3 className="h-4 w-4" /> Pending Approvals
          </Button>
        )}
      </div>
    </div>
  );
}
