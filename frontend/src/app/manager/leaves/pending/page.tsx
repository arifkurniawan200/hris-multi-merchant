"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Users, AlertTriangle, X, Search } from "lucide-react";
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';

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
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('leave');
  const tc = useTranslations('common');

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const [pending, setPending] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    if (isManager) loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<PendingLeave[]>("/api/v1/leaves/pending?limit=50&offset=0");
      setPending(data || []);
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

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  // Filter & Paginate
  const filtered = pending.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.employee_name || "").toLowerCase().includes(q) ||
      (p.employee_code || "").toLowerCase().includes(q) ||
      p.leave_type_name.toLowerCase().includes(q) ||
      (p.reason || "").toLowerCase().includes(q)
    );
  });
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (authLoading) return null;
  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">Manager role required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve pending leave requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">
                  {new Set(pending.map((p) => p.employee_code)).size}
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
                <p className="text-sm text-muted-foreground">Total Days</p>
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
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Pending list */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Requests ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name, code, leave type, or reason..."
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="inbox" title="All caught up!" description="No pending leave requests to review" />
          ) : (
            <div className="space-y-4 stagger-children">
              {paged.map((leave) => (
                <div
                  key={leave.id}
                  className="p-4 rounded-lg border border-border bg-card space-y-3 card-hover transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{leave.employee_name}</span>
                        <Badge variant="default" className="text-xs">{leave.employee_code}</Badge>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type: </span>
                          <span className="font-medium">{leave.leave_type_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dates: </span>
                          <span className="font-medium">{leave.start_date} → {leave.end_date}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Days: </span>
                          <span className="font-medium">{leave.total_days}</span>
                        </div>
                      </div>
                      {leave.reason && (
                        <p className="text-sm text-muted-foreground mt-2">
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
                        className="active:scale-95 transition-all duration-200"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRejectModal({ id: leave.id, name: leave.employee_name })}
                        disabled={processing === leave.id}
                        className="active:scale-95 transition-all duration-200"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                  </p>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md card-hover transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reject Leave Request</CardTitle>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rejecting leave request from <strong>{rejectModal.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rejection Reason (min 10 chars)</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y"
                  placeholder="Provide a reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  minLength={10}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(""); }} className="active:scale-95 transition-all duration-200">
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={rejectReason.trim().length < 10 || processing === rejectModal.id}
                  className="active:scale-95 transition-all duration-200"
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
