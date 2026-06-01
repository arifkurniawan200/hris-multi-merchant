"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  AlertTriangle,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  parent_id: string | null;
  manager_id: string | null;
  manager_name: string;
  is_active: boolean;
  created_at: string;
}

export default function DepartmentManagementPage() {
  const { user } = useAuth();
  const t = useTranslations('departments');
  const tc = useTranslations('common');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Department | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isManager) loadDepartments();
  }, []);

  async function loadDepartments() {
    setLoading(true);
    try {
      const data = await api.get<Department[]>("/api/v1/departments");
      setDepartments(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: "", code: "", description: "" });
  }

  function openEdit(dept: Department) {
    setForm({ name: dept.name, code: dept.code, description: dept.description || "" });
    setShowEditModal(dept);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/departments", form);
      setSuccess(tc("success"));
      setShowCreateModal(false);
      resetForm();
      loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!showEditModal) return;
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await api.put(`/api/v1/departments/${showEditModal.id}`, form);
      setSuccess(tc("success"));
      setShowEditModal(null);
      loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm) return;
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await api.del(`/api/v1/departments/${showDeleteConfirm.id}`);
      setSuccess(tc("success"));
      setShowDeleteConfirm(null);
      loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  // Filter & Paginate
  const filtered = departments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q)
    );
  });
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">{tc("error")}</p>
          <p className="text-sm text-muted-foreground mt-1">{tc("error")}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('title')}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="active:scale-95 transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          {t('add')}
        </Button>
      </div>

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

      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle>{t('title')} ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('search')}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="inbox" title={t('noDepartments')} description={t('noDepartments')} action={{ label: t('add'), onClick: () => { resetForm(); setShowCreateModal(true); } }} />
          ) : (
            <div className="space-y-3 stagger-children">
              {paged.map((dept) => (
                <div
                  key={dept.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card card-hover transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{dept.name}</span>
                      <Badge variant="info" className="text-xs">{dept.code}</Badge>
                      {!dept.is_active && (
                        <span className="inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                          {tc('inactive')}
                        </span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(dept)} className="active:scale-95 transition-all duration-200">
                      <Edit3 className="h-4 w-4 mr-1" /> {tc('edit')}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setShowDeleteConfirm(dept)}
                      className="text-danger border-red-200 hover:bg-red-50 active:scale-95 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pt-4 border-t border-border">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <DepartmentModal
          title={t('add')}
          onClose={() => { setShowCreateModal(false); resetForm(); }}
          onSubmit={handleCreate}
          submitting={submitting}
          form={form}
          setForm={setForm}
          t={t}
          tc={tc}
        />
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && (
        <DepartmentModal
          title={`Edit: ${showEditModal.name}`}
          onClose={() => { setShowEditModal(null); resetForm(); }}
          onSubmit={handleEdit}
          submitting={submitting}
          form={form}
          setForm={setForm}
          t={t}
          tc={tc}
        />
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={t('delete')}
        message={`${tc('confirmDelete')} ${showDeleteConfirm?.name}?`}
        variant="danger"
        confirmLabel={submitting ? tc('deleting') : tc('delete')}
        loading={submitting}
      />
    </div>
  );
}

function DepartmentModal({
  title, onClose, onSubmit, submitting, form, setForm, t, tc,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  form: { name: string; code: string; description: string };
  setForm: (f: { name: string; code: string; description: string }) => void;
  t: (k: string) => string;
  tc: (k: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('name')} *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('code')} *</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. HRD, FIN, IT" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[60px]" />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>{tc('cancel')}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? tc('saving') : tc('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
