"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Filter, AlertCircle, Download } from "lucide-react";
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown } from '@/components/ui/filter-dropdown';

interface LeaveRequest {
  id: string;
  employee_name: string;
  employee_code: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string;
  created_at: string;
  reviewer_name?: string;
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "default" },
  taken: { label: "Taken", variant: "info" },
  completed: { label: "Completed", variant: "success" },
};

export default function AllLeavesPage() {
  const { user } = useAuth();
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isManager) loadLeaves();
  }, [page, statusFilter, dateFrom, dateTo, search]);

  async function loadLeaves() {
    setLoading(true);
    setError("");
    try {
      let url = `/api/v1/leaves?limit=${limit}&offset=${page * limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (search) url += `&employee_id=${search}`;

      const data = await api.get<{ data: LeaveRequest[]; total: number }>(url);
      setLeaves(data.data || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load leaves");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(0);
    loadLeaves();
  }

  function clearFilters() {
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(0);
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">Manager role required</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Leave Requests</h1>
        <p className="text-muted-foreground mt-1">View and filter all employee leave requests</p>
      </div>

      {/* Filters */}
      <Card className="card-hover transition-all duration-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <FilterDropdown label="Status" options={[
                {value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'},{value:'cancelled',label:'Cancelled'},{value:'taken',label:'Taken'},{value:'completed',label:'Completed'}
              ]} value={statusFilter} onChange={setStatusFilter} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Date From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Date To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Employee Code</label>
              <Input
                placeholder="Search by code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="flex-1 active:scale-95 transition-all duration-200">
                <Filter className="h-4 w-4 mr-1" /> Filter
              </Button>
              <Button variant="outline" onClick={clearFilters} className="active:scale-95 transition-all duration-200">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {total} Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState variant="inline" />
          ) : leaves.length === 0 ? (
            <EmptyState icon="inbox" title="No leave requests found" description="Try adjusting your filters" />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Range</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Days</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reviewed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => {
                      const sc = statusConfig[leave.status] || { label: leave.status, variant: "default" };
                      return (
                        <tr key={leave.id} className="border-b border-border hover:bg-muted/50 transition-all duration-200">
                          <td className="py-3 px-4">
                            <div className="font-medium">{leave.employee_name}</div>
                            <div className="text-xs text-muted-foreground">{leave.employee_code}</div>
                          </td>
                          <td className="py-3 px-4 text-sm">{leave.leave_type_name}</td>
                          <td className="py-3 px-4 text-sm">
                            {leave.start_date} → {leave.end_date}
                          </td>
                          <td className="py-3 px-4 text-sm">{leave.total_days}</td>
                          <td className="py-3 px-4">
                            <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {leave.reviewer_name || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 stagger-children">
                {leaves.map((leave) => {
                  const sc = statusConfig[leave.status] || { label: leave.status, variant: "default" };
                  return (
                    <div key={leave.id} className="p-4 rounded-lg border border-border space-y-2 card-hover transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{leave.employee_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{leave.employee_code}</span>
                        </div>
                        <Badge variant={sc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {leave.leave_type_name} · {leave.start_date} → {leave.end_date} · {leave.total_days} days
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
                  </p>
                </div>
                <Pagination
                  currentPage={page + 1}
                  totalPages={totalPages}
                  onPageChange={(p) => setPage(p - 1)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
