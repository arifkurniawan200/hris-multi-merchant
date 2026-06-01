"use client";

import { useState, useEffect } from "react";
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
  const { user } = useAuth();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    default_days_per_year: "12",
    max_consecutive_days: "0",
    is_paid: true,
    color: "#3b82f6",
    description: "",
  });

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isManager) loadTypes();
  }, []);

  async function loadTypes() {
    setLoading(true);
    try {
      const data = await api.get<LeaveType[]>("/api/v1/leaves-types");
      setTypes(data);
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

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Leave Types</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Manage leave types and allocations</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Type
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

      {/* Create/Edit form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Leave Type" : "New Leave Type"}</CardTitle>
            <button onClick={resetForm} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
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
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          form.color === c ? "border-[var(--foreground)] scale-110" : "border-transparent"
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
                      className="w-4 h-4 rounded border-[var(--border)]"
                    />
                    <span className="text-sm font-medium">Paid Leave</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] min-h-[80px] resize-y"
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">
                  {editingId ? "Update" : "Create"}
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
            <FileText className="h-5 w-5 text-[var(--primary)]" />
            All Leave Types ({types.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {types.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No leave types yet</p>
              <p className="text-sm mt-1">Click "Add Type" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {types.map((lt) => (
                <div
                  key={lt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
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
                      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                        {lt.default_days_per_year} days/year
                        {lt.max_consecutive_days > 0 && ` · max ${lt.max_consecutive_days} consecutive`}
                        {lt.description && ` · ${lt.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => editType(lt)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(lt.id, lt.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
