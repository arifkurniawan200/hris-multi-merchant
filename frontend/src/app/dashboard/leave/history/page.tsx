"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  leave_type_name: string;
  created_at: string;
  reject_reason?: string;
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "default" },
  taken: { label: "Taken", variant: "info" },
  completed: { label: "Completed", variant: "success" },
};

export default function LeaveHistoryPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadLeaves();
  }, [page]);

  async function loadLeaves() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<LeaveRequest[]>(
        `/api/v1/leaves/my?limit=${limit}&offset=${page * limit}`
      );
      setLeaves(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load leave history");
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Leave History</h1>
        <p className="text-[var(--muted-foreground)] mt-1">View all your past and current leave requests</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--primary)]" />
            All Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No leave requests found</p>
              <p className="text-sm mt-1">Your leave history will appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Leave Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Date Range</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Days</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => {
                      const sc = statusConfig[leave.status] || { label: leave.status, variant: "default" };
                      return (
                        <tr key={leave.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                          <td className="py-3 px-4 font-medium">{leave.leave_type_name}</td>
                          <td className="py-3 px-4 text-sm">
                            {leave.start_date} → {leave.end_date}
                          </td>
                          <td className="py-3 px-4 text-sm">{leave.total_days}</td>
                          <td className="py-3 px-4">
                            <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--muted-foreground)] max-w-[200px] truncate">
                            {leave.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {leaves.map((leave) => {
                  const sc = statusConfig[leave.status] || { label: leave.status, variant: "default" };
                  return (
                    <div key={leave.id} className="p-4 rounded-lg border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{leave.leave_type_name}</span>
                        <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {leave.start_date} → {leave.end_date} · {leave.total_days} day{leave.total_days > 1 ? "s" : ""}
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-[var(--muted-foreground)]">{leave.reason}</p>
                      )}
                      {leave.reject_reason && (
                        <p className="text-sm text-red-600">Rejection reason: {leave.reject_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Showing page {page + 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={leaves.length < limit}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
