"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setError(err instanceof Error ? err.message : "Failed to load departments");
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
      setSuccess(`Department "${form.name}" created`);
      setShowCreateModal(false);
      resetForm();
      loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create department");
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
      setSuccess(`Department "${form.name}" updated`);
      setShowEditModal(null);
      loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update department");
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
      setSuccess(`Department "${showDeleteConfirm.name}" deleted`);
      setShowDeleteConfirm(null);
      loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete department");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-[var(--foreground)]">Access Denied</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manager role required</p>
        </div>
      </div>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Department Management</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Manage organizational departments</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Departments ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No departments defined</p>
              <p className="text-sm mt-1">Add your first department to organize employees</p>
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--foreground)]">{dept.name}</span>
                      <Badge variant="info" className="text-xs">{dept.code}</Badge>
                      {!dept.is_active && (
                        <span className="inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">{dept.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(dept)}>
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setShowDeleteConfirm(dept)}
                      className="text-[var(--danger)] border-red-200 hover:bg-red-50"
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

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <DepartmentModal
          title="Add Department"
          onClose={() => { setShowCreateModal(false); resetForm(); }}
          onSubmit={handleCreate}
          submitting={submitting}
          form={form}
          setForm={setForm}
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
        />
      )}

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Confirm Delete</CardTitle>
              <button onClick={() => setShowDeleteConfirm(null)}><X className="h-5 w-5 text-[var(--muted-foreground)]" /></button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={submitting}>
                  {submitting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DepartmentModal({
  title, onClose, onSubmit, submitting, form, setForm,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  form: { name: string; code: string; description: string };
  setForm: (f: { name: string; code: string; description: string }) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <button onClick={onClose}><X className="h-5 w-5 text-[var(--muted-foreground)]" /></button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. HRD, FIN, IT" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm min-h-[60px]" />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border)]">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
