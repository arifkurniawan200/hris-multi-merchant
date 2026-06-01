"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
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

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function ManagerReimbursementPage() {
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
      setTypes(data);
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
      setPendingReims(pendingRes.items || []);
      setHistoryReims((historyRes.items || []).filter((r) => r.status !== "pending"));
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
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
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
          <p className="font-medium text-[var(--foreground)]">Access Denied</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Manager role required
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Reimbursement Management
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Manage reimbursement types and approve/reject employee requests
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "types"
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Reimbursement Types
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Pending Reimbursements
        </button>
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

      {/* === TAB 1: Reimbursement Types === */}
      {activeTab === "types" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              {types.length} type(s) configured
            </p>
            <Button
              onClick={() => {
                resetTypeForm();
                setShowTypeForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Type
            </Button>
          </div>

          {/* Create/Edit Type Form */}
          {showTypeForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {editingTypeId ? "Edit Reimbursement Type" : "New Reimbursement Type"}
                </CardTitle>
                <button
                  onClick={resetTypeForm}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTypeSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Name *
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
                      <label className="block text-sm font-medium mb-1.5">
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
                      <label className="block text-sm font-medium mb-1.5">
                        Max Amount (IDR)
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
                    <label className="block text-sm font-medium mb-1.5">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] min-h-[80px] resize-y"
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
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTypeId ? "Update" : "Create"}
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
                <Receipt className="h-5 w-5 text-[var(--primary)]" />
                All Reimbursement Types ({types.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
                </div>
              ) : types.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No reimbursement types yet</p>
                  <p className="text-sm mt-1">Click "Add Type" to create one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {types.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium">{rt.name}</span>
                          <Badge variant="default" className="text-xs">
                            {rt.code}
                          </Badge>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                          {rt.max_amount
                            ? `Max: ${formatRupiah(rt.max_amount)}`
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
                          onClick={() => handleDeleteType(rt.id, rt.name)}
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
                Pending Reimbursements ({pendingReims.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
                </div>
              ) : pendingReims.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm mt-1">
                    No pending reimbursement requests to review
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReims.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[var(--foreground)]">
                              {r.employee_name || "Unknown"}
                            </span>
                            <Badge variant="warning">Pending</Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-[var(--muted-foreground)]">
                                Type:{" "}
                              </span>
                              <span className="font-medium">
                                {r.type_name || "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted-foreground)]">
                                Amount:{" "}
                              </span>
                              <span className="font-medium">
                                {formatRupiah(r.amount)}
                              </span>
                            </div>
                          </div>
                          {r.description && (
                            <p className="text-sm text-[var(--muted-foreground)] mt-2">
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
                            Approve
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

          {/* Approved/Rejected History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[var(--primary)]" />
                Approved / Rejected History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyReims.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No history yet</p>
                  <p className="text-sm mt-1">
                    Approved and rejected reimbursements will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyReims.map((r) => {
                    const sc =
                      statusConfig[r.status] || {
                        label: r.status,
                        variant: "default",
                      };
                    return (
                      <div
                        key={r.id}
                        className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {r.employee_name || "Unknown"}
                              </span>
                              <Badge
                                variant={
                                  sc.variant as
                                    | "default"
                                    | "success"
                                    | "warning"
                                    | "danger"
                                    | "info"
                                }
                              >
                                {sc.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">
                              {r.type_name || "-"} ·{" "}
                              {formatRupiah(r.amount)}
                            </p>
                            {r.description && (
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                {r.description}
                              </p>
                            )}
                            {r.reject_reason && (
                              <p className="text-sm text-red-600 mt-1">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reject Reimbursement</CardTitle>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
              >
                <X className="h-5 w-5 text-[var(--muted-foreground)]" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Rejecting reimbursement request from{" "}
                <strong>{rejectModal.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Rejection Reason (min 10 chars)
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] min-h-[100px] resize-y"
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
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={
                    rejectReason.trim().length < 10 ||
                    processing === rejectModal.id
                  }
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
