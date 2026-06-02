"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import {
  fetchMyShiftSwaps,
  createShiftSwap,
  cancelShiftSwap,
  type ShiftSwap,
  type CreateShiftSwapRequest,
} from "@/lib/api-shift-swap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Plus,
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

export default function EmployeeShiftSwapsPage() {
  const t = useTranslations("shiftSwap");
  const tc = useTranslations("common");
  const { user } = useAuth();

  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateShiftSwapRequest>({
    target_employee_id: "",
    requester_date: "",
    target_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Cancel dialog
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMyShiftSwaps();
      setSwaps(data ?? []);
    } catch (e: any) {
      setError(e?.message || tc("error"));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError("");
    try {
      await createShiftSwap(form);
      setSuccess(t("swapSuccess"));
      setShowCreate(false);
      setForm({ target_employee_id: "", requester_date: "", target_date: "", reason: "" });
      load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || tc("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    setError("");
    try {
      await cancelShiftSwap(cancelId);
      setSuccess(t("cancelSuccess"));
      setCancelId(null);
      load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || tc("error"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="active:scale-95 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("requestSwap")}
        </Button>
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

      {/* Swap list */}
      {swaps.length === 0 ? (
        <EmptyState
          icon={<ArrowRightLeft className="h-8 w-8" />}
          title={t("noSwaps")}
          action={{
            label: t("requestSwap"),
            onClick: () => setShowCreate(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {swaps.map((swap) => (
            <Card key={swap.id} className="card-hover transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {fmtDate(swap.requester_date)}
                      </span>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {fmtDate(swap.target_date)}
                      </span>
                      <Badge className={statusColor[swap.status] || ""}>
                        {t(statusKey[swap.status] || swap.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("targetEmployee")}:{" "}
                      <span className="font-medium text-foreground">
                        {swap.target_name} ({swap.target_code})
                      </span>
                    </div>
                    {swap.reason && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">{t("reason")}:</span>{" "}
                        {swap.reason}
                      </p>
                    )}
                    {swap.rejection_reason && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">{t("rejectionReason")}:</span>{" "}
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
                  {swap.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                      onClick={() => setCancelId(swap.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("cancel")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("requestSwap")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("requesterDate")}
              </label>
              <Input
                type="date"
                value={form.requester_date}
                onChange={(e) =>
                  setForm({ ...form, requester_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("targetDate")}
              </label>
              <Input
                type="date"
                value={form.target_date}
                onChange={(e) =>
                  setForm({ ...form, target_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("targetEmployee")}
              </label>
              <Input
                placeholder={t("selectEmployee")}
                value={form.target_employee_id}
                onChange={(e) =>
                  setForm({ ...form, target_employee_id: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Masukkan ID karyawan target
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("reason")}
              </label>
              <Textarea
                placeholder={t("reason")}
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  submitting ||
                  !form.requester_date ||
                  !form.target_date ||
                  !form.target_employee_id ||
                  !form.reason ||
                  form.reason.length < 5
                }
              >
                {submitting ? tc("loading") : tc("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title={t("confirmCancel")}
        loading={cancelling}
      />
    </div>
  );
}
