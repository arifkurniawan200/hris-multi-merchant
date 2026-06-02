"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, FileText, Edit3, Trash2, X, Check, 
  AlertCircle, CheckCircle2, Palette 
} from "lucide-react";
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days_per_year: number;
  max_consecutive_days: number;
  is_paid: boolean;
  color: string;
  description: string;
  created_at: string;
}

const defaultColors = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", 
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export default function LeaveTypesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('leave');

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const tc = useTranslations('common');
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [form, setForm] = useState({
    name: "",
    code: "",
    default_days_per_year: "12",
    max_consecutive_days: "0",
    is_paid: true,
    color: "#3b82f6",
    description: "",
  });

  useEffect(() => {
    if (isManager) loadTypes();
  }, []);

  async function loadTypes() {
    setLoading(true);
    try {
      const data = await api.get<LeaveType[]>("/api/v1/leaves-types");
      setTypes(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load leave types");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: "",
      code: "",
      default_days_per_year: "12",
      max_consecutive_days: "0",
      is_paid: true,
      color: "#3b82f6",
      description: "",
    });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function editType(lt: LeaveType) {
    setForm({
      name: lt.name,
      code: lt.code,
      default_days_per_year: String(lt.default_days_per_year),
      max_consecutive_days: String(lt.max_consecutive_days),
      is_paid: lt.is_paid,
      color: lt.color || "#3b82f6",
      description: lt.description,
    });
    setEditingId(lt.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/v1/leaves-types/${editingId}`, {
          name: form.name,
          code: form.code,
          default_days_per_year: parseInt(form.default_days_per_year) || 12,
          max_consecutive_days: parseInt(form.max_consecutive_days) || 0,
          is_paid: form.is_paid,
          color: form.color,
          description: form.description,
        });
        setSuccess("Leave type updated");
      } else {
        await api.post("/api/v1/leaves-types", {
          name: form.name,
          code: form.code,
          default_days_per_year: parseInt(form.default_days_per_year) || 12,
          max_consecutive_days: parseInt(form.max_consecutive_days) || 0,
          is_paid: form.is_paid,
          color: form.color,
          description: form.description,
        });
        setSuccess("Leave type created");
      }
      resetForm();
      loadTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save leave type");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await api.del(`/api/v1/leaves-types/${id}`);
      setSuccess(`"${name}" deleted`);
      loadTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  // Filter & Paginate
  const filtered = types.filter((lt) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lt.name.toLowerCase().includes(q) ||
      lt.code.toLowerCase().includes(q) ||
      (lt.description || "").toLowerCase().includes(q)
    );
  });
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (authLoading) return null;
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

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Types</h1>
          <p className="text-muted-foreground mt-1">Manage leave types and allocations</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="active:scale-95 transition-all duration-200">
          <Plus className="h-4 w-4 mr-1" /> Add Type
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

      {/* Create/Edit form */}
      {showForm && (
        <Card className="card-hover transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Leave Type" : "New Leave Type"}</CardTitle>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name *</label>
                  <Input
                    placeholder="e.g. Annual Leave"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Code *</label>
                  <Input
                    placeholder="e.g. AL"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    required
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Default Days/Year</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.default_days_per_year}
                    onChange={(e) => setForm((f) => ({ ...f, default_days_per_year: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Max Consecutive Days (0=unlimited)</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.max_consecutive_days}
                    onChange={(e) => setForm((f) => ({ ...f, max_consecutive_days: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Color</label>
                  <div className="flex items-center gap-2">
                    {defaultColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, color: c }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all active:scale-95 ${
                          form.color === c ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_paid}
                      onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm font-medium">Paid Leave</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="active:scale-95 transition-all duration-200">Cancel</Button>
                <Button type="submit" className="active:scale-95 transition-all duration-200">
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Types list */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            All Leave Types ({types.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {types.length === 0 ? (
            <EmptyState icon="inbox" title="No leave types yet" description='Click "Add Type" to create one' action={{ label: "Add Type", onClick: () => { resetForm(); setShowForm(true); }}} />
          ) : (
            <>
              {/* Search */}
              <div className="mb-4">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search leave types by name, code, or description..."
                />
              </div>

              {filtered.length === 0 ? (
                <EmptyState icon="search" title="No matching leave types" description="Try adjusting your search" />
              ) : (
              <div className="space-y-3 stagger-children">
                {paged.map((lt) => (
                <div
                  key={lt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card card-hover transition-all duration-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lt.color || "#3b82f6" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lt.name}</span>
                        <Badge variant="default" className="text-xs">{lt.code}</Badge>
                        {lt.is_paid && (
                          <Badge variant="success" className="text-xs">Paid</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {lt.default_days_per_year} days/year
                        {lt.max_consecutive_days > 0 && ` · max ${lt.max_consecutive_days} consecutive`}
                        {lt.description && ` · ${lt.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => editType(lt)} className="active:scale-95 transition-all duration-200">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(lt.id, lt.name)} className="active:scale-95 transition-all duration-200">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
