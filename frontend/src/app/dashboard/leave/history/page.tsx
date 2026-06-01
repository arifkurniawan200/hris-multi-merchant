"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";

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

const statusConfig: Record<string, { labelKey: string; variant: string }> = {
  pending: { labelKey: "pending", variant: "warning" },
  approved: { labelKey: "approved", variant: "success" },
  rejected: { labelKey: "rejected", variant: "danger" },
  cancelled: { labelKey: "cancelled", variant: "default" },
  taken: { labelKey: "taken", variant: "info" },
  completed: { labelKey: "completed", variant: "success" },
};

export default function LeaveHistoryPage() {
  const t = useTranslations('leave');
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filteredLeaves = (leaves ?? []).filter((leave) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      leave.leave_type_name.toLowerCase().includes(q) ||
      leave.reason.toLowerCase().includes(q) ||
      leave.status.toLowerCase().includes(q)
    );
  });

  const pagedLeaves = filteredLeaves.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredLeaves.length / perPage);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    loadLeaves();
  }, []);

  async function loadLeaves() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<LeaveRequest[]>(`/api/v1/leaves/my?limit=1000&offset=0`);
      setLeaves(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load leave history");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('history')}</h1>
        <p className="text-muted-foreground mt-1">View all your past and current leave requests</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by type, reason, or status..." />

      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('all')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(filteredLeaves).length === 0 ? (
            <EmptyState icon="inbox" title={t('noLeaves')} description="Your leave history will appear here" />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('leaveType')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Range</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Days</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLeaves.map((leave) => {
                      const sc = statusConfig[leave.status] || { labelKey: leave.status, variant: "default" };
                      return (
                        <tr key={leave.id} className="border-b border-border hover:bg-muted/50 transition-all duration-200">
                          <td className="py-3 px-4 font-medium">{leave.leave_type_name}</td>
                          <td className="py-3 px-4 text-sm">
                            {leave.start_date} → {leave.end_date}
                          </td>
                          <td className="py-3 px-4 text-sm">{leave.total_days}</td>
                          <td className="py-3 px-4">
                            <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                              {t(sc.labelKey)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                            {leave.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 stagger-children">
                {pagedLeaves.map((leave) => {
                  const sc = statusConfig[leave.status] || { labelKey: leave.status, variant: "default" };
                  return (
                    <div key={leave.id} className="p-4 rounded-lg border border-border space-y-2 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{leave.leave_type_name}</span>
                        <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                          {t(sc.labelKey)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {leave.start_date} → {leave.end_date} · {leave.total_days} day{leave.total_days > 1 ? "s" : ""}
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-muted-foreground">{leave.reason}</p>
                      )}
                      {leave.reject_reason && (
                        <p className="text-sm text-danger">Rejection reason: {leave.reject_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
