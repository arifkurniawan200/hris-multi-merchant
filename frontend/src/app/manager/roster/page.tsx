'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

/* ── Types ── */

interface RosterEmployee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name: string;
}

interface RosterAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  color: string;
  date: string;
  effective_from: string;
  effective_to: string | null;
}

interface RosterResponse {
  employees: RosterEmployee[];
  assignments: RosterAssignment[];
}

/* ── Helpers ── */

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

function formatDisplay(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function assignmentCovers(assignment: RosterAssignment, date: string): boolean {
  return (
    assignment.effective_from <= date &&
    (assignment.effective_to === null || assignment.effective_to >= date)
  );
}

/* ── Component ── */

export default function RosterPage() {
  const tr = useTranslations('roster');
  const tc = useTranslations('common');
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [data, setData] = useState<RosterResponse | null>(null);
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

  // Compute date range
  const monday = useMemo(() => {
    const base = addDays(today, weekOffset * 7);
    return getMonday(base);
  }, [weekOffset]);

  const dateFrom = useMemo(
    () => (useCustom ? customFrom : formatDate(monday)),
    [useCustom, customFrom, monday]
  );
  const dateTo = useMemo(
    () => (useCustom ? customTo : formatDate(addDays(monday, 6))),
    [useCustom, customTo, monday]
  );

  // Generate date columns
  const dateColumns = useMemo(() => {
    if (useCustom) {
      if (!customFrom || !customTo) return [];
      const cols: string[] = [];
      let cur = new Date(customFrom + 'T00:00:00');
      const end = new Date(customTo + 'T00:00:00');
      while (cur <= end) {
        cols.push(formatDate(cur));
        cur = addDays(cur, 1);
      }
      return cols;
    }
    const cols: string[] = [];
    for (let i = 0; i < 7; i++) {
      cols.push(formatDate(addDays(monday, i)));
    }
    return cols;
  }, [useCustom, customFrom, customTo, monday]);

  // Navigation helpers
  const prevWeek = useCallback(() => {
    setWeekOffset((o) => o - 1);
    setUseCustom(false);
  }, []);

  const nextWeek = useCallback(() => {
    setWeekOffset((o) => o + 1);
    setUseCustom(false);
  }, []);

  const thisWeek = useCallback(() => {
    setWeekOffset(0);
    setUseCustom(false);
  }, []);

  const applyCustom = useCallback(() => {
    if (customFrom && customTo) {
      setUseCustom(true);
    }
  }, [customFrom, customTo]);

  // Fetch
  const fetchRoster = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await api.get<RosterResponse>(
        `/api/v1/roster?date_from=${dateFrom}&date_to=${dateTo}`
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (isManager && dateFrom && dateTo) {
      fetchRoster();
    }
  }, [fetchRoster, isManager, dateFrom, dateTo]);

  // Build assignment lookup: employee_id → date → assignment
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Map<string, RosterAssignment>>();
    if (!data?.assignments) return map;
    for (const a of data.assignments) {
      if (!map.has(a.employee_id)) {
        map.set(a.employee_id, new Map());
      }
      // Multiple assignments per employee per date — take latest by effective_from
      const existing = map.get(a.employee_id)!.get(a.date);
      if (!existing || a.effective_from > existing.effective_from) {
        map.get(a.employee_id)!.set(a.date, a);
      }
    }
    return map;
  }, [data?.assignments]);

  if (authLoading) {
    return <LoadingState variant="fullscreen" />;
  }

  if (!isManager) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 text-balance">
          <CalendarDays className="h-6 w-6" />
          {tr('title')}
        </h2>
        <p className="text-muted-foreground mt-1">
          Employee shift schedule overview
        </p>
      </div>

      {/* Controls */}
      <Card className="card-hover">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {tr('prevWeek')}
              </Button>
              <Button variant="outline" size="sm" onClick={nextWeek}>
                {tr('nextWeek')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="default" size="sm" onClick={thisWeek}>
                {tr('thisWeek')}
              </Button>
            </div>

            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {formatDisplay(addDays(monday, 0))} — {formatDisplay(addDays(monday, 6))}
            </span>

            <div className="flex-1" />

            {/* Custom range */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">{tr('dateFrom')}:</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-36 text-sm"
              />
              <label className="text-xs text-muted-foreground">{tr('dateTo')}:</label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-36 text-sm"
              />
              <Button variant="outline" size="sm" onClick={applyCustom}>
                {tr('apply')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger animate-slide-up">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingState variant="table" rows={8} />
      ) : !data || data.employees.length === 0 ? (
        <EmptyState icon="inbox" title={tr('noRoster')} />
      ) : (
        <Card className="card-hover">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="sticky left-0 z-10 bg-muted/30 text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[180px]">
                      {tr('employee')}
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                      {tr('department')}
                    </th>
                    {dateColumns.map((d) => {
                      const dt = new Date(d + 'T00:00:00');
                      return (
                        <th
                          key={d}
                          className={`text-center px-2 py-3 text-xs font-medium uppercase tracking-wider min-w-[80px] ${
                            formatDate(today) === d
                              ? 'text-primary bg-primary/5'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <div>{dayLabel(dt)}</div>
                          <div className="text-[10px] opacity-70">{formatDisplay(dt)}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.employees.map((emp) => {
                    const empAssignments = assignmentMap.get(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="sticky left-0 z-10 bg-card hover:bg-muted/30 px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                          {emp.first_name} {emp.last_name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({emp.employee_code})
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {emp.department_name}
                        </td>
                        {dateColumns.map((d) => {
                          const isToday = formatDate(today) === d;
                          const hasAssignment = empAssignments?.get(d) ?? null;

                          return (
                            <td
                              key={d}
                              className={`px-2 py-3 text-center text-sm ${
                                isToday ? 'bg-primary/5' : ''
                              }`}
                            >
                              {hasAssignment ? (
                                <div className="flex items-center justify-center gap-1.5" title={hasAssignment.shift_name}>
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: hasAssignment.color || '#6b7280' }}
                                  />
                                  <span className="text-xs font-medium text-foreground">
                                    {hasAssignment.shift_code}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
