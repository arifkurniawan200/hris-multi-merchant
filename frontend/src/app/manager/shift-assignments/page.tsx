"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  X,
  Users,
  Clock,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  Edit3,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { FilterDropdown } from '@/components/ui/filter-dropdown'

interface ShiftAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  employee_name: string;
  employee_code: string;
}

interface Shift {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
}

export default function ShiftAssignmentsPage() {
  const t = useTranslations('shifts');
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterShift, setFilterShift] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Reset page on search/filter change
  useEffect(() => { setPage(1); }, [search, filterShift]);

  // Confirm dialog for remove
  const [removeConfirm, setRemoveConfirm] = useState<ShiftAssignment | null>(null);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    shift_id: "",
    employee_ids: [] as string[],
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState<ShiftAssignment | null>(null);
  const [editForm, setEditForm] = useState({
    effective_from: "",
    effective_to: "",
  });

  const isManager =
    user?.role === "manager" ||
    user?.role === "tenant_admin" ||
    user?.role === "super_admin";

  useEffect(() => {
    if (isManager) {
      loadData();
      loadShifts();
      loadEmployees();
    }
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<ShiftAssignment[]>("/api/v1/shift-assignments");
      setAssignments(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }

  async function loadShifts() {
    try {
      const data = await api.get<Shift[]>("/api/v1/shifts");
      setShifts(data || []);
    } catch {
      // silent
    }
  }

  async function loadEmployees() {
    try {
      const data = await api.get<any>("/api/v1/employees");
      const list = data?.data || data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch {
      // silent
    }
  }

  function toggleEmployee(id: string) {
    setAssignForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.includes(id)
        ? f.employee_ids.filter((eid) => eid !== id)
        : [...f.employee_ids, id],
    }));
  }

  async function handleBulkAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignForm.shift_id || assignForm.employee_ids.length === 0) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/shifts/bulk-assign", {
        shift_id: assignForm.shift_id,
        employee_ids: assignForm.employee_ids,
        effective_from: assignForm.effective_from,
        effective_to: assignForm.effective_to || undefined,
      });
      setSuccess(`Assigned to ${assignForm.employee_ids.length} employee(s)`);
      setShowAssignModal(false);
      setAssignForm({
        shift_id: "",
        employee_ids: [],
        effective_from: new Date().toISOString().split("T")[0],
        effective_to: "",
      });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign shift");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(assignment: ShiftAssignment) {
    setEditForm({
      effective_from: assignment.effective_from,
      effective_to: assignment.effective_to || "",
    });
    setShowEditModal(assignment);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!showEditModal) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.put(`/api/v1/employees/${showEditModal.employee_id}/shifts/${showEditModal.id}`, {
        effective_from: editForm.effective_from,
        effective_to: editForm.effective_to || null,
      });
      setSuccess("Assignment updated");
      setShowEditModal(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(assignment: ShiftAssignment) {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.del(`/api/v1/employees/${assignment.employee_id}/shifts/${assignment.id}`);
      setSuccess("Assignment removed");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove assignment");
    } finally {
      setSubmitting(false);
    }
  }

  // Filters
  const filtered = assignments.filter((a) => {
    const matchSearch =
      !search ||
      (a.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.employee_code || "").toLowerCase().includes(search.toLowerCase()) ||
      a.shift_name.toLowerCase().includes(search.toLowerCase());
    const matchShift = !filterShift || a.shift_id === filterShift;
    return matchSearch && matchShift;
  });
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">
            Manager role required
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('assignments')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage which employees are assigned to which shifts
          </p>
        </div>
        <Button onClick={() => { setAssignForm({ ...assignForm, shift_id: "", employee_ids: [] }); setShowAssignModal(true); }} className="active:scale-95 transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          {t('assign')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Shifts Used</p>
                <p className="text-2xl font-bold">
                  {new Set(assignments.map((a) => a.shift_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active (indefinite)</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => !a.effective_to).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Filters */}
      <Card className="card-hover transition-all duration-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name, code, or shift..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <FilterDropdown
              label="Shift"
              options={shifts.map((s) => ({ value: s.id, label: s.name }))}
              value={filterShift}
              onChange={setFilterShift}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Assignments ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No assignments found"
              description={
                assignments.length === 0
                  ? "No employees have been assigned shifts yet"
                  : "Try adjusting your search or filter"
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Shift</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Schedule</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Effective</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a) => (
                    <tr key={a.id} className="border-b border-border hover:bg-secondary/50 transition-all duration-200">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{a.employee_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.employee_code || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="info" className="text-xs">
                          {a.shift_code}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.shift_name}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs text-muted-foreground">
                          {a.start_time?.substring(0, 5) || "—"} →{" "}
                          {a.end_time?.substring(0, 5) || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs">
                          {a.effective_from}
                        </span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          → {a.effective_to || (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0">Active</Badge>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(a)}
                            title="Edit assignment dates"
                            className="active:scale-95 transition-all duration-200"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger border-red-200 hover:bg-red-50 active:scale-95 transition-all duration-200"
                            onClick={() => setRemoveConfirm(a)}
                            title="Remove assignment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 pt-4 border-t border-border">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Assign Modal ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto card-hover transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">New Shift Assignment</CardTitle>
              <button onClick={() => setShowAssignModal(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkAssign} className="space-y-4">
                {/* Shift select */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Shift</label>
                  <select
                    value={assignForm.shift_id}
                    onChange={(e) => setAssignForm((f) => ({ ...f, shift_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select shift...</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Effective From</label>
                    <Input
                      type="date"
                      value={assignForm.effective_from}
                      onChange={(e) => setAssignForm((f) => ({ ...f, effective_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Effective To (optional)</label>
                    <Input
                      type="date"
                      value={assignForm.effective_to}
                      onChange={(e) => setAssignForm((f) => ({ ...f, effective_to: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Employee selection */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Select Employees ({assignForm.employee_ids.length} selected)
                  </label>
                  {employees.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No employees found
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                      {employees.map((emp) => (
                        <label key={emp.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignForm.employee_ids.includes(emp.id)}
                            onChange={() => toggleEmployee(emp.id)}
                            className="rounded border-border"
                          />
                          <span className="text-sm font-medium">
                            {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">{emp.employee_code}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)} className="active:scale-95 transition-all duration-200">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !assignForm.shift_id || assignForm.employee_ids.length === 0} className="active:scale-95 transition-all duration-200">
                    {submitting ? "Assigning..." : `Assign to ${assignForm.employee_ids.length}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md card-hover transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Edit: {showEditModal.employee_name || "Assignment"}
              </CardTitle>
              <button onClick={() => setShowEditModal(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg mb-2">
                  <p><strong>Employee:</strong> {showEditModal.employee_name} ({showEditModal.employee_code})</p>
                  <p className="mt-1"><strong>Shift:</strong> {showEditModal.shift_name} ({showEditModal.shift_code})</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Effective From</label>
                    <Input
                      type="date"
                      value={editForm.effective_from}
                      onChange={(e) => setEditForm((f) => ({ ...f, effective_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Effective To</label>
                    <Input
                      type="date"
                      value={editForm.effective_to}
                      onChange={(e) => setEditForm((f) => ({ ...f, effective_to: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave "Effective To" empty for indefinite assignment.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(null)} className="active:scale-95 transition-all duration-200">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="active:scale-95 transition-all duration-200">
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Remove */}
      <ConfirmDialog
        variant="danger"
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={() => {
          if (removeConfirm) {
            handleRemove(removeConfirm).then(() => setRemoveConfirm(null));
          }
        }}
        title="Remove Shift Assignment"
        message={`Remove shift assignment for ${removeConfirm?.employee_name || "this employee"}?`}
      />
    </div>
  );
}
