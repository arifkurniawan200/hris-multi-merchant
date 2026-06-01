"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Receipt,
} from "lucide-react";
import {
  fetchReimbursementTypes,
  createReimbursementType,
  updateReimbursementType,
  deleteReimbursementType,
  fetchPendingReimbursements,
  fetchAllReimbursements,
  approveReimbursement,
  rejectReimbursement,
  type ReimbursementType,
  type Reimbursement,
} from "@/lib/api-reimbursement";
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface TypeFormData {
  name: string;
  code: string;
  max_amount: string;
  description: string;
}

const emptyTypeForm: TypeFormData = {
  name: "",
  code: "",
  max_amount: "",
  description: "",
};

const statusConfig: Record<string, { label: string; variant: "warning" | "success" | "danger" | "default" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function ManagerReimbursementPage() {
  const tr = useTranslations('reimbursement');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"types" | "pending">("types");

  // Shared state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Reimbursement Types state
  const [types, setTypes] = useState<ReimbursementType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<TypeFormData>(emptyTypeForm);

  // Reimbursement approvals state
  const [pendingReims, setPendingReims] = useState<Reimbursement[]>([]);
  const [historyReims, setHistoryReims] = useState<Reimbursement[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // Confirm delete type
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState<{ id: string; name: string } | null>(null);

  const isManager =
    user?.role === "manager" ||
    user?.role === "tenant_admin" ||
    user?.role === "super_admin";

  useEffect(() => {
    if (!isManager) return;
    if (activeTab === "types") {
      loadTypes();
    } else {
      loadReimbursements();
    }
  }, [activeTab, isManager]);

  async function loadTypes() {
    setTypesLoading(true);
    setError("");
    try {
      const data = await fetchReimbursementTypes(user?.tenant_id || "");
      setTypes(data ?? []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load reimbursement types"
      );
    } finally {
      setTypesLoading(false);
    }
  }

  async function loadReimbursements() {
    setPendingLoading(true);
    setError("");
    try {
      const tenant = user?.tenant_id || "";
      const [pendingRes, historyRes] = await Promise.all([
        fetchPendingReimbursements(tenant, 50, 0),
        fetchAllReimbursements(tenant, undefined, 50, 0),
      ]);
      setPendingReims(pendingRes?.items ?? []);
      setHistoryReims((historyRes?.items ?? []).filter((r) => r.status !== "pending"));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load reimbursements"
      );
    } finally {
      setPendingLoading(false);
    }
  }

  function resetTypeForm() {
    setTypeForm(emptyTypeForm);
    setEditingTypeId(null);
    setShowTypeForm(false);
    setError("");
  }

  function editType(rt: ReimbursementType) {
    setTypeForm({
      name: rt.name,
      code: rt.code,
      max_amount: rt.max_amount ? String(rt.max_amount) : "",
      description: rt.description || "",
    });
    setEditingTypeId(rt.id);
    setShowTypeForm(true);
    setError("");
  }

  async function handleTypeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      setError("Name and code are required");
      return;
    }

    const payload = {
      name: typeForm.name.trim(),
      code: typeForm.code.trim().toUpperCase(),
      description: typeForm.description.trim() || undefined,
      max_amount: typeForm.max_amount
        ? parseInt(typeForm.max_amount, 10)
        : undefined,
    };

    try {
      if (editingTypeId) {
        await updateReimbursementType(
          user?.tenant_id || "",
          editingTypeId,
          payload
        );
        setSuccess("Reimbursement type updated");
      } else {
        await createReimbursementType(user?.tenant_id || "", payload);
        setSuccess("Reimbursement type created");
      }
      resetTypeForm();
      loadTypes();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save reimbursement type"
      );
    }
  }

  async function handleDeleteType(id: string, name: string) {
    setError("");
    setSuccess("");
    try {
      await deleteReimbursementType(user?.tenant_id || "", id);
      setSuccess(`"${name}" deleted`);
      loadTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleApprove(id: string) {
    setProcessing(id);
    setError("");
    try {
      await approveReimbursement(user?.tenant_id || "", id);
      setSuccess("Reimbursement approved successfully");
      loadReimbursements();
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
      await rejectReimbursement(
        user?.tenant_id || "",
        rejectModal.id,
        rejectReason
      );
      setSuccess("Reimbursement rejected");
      setRejectModal(null);
      setRejectReason("");
      loadReimbursements();
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
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">{tc('error')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Manager role required
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">
          {tr('title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage reimbursement types and approve/reject employee requests
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "types"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tr('title')} Types
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "pending"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tr('pending')} {tr('title')}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger animate-slide-up">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success animate-slide-up">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* === TAB 1: Reimbursement Types === */}
      {activeTab === "types" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(types ?? []).length} {tc('name')}(s) configured
            </p>
            <Button
              onClick={() => {
                resetTypeForm();
                setShowTypeForm(true);
              }}
              className="transition-all duration-200 active:scale-95"
            >
              <Plus className="h-4 w-4 mr-1" /> {tr('title')}
            </Button>
          </div>

          {/* Create/Edit Type Form */}
          {showTypeForm && (
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {editingTypeId ? `${tc('edit')} ${tr('title')}` : `${tc('create')} ${tr('title')}`}
                </CardTitle>
                <button
                  onClick={resetTypeForm}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTypeSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {tc('name')} *
                      </label>
                      <Input
                        placeholder="e.g. Medical Reimbursement"
                        value={typeForm.name}
                        onChange={(e) =>
                          setTypeForm((f) => ({ ...f, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Code *
                      </label>
                      <Input
                        placeholder="e.g. MEDICAL"
                        value={typeForm.code}
                        onChange={(e) =>
                          setTypeForm((f) => ({
                            ...f,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        required
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {tr('amount')} (IDR)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 5000000"
                        value={typeForm.max_amount}
                        onChange={(e) =>
                          setTypeForm((f) => ({
                            ...f,
                            max_amount: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {tr('description')}
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y placeholder:text-muted-foreground"
                      placeholder="Optional description..."
                      value={typeForm.description}
                      onChange={(e) =>
                        setTypeForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetTypeForm}>
                      {tc('cancel')}
                    </Button>
                    <Button type="submit">
                      {editingTypeId ? tc('edit') : tc('create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Types list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {tr('title')} ({(types ?? []).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typesLoading ? (
                <LoadingState variant="inline" />
              ) : (types ?? []).length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title={tr('noReimbursements')}
                  description='Click "Add Type" to create one'
                />
              ) : (
                <div className="space-y-3 stagger-children">
                  {types.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card card-hover"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium text-foreground">{rt.name}</span>
                          <Badge variant="default" className="text-xs">
                            {rt.code}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {rt.max_amount
                            ? `${tr('amount')}: ${formatRupiah(rt.max_amount)}`
                            : "No max amount"}
                          {rt.description && ` · ${rt.description}`}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editType(rt)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTypeConfirm({ id: rt.id, name: rt.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* === TAB 2: Pending Reimbursements === */}
      {activeTab === "pending" && (
        <>
          {/* Pending List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                {tr('pending')} {tr('title')} ({(pendingReims ?? []).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <LoadingState variant="inline" />
              ) : (pendingReims ?? []).length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="All caught up!"
                  description="No pending reimbursement requests to review"
                />
              ) : (
                <div className="space-y-4 stagger-children">
                  {pendingReims.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-lg border border-border bg-card card-hover space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {r.employee_name || "Unknown"}
                            </span>
                            <Badge variant="warning">{tr('pending')}</Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                {tr('category')}:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {r.type_name || "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {tr('amount')}:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {formatRupiah(r.amount)}
                              </span>
                            </div>
                          </div>
                          {r.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApprove(r.id)}
                            disabled={processing === r.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {tr('approved')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setRejectModal({
                                id: r.id,
                                name: r.employee_name || "Unknown",
                              })
                            }
                            disabled={processing === r.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {tr('rejected')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approved/Rejected History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {tr('approved')} / {tr('rejected')} History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(historyReims ?? []).length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="No history yet"
                  description="Approved and rejected reimbursements will appear here"
                />
              ) : (
                <div className="space-y-3 stagger-children">
                  {historyReims.map((r) => {
                    const sc = statusConfig[r.status] || {
                      label: r.status,
                      variant: "default" as const,
                    };
                    return (
                      <div
                        key={r.id}
                        className="p-4 rounded-lg border border-border bg-card card-hover"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">
                                {r.employee_name || "Unknown"}
                              </span>
                              <Badge variant={sc.variant}>
                                {sc.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {r.type_name || "-"} ·{" "}
                              {formatRupiah(r.amount)}
                            </p>
                            {r.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {r.description}
                              </p>
                            )}
                            {r.reject_reason && (
                              <p className="text-sm text-danger mt-1">
                                Reason: {r.reject_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{tr('rejected')} {tr('title')}</CardTitle>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {tr('rejected')} request from{" "}
                <strong className="text-foreground">{rejectModal.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Rejection Reason (min 10 chars)
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y placeholder:text-muted-foreground"
                  placeholder="Provide a reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  minLength={10}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason("");
                  }}
                >
                  {tc('cancel')}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={
                    rejectReason.trim().length < 10 ||
                    processing === rejectModal.id
                  }
                >
                  {processing === rejectModal.id ? tc('submitting') : tr('rejected')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Type */}
      <ConfirmDialog
        variant="danger"
        open={!!deleteTypeConfirm}
        onClose={() => setDeleteTypeConfirm(null)}
        onConfirm={() => {
          if (deleteTypeConfirm) {
            handleDeleteType(deleteTypeConfirm.id, deleteTypeConfirm.name).then(() => setDeleteTypeConfirm(null));
          }
        }}
        title={tc('delete')}
        message={`Delete "${deleteTypeConfirm?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
