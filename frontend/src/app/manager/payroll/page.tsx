"use client";

import React, { useState, useEffect, useCallback, Fragment } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import {
  fetchPayrolls,
  fetchPayrollConfig,
  updatePayrollConfig,
  generatePayroll,
  approvePayroll,
  markPaid,
} from "@/lib/api-payroll";
import type { PayrollRecord, PayrollConfig } from "@/lib/api-payroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  Wallet,
  Users,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { FilterDropdown } from '@/components/ui/filter-dropdown'

const fmtIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  approved: "bg-blue-100 text-blue-700 border-blue-300",
  paid: "bg-green-100 text-green-700 border-green-300",
};

export default function PayrollPage() {
  const tp = useTranslations('payroll');
  const tc = useTranslations('common');
  const { user, isLoading: authLoading } = useAuth();
  const tenant = user?.tenant_id || "";

  // Period selector
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Data
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Status filter
  const [statusFilter, setStatusFilter] = useState('');

  const filteredPayrolls = statusFilter
    ? payrolls.filter((r) => r.status === statusFilter)
    : payrolls;
  const pagedPayrolls = filteredPayrolls.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredPayrolls.length / perPage);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Settings modal
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    daily_salary_ratio: 0,
    late_penalty_amount: 0,
    absent_penalty_amount: 0,
    overtime_rate: 0,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Generate loading
  const [generating, setGenerating] = useState(false);

  // Action loaders per row
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const loadPayrolls = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchPayrolls(tenant, year, month);
      setPayrolls(res.items ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [tenant, year, month]);

  const loadConfig = useCallback(async () => {
    if (!tenant) return;
    try {
      const c = await fetchPayrollConfig(tenant);
      setConfig(c);
      setConfigForm({
        daily_salary_ratio: c.daily_salary_ratio,
        late_penalty_amount: c.late_penalty_amount,
        absent_penalty_amount: c.absent_penalty_amount,
        overtime_rate: c.overtime_rate,
      });
    } catch {
      // config may not exist yet
    }
  }, [tenant]);

  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // ── Stats ─────────────────────────────────
  const totalSalary = payrolls.reduce((s, r) => s + r.net_salary, 0);
  const totalEmployees = payrolls.length;
  const draftCount = payrolls.filter((r) => r.status === "draft").length;
  const paidCount = payrolls.filter((r) => r.status === "paid").length;

  // ── Generate ──────────────────────────────
  const handleGenerate = async () => {
    if (!tenant) return;
    setGenerating(true);
    setError("");
    try {
      await generatePayroll(tenant, {
        year: year,
        month: month,
      });
      await loadPayrolls();
    } catch (e: any) {
      setError(e.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  // ── Row actions ───────────────────────────
  const handleApprove = async (id: string) => {
    if (!tenant) return;
    setActionLoading((prev) => ({ ...prev, [id]: "approve" }));
    try {
      await approvePayroll(tenant, id);
      await loadPayrolls();
    } catch (e: any) {
      setError(e.message || "Failed to approve");
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!tenant) return;
    setActionLoading((prev) => ({ ...prev, [id]: "paid" }));
    try {
      await markPaid(tenant, id);
      await loadPayrolls();
    } catch (e: any) {
      setError(e.message || "Failed to mark paid");
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  // ── Settings ──────────────────────────────
  const openConfig = async () => {
    await loadConfig();
    setConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!tenant) return;
    setSavingConfig(true);
    try {
      await updatePayrollConfig(configForm, tenant);
      setConfigOpen(false);
    } catch (e: any) {
      setError(e.message || "Failed to save config");
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── Deductions helper ─────────────────────
  const totalDeductions = (r: PayrollRecord) =>
    r.late_deduction + r.absent_deduction + r.leave_deduction;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-balance text-2xl font-bold text-foreground">
            {tp('title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tp('title')} for {tenant || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={openConfig}
            title={tp('title')}
            className="active:scale-95 transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={loadPayrolls}
            title={tc('tryAgain')}
            className="active:scale-95 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-32 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={loadPayrolls} disabled={loading} className="active:scale-95 transition-all duration-200">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : null}
          {tc('filter')}
        </Button>
        <Button variant="default" onClick={handleGenerate} disabled={generating} className="active:scale-95 transition-all duration-200">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : null}
          {tp('generate')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 animate-slide-up">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        <Card className="card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tp('netSalary')}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtIDR(totalSalary)}</p>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tp('employee')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalEmployees}</p>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tp('status.draft')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{draftCount}</p>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tp('status.paid')}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{paidCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {tp('title')} — {MONTHS.find((m) => m.value === month)?.label} {year}
            </CardTitle>
            <FilterDropdown label={tc('status')} options={[
              {value:'draft',label:tp('status.draft')},{value:'approved',label:tp('status.approved')},{value:'paid',label:tp('status.paid')}
            ]} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && payrolls.length === 0 ? (
            <LoadingState variant="inline" />
          ) : payrolls.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={tp('noPayrolls')}
              description='No payroll records for this period. Click "Generate Payroll" to create them.'
            />
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {tp('employee')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Department
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {tp('baseSalary')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Overtime
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {tp('deductions')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {tp('netSalary')}
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      {tc('status')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {tc('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPayrolls.map((record) => {
                    const isExpanded = expandedId === record.id;
                    const isLoading = actionLoading[record.id];
                    return (
                      <Fragment key={record.id}>
                        <tr
                          className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => toggleExpand(record.id)}
                        >
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {record.employee_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.employee_id}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {record.department_name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmtIDR(record.base_salary)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmtIDR(record.overtime_pay)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600">
                            {fmtIDR(totalDeductions(record))}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {fmtIDR(record.net_salary)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              className={statusColor[record.status] ?? ""}
                            >
                              {record.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(record.id)}
                                  disabled={isLoading === "approve"}
                                  className="active:scale-95 transition-all duration-200"
                                >
                                  {isLoading === "approve" ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : null}
                                  {tp('approve')}
                                </Button>
                              )}
                              {record.status === "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkPaid(record.id)}
                                  disabled={isLoading === "paid"}
                                  className="active:scale-95 transition-all duration-200"
                                >
                                  {isLoading === "paid" ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : null}
                                  {tp('pay')}
                                </Button>
                              )}
                              {record.status === "paid" && (
                                <Button size="sm" variant="outline" disabled>
                                  {tp('status.paid')}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${record.id}-detail`} className="bg-muted/20">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    Position
                                  </span>
                                  <span className="font-medium">
                                    {record.position_name || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    {tp('period')}
                                  </span>
                                  <span className="font-medium">
                                    {
                                      MONTHS.find(
                                        (m) => m.value === record.period_month
                                      )?.label
                                    }{" "}
                                    {record.period_year}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    {tp('baseSalary')}
                                  </span>
                                  <span>{fmtIDR(record.base_salary)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    Overtime Pay
                                  </span>
                                  <span>{fmtIDR(record.overtime_pay)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    Late Deduction
                                  </span>
                                  <span className="text-red-600">
                                    -{fmtIDR(record.late_deduction)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    Absent Deduction
                                  </span>
                                  <span className="text-red-600">
                                    -{fmtIDR(record.absent_deduction)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    Leave Deduction
                                  </span>
                                  <span className="text-red-600">
                                    -{fmtIDR(record.leave_deduction)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    Reimbursement
                                  </span>
                                  <span>{fmtIDR(record.reimbursement)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">
                                    {tp('netSalary')}
                                  </span>
                                  <span className="font-semibold">
                                    {fmtIDR(record.net_salary)}
                                  </span>
                                </div>
                                {record.approved_by && (
                                  <div>
                                    <span className="text-muted-foreground text-xs block">
                                      Approved By
                                    </span>
                                    <span>{record.approved_by}</span>
                                  </div>
                                )}
                                {record.approved_at && (
                                  <div>
                                    <span className="text-muted-foreground text-xs block">
                                      Approved At
                                    </span>
                                    <span>
                                      {new Date(
                                        record.approved_at
                                      ).toLocaleDateString("id-ID")}
                                    </span>
                                  </div>
                                )}
                                {record.paid_at && (
                                  <div>
                                    <span className="text-muted-foreground text-xs block">
                                      Paid At
                                    </span>
                                    <span>
                                      {new Date(
                                        record.paid_at
                                      ).toLocaleDateString("id-ID")}
                                    </span>
                                  </div>
                                )}
                                {record.notes && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground text-xs block">
                                      {tc('name')}
                                    </span>
                                    <span>{record.notes}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Settings Modal */}
      {configOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{tp('title')} Configuration</CardTitle>
              <button onClick={() => setConfigOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Daily Salary Ratio
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={configForm.daily_salary_ratio}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      daily_salary_ratio: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Late Penalty Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={configForm.late_penalty_amount}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      late_penalty_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Absent Penalty Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={configForm.absent_penalty_amount}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      absent_penalty_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Overtime Rate
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={configForm.overtime_rate}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      overtime_rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfigOpen(false)}
                  className="active:scale-95 transition-all duration-200"
                >
                  {tc('cancel')}
                </Button>
                <Button onClick={handleSaveConfig} disabled={savingConfig} className="active:scale-95 transition-all duration-200">
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {tc('save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
