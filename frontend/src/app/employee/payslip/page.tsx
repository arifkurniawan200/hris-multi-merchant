"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import {
  fetchMyPayslips,
  downloadPayslipPDF,
  type PayrollRecord,
} from "@/lib/api-payroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Wallet,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  Download,
  CalendarDays,
} from "lucide-react";

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

export default function PayslipPage() {
  const t = useTranslations("payslip");
  const tc = useTranslations("common");
  const { user, isLoading: authLoading } = useAuth();
  const tenant = user?.tenant_id || "";

  const [payslips, setPayslips] = useState<PayrollRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Downloading state
  const [downloading, setDownloading] = useState<string | null>(null);

  // Pagination
  const perPage = 10;
  const [page, setPage] = useState(1);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPayslips = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchMyPayslips(tenant, perPage, (page - 1) * perPage);
      setPayslips(res.data ?? []);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || "Failed to load payslips");
    } finally {
      setLoading(false);
    }
  }, [tenant, page]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  // ── Download handler ──

  const handleDownload = async (record: PayrollRecord) => {
    setDownloading(record.id);
    setError("");
    try {
      const blob = await downloadPayslipPDF(record.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${record.period_month}-${record.period_year}-${record.employee_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to download payslip");
    } finally {
      setDownloading(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const totalDeductions = (r: PayrollRecord) =>
    r.late_deduction + r.absent_deduction + r.leave_deduction;

  // ── Period label ──
  const periodLabel = (r: PayrollRecord) => {
    const m = MONTHS.find((m) => m.value === r.period_month);
    return m ? `${m.label} ${r.period_year}` : `${r.period_month}/${r.period_year}`;
  };

  if (authLoading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-balance text-2xl font-bold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={loadPayslips}
          disabled={loading}
          className="active:scale-95 transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats summary */}
      {!loading && payslips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("totalPayslips")}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("paidCount")}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {payslips.filter((r) => r.status === "paid").length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("approvedCount")}
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {payslips.filter((r) => r.status === "approved").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 animate-slide-up">
          {error}
        </div>
      )}

      {/* Payslip list */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-base">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && payslips.length === 0 ? (
            <LoadingState variant="inline" />
          ) : payslips.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={t("noPayslips")}
              description={t("noPayslipsDesc")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {t("period")}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {t("baseSalary")}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {t("overtime")}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {t("deductions")}
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      {t("netSalary")}
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      {tc("status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((record) => {
                    const isExpanded = expandedId === record.id;
                    return (
                      <>
                        <tr
                          key={record.id}
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
                              {periodLabel(record)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.department_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmtIDR(record.base_salary)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600">
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
                              {record.status === "draft" && t("statusDraft")}
                              {record.status === "approved" && t("statusApproved")}
                              {record.status === "paid" && t("statusPaid")}
                            </Badge>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${record.id}-detail`}>
                            <td colSpan={7} className="bg-muted/20">
                              <div className="p-4 space-y-3 animate-slide-up">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("baseSalary")}</p>
                                    <p className="text-sm font-medium">{fmtIDR(record.base_salary)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("overtime")}</p>
                                    <p className="text-sm font-medium text-green-600">{fmtIDR(record.overtime_pay)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("reimbursement")}</p>
                                    <p className="text-sm font-medium text-green-600">{fmtIDR(record.reimbursement)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("lateDeduction")}</p>
                                    <p className="text-sm font-medium text-red-600">{fmtIDR(record.late_deduction)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("absentDeduction")}</p>
                                    <p className="text-sm font-medium text-red-600">{fmtIDR(record.absent_deduction)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("leaveDeduction")}</p>
                                    <p className="text-sm font-medium text-red-600">{fmtIDR(record.leave_deduction)}</p>
                                  </div>
                                </div>
                                <div className="border-t border-border pt-3 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-muted-foreground">{t("netSalary")}</p>
                                    <p className="text-lg font-bold">{fmtIDR(record.net_salary)}</p>
                                  </div>
                                  {record.status === "paid" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="active:scale-95 transition-all duration-200"
                                      disabled={downloading === record.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(record);
                                      }}
                                    >
                                      <Download className={`h-4 w-4 mr-1 ${downloading === record.id ? "animate-bounce" : ""}`} />
                                      {downloading === record.id ? "Downloading..." : t("download")}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
