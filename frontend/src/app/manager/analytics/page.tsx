'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  Briefcase,
  UserCheck,
  Clock,
  UserX,
  AlertCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

interface AnalyticsData {
  department_distribution: { department_name: string; employee_count: number }[];
  employment_type_distribution: { type: string; count: number }[];
  gender_distribution: { gender: string; count: number }[];
  attendance_trend: { date: string; present: number; late: number; absent: number; half_day: number }[];
}

const empTypeColors: Record<string, string> = {
  permanent: 'bg-emerald-500',
  contract: 'bg-blue-500',
  intern: 'bg-amber-500',
  daily: 'bg-purple-500',
  freelancer: 'bg-rose-500',
};

const barColors = [
  'bg-gradient-to-r from-indigo-500 to-blue-500',
  'bg-gradient-to-r from-emerald-500 to-teal-500',
  'bg-gradient-to-r from-amber-500 to-orange-500',
  'bg-gradient-to-r from-violet-500 to-purple-500',
  'bg-gradient-to-r from-rose-500 to-pink-500',
  'bg-gradient-to-r from-cyan-500 to-sky-500',
  'bg-gradient-to-r from-lime-500 to-green-500',
];

export default function AnalyticsPage() {
  const ta = useTranslations('analytics');
  const tc = useTranslations('common');
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get<AnalyticsData>('/api/v1/analytics/summary');
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManager) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, isManager]);

  if (authLoading) {
    return <LoadingState variant="fullscreen" />;
  }

  if (!isManager) return null;

  // Derived stats
  const totalEmployees =
    analytics?.department_distribution.reduce((sum, d) => sum + d.employee_count, 0) ?? 0;
  const totalDepartments = analytics?.department_distribution.length ?? 0;

  const trend = analytics?.attendance_trend ?? [];
  const latestDay = trend[trend.length - 1];
  const attendanceRate =
    latestDay
      ? Math.round(
          (latestDay.present / (latestDay.present + latestDay.late + latestDay.absent + latestDay.half_day)) *
            100
        )
      : 0;

  const totalByType = analytics?.employment_type_distribution.reduce((s, t) => s + t.count, 0) ?? 1;
  const totalByGender = analytics?.gender_distribution.reduce((s, g) => s + g.count, 0) ?? 1;

  const maxDeptCount = Math.max(
    ...(analytics?.department_distribution.map((d) => d.employee_count) ?? [1]),
    1
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 text-balance">
          <BarChart3 className="h-6 w-6" />
          {ta('title')}
        </h2>
        <p className="text-muted-foreground mt-1">
          Overview of employee demographics and attendance metrics
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger animate-slide-up">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingState variant="card" rows={4} />
      ) : !analytics ? (
        <EmptyState icon="inbox" title={ta('noData')} />
      ) : (
        <>
          {/* Row 1 — Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
            <Card className="card-hover">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalEmployees}</p>
                  <p className="text-xs text-muted-foreground">{ta('totalEmployees')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalDepartments}</p>
                  <p className="text-xs text-muted-foreground">{ta('totalDepartments')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {attendanceRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">{ta('attendanceRate')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 — Department Distribution */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base">{ta('departmentDistribution')}</CardTitle>
              <CardDescription>
                {totalDepartments} {ta('departments')?.toLowerCase() ?? 'departments'} — {totalEmployees}{' '}
                {ta('employees')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.department_distribution.map((dept, i) => (
                  <div key={dept.department_name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{dept.department_name}</span>
                      <span className="text-muted-foreground">{dept.employee_count}</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColors[i % barColors.length]}`}
                        style={{ width: `${(dept.employee_count / maxDeptCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Row 3 — Employment Type + Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employment Type */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">{ta('employmentType')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.employment_type_distribution.map((item) => {
                    const pct = Math.round((item.count / totalByType) * 100);
                    const colorKey = item.type.toLowerCase();
                    const dotColor = empTypeColors[colorKey] ?? 'bg-gray-400';
                    return (
                      <div key={item.type} className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full flex-shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground capitalize">{item.type}</span>
                            <span className="text-muted-foreground tabular-nums">{item.count}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${dotColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">{ta('genderDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.gender_distribution.map((item) => {
                    const pct = Math.round((item.count / totalByGender) * 100);
                    const genderLower = item.gender.toLowerCase();
                    const isMale = genderLower === 'male' || genderLower === 'laki-laki';
                    const isFemale = genderLower === 'female' || genderLower === 'perempuan';
                    const dotColor = isMale ? 'bg-blue-500' : isFemale ? 'bg-pink-500' : 'bg-gray-400';
                    return (
                      <div key={item.gender} className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full flex-shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground capitalize">
                              {isMale ? ta('male') : isFemale ? ta('female') : item.gender}
                            </span>
                            <span className="text-muted-foreground tabular-nums">{item.count}</span>
                          </div>
                          <div className="w-full h-3 rounded-full bg-muted mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${dotColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4 — Attendance Trend */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base">{ta('attendanceTrend')}</CardTitle>
              <CardDescription>
                {trend.length} days of attendance data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {trend.length === 0 ? (
                <EmptyState icon="inbox" title={ta('noData')} />
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {ta('date')}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-emerald-600 uppercase tracking-wider">
                          {ta('present')}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-amber-600 uppercase tracking-wider">
                          {ta('late')}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-red-600 uppercase tracking-wider">
                          {ta('absent')}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-blue-600 uppercase tracking-wider">
                          {ta('halfDay')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {trend.map((row) => (
                        <tr key={row.date} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-emerald-600 text-right tabular-nums">
                            {row.present}
                          </td>
                          <td className="px-4 py-3 text-sm text-amber-600 text-right tabular-nums">
                            {row.late}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600 text-right tabular-nums">
                            {row.absent}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 text-right tabular-nums">
                            {row.half_day}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
