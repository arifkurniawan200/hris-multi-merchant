"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FileText, Clock, AlertCircle, CheckCircle2, Percent } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days_per_year: number;
  color: string;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  total_allocated: number;
  used: number;
  remaining: number;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  leave_type_name: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "default" },
  taken: { label: "Taken", variant: "info" },
  completed: { label: "Completed", variant: "success" },
};

export default function LeavePage() {
  const { user } = useAuth();
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    total_days: "",
    reason: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [typesRes, leavesRes, balRes] = await Promise.all([
        api.get<LeaveType[]>("/api/v1/leaves-types"),
        api.get<LeaveRequest[]>("/api/v1/leaves/my?limit=10&offset=0"),
        api.get<LeaveBalance[]>("/api/v1/leaves/balance"),
      ]);
      setLeaveTypes(typesRes);
      setMyLeaves(leavesRes);
      setBalances(balRes);
    } catch (err) {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }

  function getBalanceForType(typeId: string): LeaveBalance | undefined {
    return balances.find((b) => b.leave_type_id === typeId);
  }

  const selectedBalance = form.leave_type_id ? getBalanceForType(form.leave_type_id) : null;
  const requestedDays = parseFloat(form.total_days) || 0;
  const exceedsBalance = form.leave_type_id ? (!!selectedBalance && requestedDays > selectedBalance.remaining) : false;

  function calcDays() {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setForm((f) => ({ ...f, total_days: String(diff) }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (exceedsBalance) {
      const bal = getBalanceForType(form.leave_type_id);
      setError(`Insufficient balance. You only have ${bal!.remaining} day(s) remaining for this type.`);
      return;
    }
    setSubmitting(true);

    try {
      await api.post("/api/v1/leaves", {
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: parseFloat(form.total_days),
        reason: form.reason,
        tenant_id: user?.tenant_id,
      });
      setSuccess("Leave request submitted successfully!");
      setForm({ leave_type_id: "", start_date: "", end_date: "", total_days: "", reason: "" });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      await api.put(`/api/v1/leaves/${id}/cancel`);
      setSuccess("Leave request cancelled.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    }
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('all')}</p>
      </div>

      {/* Balance cards */}
      {(balances?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 stagger-children">
          {(balances ?? []).map((b) => (
            <Card key={b.leave_type_id} className={`card-hover ${b.remaining <= 0 ? "opacity-60" : "transition-all duration-200"}`}>
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs text-muted-foreground truncate">{b.leave_type_name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-xl font-bold ${b.remaining <= 0 ? "text-danger" : "text-foreground"}`}>
                    {b.remaining}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {b.total_allocated}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Submit form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t('newRequest')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('leaveType')}</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                  value={form.leave_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value }))}
                  required
                >
                  <option value="">Select leave type...</option>
                  {(leaveTypes ?? []).map((lt) => {
                    const bal = getBalanceForType(lt.id);
                    return (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.default_days_per_year} days/yr{bal ? ` · ${bal.remaining} left` : ""})
                      </option>
                    );
                  })}
                </select>
                {selectedBalance && (
                  <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                    selectedBalance.remaining <= 0 ? "text-danger" : "text-muted-foreground"
                  }`}>
                    <Percent className="h-3 w-3" />
                    {selectedBalance.remaining} of {selectedBalance.total_allocated} days remaining
                    {exceedsBalance && (
                      <span className="text-danger font-medium"> — Exceeds balance!</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Total Days</label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="Auto-calculated"
                  value={form.total_days}
                  onChange={(e) => setForm((f) => ({ ...f, total_days: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('startDate')}</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  onBlur={calcDays}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('endDate')}</label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  onBlur={calcDays}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('reason')}</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 min-h-[100px] resize-y"
                placeholder="Describe your reason for leave (min 10 characters)..."
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                required
                minLength={10}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || exceedsBalance} className="min-w-[160px] active:scale-95 transition-all duration-200">
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{myLeaves?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {(myLeaves ?? []).filter((l) => l.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {(myLeaves ?? []).filter((l) => l.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle>Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {(myLeaves ?? []).length === 0 ? (
            <EmptyState icon="inbox" title="No leave requests yet" description="Submit your first request using the form above" />
          ) : (
            <div className="space-y-3 stagger-children">
              {(myLeaves ?? []).map((leave) => {
                const sc = statusConfig[leave.status] || { label: leave.status, variant: "default" };
                return (
                  <div
                    key={leave.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{leave.leave_type_name}</span>
                        <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {leave.start_date} → {leave.end_date} · {leave.total_days} day{leave.total_days > 1 ? "s" : ""}
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{leave.reason}</p>
                      )}
                    </div>
                    {(leave.status === "pending" || leave.status === "approved") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(leave.id)}
                        className="flex-shrink-0 active:scale-95 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
