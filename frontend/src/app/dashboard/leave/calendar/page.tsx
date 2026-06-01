"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  AlertCircle,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface CalendarLeave {
  id: string;
  employee_name: string;
  employee_code: string;
  leave_type_name: string;
  leave_type_code: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-500",
  taken: "bg-blue-500",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DayLeaves {
  day: number;
  leaves: CalendarLeave[];
}

function groupLeavesByDay(
  leaves: CalendarLeave[],
  year: number,
  month: number
): DayLeaves[] {
  const daysInMonth = getDaysInMonth(year, month);
  const map: Record<number, CalendarLeave[]> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    map[d] = [];
  }

  for (const leave of leaves) {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    // Clamp to current month
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);

    const loopStart = start < firstOfMonth ? firstOfMonth : start;
    const loopEnd = end > lastOfMonth ? lastOfMonth : end;

    for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
      const day = d.getDate();
      if (map[day]) {
        map[day].push(leave);
      }
    }
  }

  return Object.entries(map).map(([day, dayLeaves]) => ({
    day: Number(day),
    leaves: dayLeaves.sort((a, b) => a.employee_name.localeCompare(b.employee_name)),
  }));
}

export default function LeaveCalendarPage() {
  const t = useTranslations("leave");
  const [leaves, setLeaves] = useState<CalendarLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  async function loadCalendar() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ year: number; month: number; data: CalendarLeave[] }>(
        `/api/v1/leaves/calendar?year=${year}&month=${month}`
      );
      setLeaves(res.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const dayLeaves = useMemo(
    () => groupLeavesByDay(leaves, year, month),
    [leaves, year, month]
  );

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  // Calendar grid: fill blank cells before first day
  const gridCells = [];
  for (let i = 0; i < firstDay; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }

  const selectedDayLeaves = selectedDay
    ? dayLeaves.find((dl) => dl.day === selectedDay)?.leaves ?? []
    : [];

  const uniqueEmployees = useMemo(() => {
    const names = new Set(leaves.map((l) => l.employee_name));
    return names.size;
  }, [leaves]);

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("calendar")}</h1>
          <p className="text-muted-foreground mt-1">{t("calendarDesc")}</p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{leaves.length} {t("requests")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{uniqueEmployees} {t("employees")}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {MONTHS[month - 1]} {year}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          disabled={
            year === today.getFullYear() && month === today.getMonth() + 1
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500" /> Taken
        </span>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_HEADERS.map((h) => (
              <div
                key={h}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[80px]" />;
              }

              const dateStr = formatDate(year, month, day);
              const isToday = dateStr === todayStr;
              const dl = dayLeaves.find((d) => d.day === day);
              const leavesToday = dl?.leaves ?? [];
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDay(isSelected ? null : day)
                  }
                  className={`min-h-[80px] p-1 rounded-lg border text-left transition-all duration-200 hover:border-primary/50 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isToday
                      ? "border-primary/50 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {leavesToday.slice(0, 3).map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-1"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            STATUS_COLORS[l.status] ?? "bg-gray-400"
                          }`}
                        />
                        <span className="text-[10px] truncate text-muted-foreground leading-tight">
                          {l.employee_name.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                    {leavesToday.length > 3 && (
                      <div className="text-[10px] text-muted-foreground font-medium pl-2.5">
                        +{leavesToday.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {formatDate(year, month, selectedDay)} —{" "}
              {selectedDayLeaves.length > 0
                ? `${selectedDayLeaves.length} on leave`
                : "No leaves"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayLeaves.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No leaves on this day"
                description="Everyone is at work!"
              />
            ) : (
              <div className="space-y-3">
                {selectedDayLeaves.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {l.employee_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {l.employee_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.leave_type_name} · {l.start_date} → {l.end_date} ·{" "}
                          {l.total_days} day{l.total_days > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        (l.status === "approved"
                          ? "success"
                          : l.status === "taken"
                          ? "info"
                          : "default") as "success" | "info" | "default"
                      }
                    >
                      {l.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
