"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Scale,
  SlidersHorizontal,
  User,
} from "lucide-react";

/* ── Types ── */

interface EmployeeLeaveBalance {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  employee_name: string;
  employee_code: string;
  leave_type_name: string;
  leave_type_code: string;
  used_days: number;
  remaining_days: number;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days_per_year: number;
  color: string;
}

/* ── Group helper ── */

interface EmployeeGroup {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  balances: EmployeeLeaveBalance[];
}

function groupByEmployee(balances: EmployeeLeaveBalance[]): EmployeeGroup[] {
  const map = new Map<string, EmployeeGroup>();
  for (const b of balances) {
    if (!map.has(b.employee_id)) {
      map.set(b.employee_id, {
        employee_id: b.employee_id,
        employee_name: b.employee_name,
        employee_code: b.employee_code,
        balances: [],
      });
    }
    map.get(b.employee_id)!.balances.push(b);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name)
  );
}

/* ── Remaining badge variant ── */

function remainingVariant(remaining: number) {
  if (remaining <= 0) return "danger" as const;
  if (remaining <= 2) return "warning" as const;
  return "success" as const;
}

/* ── Page ── */

export default function ManagerLeaveBalancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("leave");
  const tc = useTranslations("common");

  const isManager =
    user?.role === "manager" ||
    user?.role === "tenant_admin" ||
    user?.role === "super_admin";

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace("/dashboard");
    }
  }, [authLoading, isManager, router]);

  // ── Year filter ──
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // ── Data ──
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [groups, setGroups] = useState<EmployeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Expandable rows ──
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── Adjust dialog ──
  const [adjustDialog, setAdjustDialog] = useState<{
    employee_id: string;
    employee_name: string;
    employee_code: string;
    leave_type_id: string;
    allocated_days: number;
    year: number;
  } | null>(null);
  const [adjustLeaveTypeId, setAdjustLeaveTypeId] = useState("");
  const [adjustAllocatedDays, setAdjustAllocatedDays] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  // ── Success / error toasts ──
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Load ──
  useEffect(() => {
    if (isManager) {
      loadData();
    }
  }, [year, isManager]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [balances, types] = await Promise.all([
        api.get<EmployeeLeaveBalance[]>(
          `/api/v1/leaves/balances?year=${year}`
        ),
        api.get<LeaveType[]>("/api/v1/leaves-types"),
      ]);
      setLeaveTypes(types || []);
      setGroups(groupByEmployee(balances || []));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load leave balances"
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle expand ──
  function toggleExpand(employeeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  // ── Open adjust dialog ──
  function openAdjust(
    employeeId: string,
    employeeName: string,
    employeeCode: string,
    balanceYear: number,
    leaveTypeId: string,
    allocatedDays: number
  ) {
    setAdjustDialog({
      employee_id: employeeId,
      employee_name: employeeName,
      employee_code: employeeCode,
      leave_type_id: leaveTypeId,
      allocated_days: allocatedDays,
      year: balanceYear,
    });
    setAdjustLeaveTypeId(leaveTypeId);
    setAdjustAllocatedDays(String(Math.round(allocatedDays)));
    setErrorMsg("");
    setSuccessMsg("");
  }

  function closeAdjust() {
    setAdjustDialog(null);
    setAdjustLeaveTypeId("");
    setAdjustAllocatedDays("");
    setAdjustSaving(false);
  }

  // ── Save adjust ──
  async function handleAdjustSave() {
    if (!adjustDialog) return;
    const days = parseFloat(adjustAllocatedDays);
    if (isNaN(days) || days < 0) {
      setErrorMsg("Allocated days must be a valid positive number");
      return;
    }
    if (!adjustLeaveTypeId) {
      setErrorMsg("Please select a leave type");
      return;
    }

    setAdjustSaving(true);
    setErrorMsg("");
    try {
      await api.put("/api/v1/leaves/balances/adjust", {
        employee_id: adjustDialog.employee_id,
        leave_type_id: adjustLeaveTypeId,
        year: adjustDialog.year,
        allocated_days: days,
      });
      setSuccessMsg(
        `Balance adjusted for ${adjustDialog.employee_name} — ${days} days`
      );
      closeAdjust();
      loadData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to adjust balance"
      );
    } finally {
      setAdjustSaving(false);
    }
  }

  // ── Auth guard ──
  if (authLoading) return null;
  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">
            Manager role required
          </p>
        </div>
      </div>
    );
  }

  // ── Stats ──
  const totalEmployees = groups.length;
  const totalBalances = groups.reduce(
    (sum, g) => sum + g.balances.length,
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Leave Balance Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and adjust employee leave balances
          </p>
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Year:
          </label>
          <Input
            type="number"
            min={2020}
            max={2035}
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || currentYear)}
            className="w-24"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Leave Type Balances
                </p>
                <p className="text-2xl font-bold">{totalBalances}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                <SlidersHorizontal className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year</p>
                <p className="text-2xl font-bold">{year}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
        </div>
      )}

      {/* Main card */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Leave Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState variant="inline" />
          ) : groups.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No leave balances found"
              description={`No balances available for year ${year}. Try a different year.`}
            />
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-8"></th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Employee Code
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Employee Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Leave Type
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Allocated
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Used
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                        Remaining
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const isOpen = expanded.has(group.employee_id);
                      return (
                        <React.Fragment key={group.employee_id}>
                          {/* Employee group header */}
                          <tr
                            className="border-b border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                            onClick={() => toggleExpand(group.employee_id)}
                          >
                            <td className="py-3 px-4">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm">
                                {group.employee_code}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              {group.employee_name}
                            </td>
                            <td
                              className="py-3 px-4 text-sm text-muted-foreground"
                              colSpan={5}
                            >
                              {group.balances.length} leave type
                              {group.balances.length > 1 ? "s" : ""}
                            </td>
                          </tr>

                          {/* Expanded leave type rows */}
                          {isOpen &&
                            group.balances.map((bal) => {
                              const lt = leaveTypes.find(
                                (lt) => lt.id === bal.leave_type_id
                              );
                              const color = lt?.color || "#6366f1";
                              const remaining = bal.remaining_days;
                              return (
                                <tr
                                  key={bal.id}
                                  className="border-b border-border/50 bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                                >
                                  <td className="py-2.5 px-4"></td>
                                  <td className="py-2.5 px-4"></td>
                                  <td className="py-2.5 px-4"></td>
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-sm">
                                        {bal.leave_type_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-sm">
                                    {bal.allocated_days}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-sm">
                                    {bal.used_days}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <Badge
                                      variant={remainingVariant(remaining)}
                                    >
                                      {remaining}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAdjust(
                                          group.employee_id,
                                          group.employee_name,
                                          group.employee_code,
                                          bal.year,
                                          bal.leave_type_id,
                                          bal.allocated_days
                                        );
                                      }}
                                      className="active:scale-95 transition-all duration-200"
                                    >
                                      Adjust
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="md:hidden space-y-3 stagger-children">
                {groups.map((group) => {
                  const isOpen = expanded.has(group.employee_id);
                  return (
                    <div
                      key={group.employee_id}
                      className="rounded-lg border border-border overflow-hidden card-hover transition-all duration-200"
                    >
                      {/* Employee header */}
                      <div
                        className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-muted/50 transition-all duration-200"
                        onClick={() => toggleExpand(group.employee_id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {group.employee_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {group.employee_code} · {group.balances.length}{" "}
                              type{group.balances.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>

                      {/* Expanded balances */}
                      {isOpen &&
                        group.balances.map((bal) => {
                          const lt = leaveTypes.find(
                            (lt) => lt.id === bal.leave_type_id
                          );
                          const color = lt?.color || "#6366f1";
                          const remaining = bal.remaining_days;
                          return (
                            <div
                              key={bal.id}
                              className="border-t border-border/50 px-4 py-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {bal.leave_type_name}
                                  </span>
                                </div>
                                <Badge variant={remainingVariant(remaining)}>
                                  {remaining} left
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>
                                  <span className="block">Allocated</span>
                                  <span className="font-semibold text-foreground">
                                    {bal.allocated_days}
                                  </span>
                                </div>
                                <div>
                                  <span className="block">Used</span>
                                  <span className="font-semibold text-foreground">
                                    {bal.used_days}
                                  </span>
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAdjust(
                                        group.employee_id,
                                        group.employee_name,
                                        group.employee_code,
                                        bal.year,
                                        bal.leave_type_id,
                                        bal.allocated_days
                                      );
                                    }}
                                    className="w-full active:scale-95 transition-all duration-200 text-xs"
                                  >
                                    Adjust
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Adjust Dialog ── */}
      <Dialog open={!!adjustDialog} onClose={closeAdjust}>
        <DialogHeader>
          <DialogTitle>Adjust Leave Balance</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {adjustDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm">
                  <span className="text-muted-foreground">Employee: </span>
                  <span className="font-semibold">
                    {adjustDialog.employee_name}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({adjustDialog.employee_code})
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Year: {adjustDialog.year}
                </p>
              </div>

              {/* Leave type */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Leave Type
                </label>
                <Select
                  options={[
                    { value: "", label: "Select leave type..." },
                    ...leaveTypes.map((lt) => ({
                      value: lt.id,
                      label: `${lt.name} (${lt.code})`,
                    })),
                  ]}
                  value={adjustLeaveTypeId}
                  onChange={(e) => setAdjustLeaveTypeId(e.target.value)}
                  placeholder="Select leave type..."
                />
              </div>

              {/* Allocated days */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Allocated Days
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={adjustAllocatedDays}
                  onChange={(e) => setAdjustAllocatedDays(e.target.value)}
                  placeholder="0"
                />
                {adjustLeaveTypeId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Default:{" "}
                    {leaveTypes.find((lt) => lt.id === adjustLeaveTypeId)
                      ?.default_days_per_year ?? "—"}{" "}
                    days/year
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeAdjust}
            disabled={adjustSaving}
            className="active:scale-95 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdjustSave}
            disabled={adjustSaving}
            className="active:scale-95 transition-all duration-200"
          >
            {adjustSaving ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
