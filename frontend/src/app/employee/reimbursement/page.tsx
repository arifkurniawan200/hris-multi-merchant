"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
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

const statusConfig: Record<string, { label: string; variant: "warning" | "success" | "danger" | "default" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function EmployeeReimbursementPage() {
  const { user } = useAuth();
  const t = useTranslations('reimbursement');
  const tc = useTranslations('common');
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

  // Client-side filter
  const [statusFilter, setStatusFilter] = useState("");
  const filteredReims = statusFilter
    ? (myReims ?? []).filter((r) => r.status === statusFilter)
    : (myReims ?? []);

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
      setTypes(typesRes ?? []);
      setMyReims(myRes?.items ?? []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : tc("somethingWentWrong")
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
      setError(tc("error"));
      return;
    }

    const amountNum = parseInt(form.amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(tc("error"));
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
      setSuccess(tc("success"));
      resetForm();
      loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : tc("somethingWentWrong")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('title')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('title')}
                </p>
                <p className="text-2xl font-bold">{(myReims ?? []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('pending')}
                </p>
                <p className="text-2xl font-bold">
                  {(myReims ?? []).filter((r) => r.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('approved')}
                </p>
                <p className="text-2xl font-bold">
                  {(myReims ?? []).filter((r) => r.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger animate-slide-up">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error.startsWith("Failed") ? "⚠️ " + error : error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success animate-slide-up">
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
          className="transition-all duration-200 active:scale-95"
        >
          <Plus className="h-4 w-4 mr-1" /> {t('submit')}
        </Button>
      </div>

      {/* New Reimbursement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('submit')}</CardTitle>
              <button
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('title')} *
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.type_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type_id: e.target.value }))
                    }
                    required
                  >
                    <option value="">{t('search')}...</option>
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('amount')} (IDR) *
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
                    <p className="text-xs text-muted-foreground mt-1">
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
                        <p className="text-xs text-danger mt-1">
                          Exceeds max amount of{" "}
                          {formatRupiah(selectedType.max_amount)}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('description')} *
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y placeholder:text-muted-foreground"
                    placeholder={t('description')}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('receipt')} (optional)
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
                    {tc('cancel')}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? tc('submitting') : t('submit')}
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('title')}
            </CardTitle>
            <FilterDropdown label={tc('status')} options={[
              {value:'pending',label:t('pending')},{value:'approved',label:t('approved')},{value:'rejected',label:t('rejected')}
            ]} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </CardHeader>
        <CardContent>
          {!myReims || myReims.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={t('noReimbursements')}
              description={tc('noData')}
            />
          ) : filteredReims.length === 0 ? (
            <EmptyState icon="search" title={tc('noResults')} description={tc('tryDifferentSearch')} />
          ) : (
            <div className="space-y-3 stagger-children">
              {filteredReims.map((r) => {
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
                            {r.type_name || t('title')}
                          </span>
                          <Badge variant={sc.variant}>
                            {sc.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('amount')}:{" "}
                          <span className="font-semibold text-foreground">
                            {formatRupiah(r.amount)}
                          </span>
                        </p>
                        {r.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {r.description}
                          </p>
                        )}
                        {r.receipt_url && (
                          <a
                            href={r.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            {t('receipt')}
                          </a>
                        )}
                        {r.reject_reason && (
                          <p className="text-sm text-danger mt-1">
                            {t('rejected')}: {r.reject_reason}
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
