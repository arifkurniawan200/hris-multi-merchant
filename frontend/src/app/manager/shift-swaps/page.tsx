"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchPendingShiftSwaps,
  fetchAllShiftSwaps,
  approveShiftSwap,
  rejectShiftSwap,
  type ShiftSwap,
} from "@/lib/api-shift-swap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import {
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  cancelled: "bg-gray-100 text-gray-600 border-gray-300",
};

const statusKey: Record<string, string> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  cancelled: "cancelled",
};

const fmtDate = (d: string) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type Tab = "pending" | "all";

export default function ManagerShiftSwapsPage() {
  const t = useTranslations("shiftSwap");
  const tc = useTranslations("common");
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const [tab, setTab] = useState<Tab>("pending");

  // Data
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter (All tab)
  const [statusFilter, setStatusFilter] = useState("");

  // Approve
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Reject
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "pending") {
        const data = await fetchPendingShiftSwaps("");
        setSwaps(data ?? []);
      } else {
        const data = await fetchAllShiftSwaps(
          "",
          statusFilter || undefined
        );
        setSwaps(data ?? []);
      }
    } catch (e: any) {
      setError(e?.message || tc("error"));
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, tc]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    if (!approveId) return;
    setApproving(true);
    setError("");
    try {
      await approveShiftSwap(approveId);
      setSuccess(t("approveSuccess"));
      setApproveId(null);
      load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || tc("error"));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    if (!rejectReason || rejectReason.length < 3) return;
    setRejecting(true);
    setError("");
    try {
      await rejectShiftSwap(rejectId, rejectReason);
      setSuccess(t("rejectSuccess"));
      setRejectId(null);
      setRejectReason("");
      load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || tc("error"));
    } finally {
      setRejecting(false);
    }
  };

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Cancelled", value: "cancelled" },
  ];

  if (authLoading) return null;
  if (!isManager) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
            tab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("pendingApprovals")}
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
            tab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("allSwaps")}
        </button>
      </div>

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

      {/* Filter (All tab) */}
      {tab === "all" && (
        <div className="flex justify-end">
          <FilterDropdown
            label={t("status")}
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingState variant="fullscreen" />
      ) : swaps.length === 0 ? (
        <EmptyState
          icon={<ArrowRightLeft className="h-8 w-8" />}
          title={tab === "pending" ? t("noPending") : t("noSwaps")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {swaps.map((swap) => (
            <Card
              key={swap.id}
              className="card-hover transition-all duration-200"
            >
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Swap info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {swap.requester_name} ({swap.requester_code})
                      </span>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {swap.target_name} ({swap.target_code})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">
                        {fmtDate(swap.requester_date)}
                      </span>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {fmtDate(swap.target_date)}
                      </span>
                      <Badge className={statusColor[swap.status] || ""}>
                        {t(statusKey[swap.status] || swap.status)}
                      </Badge>
                    </div>
                    {swap.reason && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">{t("reason")}:</span>{" "}
                        {swap.reason}
                      </p>
                    )}
                    {swap.rejection_reason && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">
                          {t("rejectionReason")}:
                        </span>{" "}
                        {swap.rejection_reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(swap.created_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Actions (pending tab only) */}
                  {tab === "pending" && swap.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setApproveId(swap.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t("approve")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectId(swap.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("reject")}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!approveId}
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title={t("confirmApprove")}
        loading={approving}
      />

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onClose={() => { setRejectId(null); setRejectReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmReject")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("rejectionReason")} <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={t("rejectionReason")}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
              >
                {tc("cancel")}
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={rejecting || !rejectReason || rejectReason.length < 3}
              >
                {rejecting ? tc("loading") : t("reject")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
