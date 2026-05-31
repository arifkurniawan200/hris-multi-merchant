"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Users, AlertTriangle, X } from "lucide-react";

interface PendingLeave {
  id: string;
  employee_name: string;
  employee_code: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  created_at: string;
}

export default function PendingLeavesPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isManager) loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<PendingLeave[]>("/api/v1/leaves/pending?limit=50&offset=0");
      setPending(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pending leaves");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setProcessing(id);
    setError("");
    try {
      await api.put(`/api/v1/leaves/${id}/approve`);
      setSuccess("Leave approved successfully");
      loadPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject() {
    if (!rejectModal || rejectReason.trim().length < 10) return;
    setProcessing(rejectModal.id);
    setError("");
    try {
      await api.put(`/api/v1/leaves/${rejectModal.id}/reject`, { reason: rejectReason });
      setSuccess("Leave rejected");
      setRejectModal(null);
      setRejectReason("");
      loadPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setProcessing(null);
    }
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-[var(--foreground)]">Access Denied</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manager role required</p>
        </div>
      </div>
    );
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
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Leave Approvals</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Review and approve pending leave requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Pending</p>
                <p className="text-2xl font-bold">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Employees</p>
                <p className="text-2xl font-bold">
                  {new Set(pending.map((p) => p.employee_code)).size}
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
                <p className="text-sm text-[var(--muted-foreground)]">Total Days</p>
                <p className="text-2xl font-bold">
                  {pending.reduce((sum, p) => sum + p.total_days, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Pending list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Requests ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No pending leave requests to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((leave) => (
                <div
                  key={leave.id}
                  className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--foreground)]">{leave.employee_name}</span>
                        <Badge variant="default" className="text-xs">{leave.employee_code}</Badge>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-[var(--muted-foreground)]">Type: </span>
                          <span className="font-medium">{leave.leave_type_name}</span>
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">Dates: </span>
                          <span className="font-medium">{leave.start_date} → {leave.end_date}</span>
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">Days: </span>
                          <span className="font-medium">{leave.total_days}</span>
                        </div>
                      </div>
                      {leave.reason && (
                        <p className="text-sm text-[var(--muted-foreground)] mt-2">
                          <span className="font-medium">Reason:</span> {leave.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleApprove(leave.id)}
                        disabled={processing === leave.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRejectModal({ id: leave.id, name: leave.employee_name })}
                        disabled={processing === leave.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reject Leave Request</CardTitle>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}>
                <X className="h-5 w-5 text-[var(--muted-foreground)]" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Rejecting leave request from <strong>{rejectModal.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rejection Reason (min 10 chars)</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] min-h-[100px] resize-y"
                  placeholder="Provide a reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  minLength={10}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(""); }}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={rejectReason.trim().length < 10 || processing === rejectModal.id}
                >
                  {processing === rejectModal.id ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
