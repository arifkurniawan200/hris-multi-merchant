"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FileText, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days_per_year: number;
  color: string;
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
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
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
      const [typesRes, leavesRes] = await Promise.all([
        api.get<LeaveType[]>("/api/v1/leaves-types"),
        api.get<LeaveRequest[]>("/api/v1/leaves/my?limit=10&offset=0"),
      ]);
      setLeaveTypes(typesRes);
      setMyLeaves(leavesRes);
    } catch (err) {
      // Silently handle — user may not have types yet
    } finally {
      setLoading(false);
    }
  }

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Leave Management</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Submit and track your leave requests</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent)]">
                <FileText className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Requests</p>
                <p className="text-2xl font-bold">{myLeaves.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Pending</p>
                <p className="text-2xl font-bold">
                  {myLeaves.filter((l) => l.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Approved</p>
                <p className="text-2xl font-bold">
                  {myLeaves.filter((l) => l.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Submit form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[var(--primary)]" />
            Submit Leave Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Leave Type</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  value={form.leave_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value }))}
                  required
                >
                  <option value="">Select leave type...</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.default_days_per_year} days/year)
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium mb-1.5">Start Date</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  onBlur={calcDays}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">End Date</label>
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
              <label className="block text-sm font-medium mb-1.5">Reason</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] min-h-[100px] resize-y"
                placeholder="Describe your reason for leave (min 10 characters)..."
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                required
                minLength={10}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="min-w-[160px]">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {myLeaves.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No leave requests yet</p>
              <p className="text-sm mt-1">Submit your first request using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myLeaves.map((leave) => {
                const sc = statusConfig[leave.status] || { label: leave.status, variant: "default" };
                return (
                  <div
                    key={leave.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{leave.leave_type_name}</span>
                        <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {leave.start_date} → {leave.end_date} · {leave.total_days} day{leave.total_days > 1 ? "s" : ""}
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">{leave.reason}</p>
                      )}
                    </div>
                    {(leave.status === "pending" || leave.status === "approved") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(leave.id)}
                        className="flex-shrink-0"
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
