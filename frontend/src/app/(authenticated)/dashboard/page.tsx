'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarCheck, Timer, LogIn, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  status: string;
}

interface ClockInResponse {
  attendance: AttendanceRecord;
}

interface ClockOutResponse {
  attendance: AttendanceRecord;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [lastRecord, setLastRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const statusVariant = (status: string) => {
    switch (status) {
      case 'present': return 'success' as const;
      case 'late': return 'warning' as const;
      case 'half_day': return 'info' as const;
      case 'absent': return 'danger' as const;
      default: return 'default' as const;
    }
  };

  const fetchShift = useCallback(async () => {
    try {
      const data = await api.get<Shift>('/api/v1/employee/me/shift');
      setShift(data);
    } catch {
      // Shift might not be assigned — that's okay
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<AttendanceRecord[]>('/api/attendance/history?limit=1&offset=0');
      if (data && data.length > 0) {
        const latest = data[0];
        if (!latest.clock_out_time) {
          // Currently clocked in
          setCurrentRecord(latest);
        } else {
          setLastRecord(latest);
        }
      }
    } catch {
      // No records yet — that's fine
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchShift(), fetchStatus()]);
      setIsLoading(false);
    };
    init();
  }, [fetchShift, fetchStatus]);

  const handleClockIn = async () => {
    setIsClocking(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await api.post<ClockInResponse>('/api/attendance/clock-in', {
        tenant_id: user?.tenant_id,
      });
      setCurrentRecord(response.attendance);
      setLastRecord(null);
      setSuccessMessage(`Clocked in successfully at ${format(new Date(response.attendance.clock_in_time), 'h:mm a')}`);
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
      const response = await api.post<ClockOutResponse>('/api/attendance/clock-out', {
        tenant_id: user?.tenant_id,
      });
      setLastRecord(response.attendance);
      setCurrentRecord(null);
      setSuccessMessage(`Clocked out at ${format(new Date(response.attendance.clock_out_time!), 'h:mm a')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock-out failed');
    } finally {
      setIsClocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-card border border-border rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-card border border-border rounded-lg" />
          <div className="h-48 bg-card border border-border rounded-lg" />
        </div>
      </div>
    );
  }

  const clockedIn = !!currentRecord;
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-6">
      {/* Greeting + Shift Info */}
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
                  <p className="text-xs text-muted-foreground">
                    {shift.start_time} — {shift.end_time}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Clock In / Out Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clock In Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogIn className="h-5 w-5 text-success" />
              Clock In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleClockIn}
              disabled={isClocking || clockedIn}
              variant="success"
              size="2xl"
              className="w-full"
            >
              {isClocking ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Clocking In...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-6 w-6" />
                  Clock In
                </span>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {clockedIn
                ? 'You are already clocked in'
                : 'Tap to record your start time'}
            </p>
          </CardContent>
        </Card>

        {/* Clock Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogOut className="h-5 w-5 text-warning" />
              Clock Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleClockOut}
              disabled={isClocking || !clockedIn}
              variant="warning"
              size="2xl"
              className="w-full"
            >
              {isClocking ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Clocking Out...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogOut className="h-6 w-6" />
                  Clock Out
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
        <Card className="border-success/30 bg-success/5">
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
                  {format(new Date(currentRecord.clock_in_time), 'h:mm:ss a')}
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
        <Card>
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
                  {format(new Date(lastRecord.clock_in_time), 'h:mm:ss a')}
                </p>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground">Clock Out</p>
                <p className="text-sm font-semibold text-foreground">
                  {lastRecord.clock_out_time
                    ? format(new Date(lastRecord.clock_out_time), 'h:mm:ss a')
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
        <Card>
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
    </div>
  );
}
