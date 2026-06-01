"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import {
  fetchReimbursementTypes,
  submitReimbursement,
  fetchMyReimbursements,
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

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function EmployeeReimbursementPage() {
  const { user } = useAuth();
  const [types, setTypes] = useState<ReimbursementType[]>([]);
  const [myReims, setMyReims] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New reimbursement modal
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type_id: "",
    amount: "",
    description: "",
    receipt_url: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const tenant = user?.tenant_id || "";
      const [typesRes, myRes] = await Promise.all([
        fetchReimbursementTypes(tenant),
        fetchMyReimbursements(tenant, 50, 0),
      ]);
      setTypes(typesRes);
      setMyReims(myRes.items || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ type_id: "", amount: "", description: "", receipt_url: "" });
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.type_id || !form.amount || !form.description.trim()) {
      setError("Type, amount, and description are required");
      return;
    }

    const amountNum = parseInt(form.amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      await submitReimbursement(user?.tenant_id || "", {
        type_id: form.type_id,
        amount: amountNum,
        description: form.description.trim(),
        receipt_url: form.receipt_url.trim() || undefined,
      });
      setSuccess("Reimbursement submitted successfully!");
      resetForm();
      loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to submit reimbursement"
      );
    } finally {
      setSubmitting(false);
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Reimbursement
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Submit and track your reimbursement requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent)]">
                <FileText className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Total Requests
                </p>
                <p className="text-2xl font-bold">{myReims.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Pending
                </p>
                <p className="text-2xl font-bold">
                  {myReims.filter((r) => r.status === "pending").length}
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
                <p className="text-sm text-[var(--muted-foreground)]">
                  Approved
                </p>
                <p className="text-2xl font-bold">
                  {myReims.filter((r) => r.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* New Reimbursement Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Reimbursement
        </Button>
      </div>

      {/* New Reimbursement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>New Reimbursement Request</CardTitle>
              <button
                onClick={resetForm}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Reimbursement Type *
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    value={form.type_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type_id: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select type...</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                        {t.max_amount
                          ? ` - max ${formatRupiah(t.max_amount)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Amount (IDR) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 500000"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    required
                  />
                  {form.amount && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {formatRupiah(parseInt(form.amount) || 0)}
                    </p>
                  )}
                  {form.type_id && form.amount && (() => {
                    const selectedType = types.find(
                      (t) => t.id === form.type_id
                    );
                    const amountNum = parseInt(form.amount) || 0;
                    if (
                      selectedType?.max_amount &&
                      amountNum > selectedType.max_amount
                    ) {
                      return (
                        <p className="text-xs text-red-500 mt-1">
                          Exceeds max amount of{" "}
                          {formatRupiah(selectedType.max_amount)}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Description *
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] min-h-[80px] resize-y"
                    placeholder="Describe what this reimbursement is for..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Receipt URL (optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/receipt.pdf"
                    value={form.receipt_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, receipt_url: e.target.value }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Reimbursement"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Reimbursement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--primary)]" />
            My Reimbursement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myReims.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No reimbursement requests yet</p>
              <p className="text-sm mt-1">
                Click "New Reimbursement" to submit your first request
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReims.map((r) => {
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
                            {r.type_name || "Reimbursement"}
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
                          Amount:{" "}
                          <span className="font-semibold text-[var(--foreground)]">
                            {formatRupiah(r.amount)}
                          </span>
                        </p>
                        {r.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {r.description}
                          </p>
                        )}
                        {r.receipt_url && (
                          <a
                            href={r.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline mt-1 inline-block"
                          >
                            View Receipt
                          </a>
                        )}
                        {r.reject_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            Rejected: {r.reject_reason}
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
    </div>
  );
}
