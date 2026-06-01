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
  Plus,
  ArrowLeftRight,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
  Clock,
  AlertTriangle,
  X,
  Link2,
} from "lucide-react";
import Link from "next/link";
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SearchBar } from '@/components/ui/search-bar'
import { Pagination } from '@/components/ui/pagination'
import { FilterDropdown } from '@/components/ui/filter-dropdown'

interface Shift {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  clockin_window_before_minutes: number;
  clockout_window_after_minutes: number;
  is_flexible: boolean;
  color: string;
  created_at: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_code: string;
}

interface BulkAssignRequest {
  shift_id: string;
  employee_ids: string[];
  effective_from: string;
  effective_to?: string;
}

interface ShiftFormValues {
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  clockin_window_before_minutes: number;
  clockout_window_after_minutes: number;
  is_flexible: boolean;
  color: string;
}

const EMPTY_SHIFT_FORM: ShiftFormValues = {
  name: "",
  code: "",
  start_time: "08:00",
  end_time: "17:00",
  grace_minutes: 15,
  clockin_window_before_minutes: 60,
  clockout_window_after_minutes: 60,
  is_flexible: false,
  color: "#4f46e5",
};

export default function ShiftManagementPage() {
  const t = useTranslations('shifts');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Shift | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<Shift | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Shift | null>(null);

  // Form state
  const emptyForm = EMPTY_SHIFT_FORM;
  const [form, setForm] = useState(emptyForm);
  const [assignForm, setAssignForm] = useState({
    employee_ids: [] as string[],
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });

  const isManager =
    user?.role === "manager" ||
    user?.role === "tenant_admin" ||
    user?.role === "super_admin";

  useEffect(() => {
    if (isManager) {
      loadShifts();
      loadEmployees();
    }
  }, []);

  async function loadShifts() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<Shift[]>("/api/v1/shifts");
      setShifts(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const data = await api.get<any>("/api/v1/employees");
      const empList = data?.data || data || [];
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch {
      // Employees endpoint might not exist yet or have different path
    }
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/shifts", form);
      setSuccess(`Shift "${form.name}" created successfully`);
      setShowCreateModal(false);
      resetForm();
      loadShifts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create shift");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!showEditModal) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.put(`/api/v1/shifts/${showEditModal.id}`, form);
      setSuccess(`Shift "${form.name}" updated`);
      setShowEditModal(null);
      loadShifts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update shift");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.del(`/api/v1/shifts/${showDeleteConfirm.id}`);
      setSuccess(`Shift "${showDeleteConfirm.name}" deleted`);
      setShowDeleteConfirm(null);
      loadShifts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete shift");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(shift: Shift) {
    setForm({
      name: shift.name,
      code: shift.code,
      start_time: shift.start_time.substring(0, 5),
      end_time: shift.end_time.substring(0, 5),
      grace_minutes: shift.grace_minutes,
      clockin_window_before_minutes: shift.clockin_window_before_minutes,
      clockout_window_after_minutes: shift.clockout_window_after_minutes,
      is_flexible: shift.is_flexible,
      color: shift.color || "#4f46e5",
    });
    setShowEditModal(shift);
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
    if (!showAssignModal || assignForm.employee_ids.length === 0) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/shifts/bulk-assign", {
        shift_id: showAssignModal.id,
        employee_ids: assignForm.employee_ids,
        effective_from: assignForm.effective_from,
        effective_to: assignForm.effective_to || undefined,
      });
      setSuccess(
        `Shift assigned to ${assignForm.employee_ids.length} employee(s)`
      );
      setShowAssignModal(null);
      setAssignForm({
        employee_ids: [],
        effective_from: new Date().toISOString().split("T")[0],
        effective_to: "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign shift");
    } finally {
      setSubmitting(false);
    }
  }

  // Reset page on search/filter change
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { setPage(1); }, [typeFilter]);

  // Determine shift type from shift data
  function getShiftType(shift: Shift): string {
    if (shift.is_flexible) return 'flexible';
    const hour = parseInt(shift.start_time.substring(0, 2), 10);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'night';
  }

  // Filter & Paginate
  const filtered = shifts.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  }).filter((s) => {
    if (!typeFilter) return true;
    return getShiftType(s) === typeFilter;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('management')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage shift templates for employees
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="active:scale-95 transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Create Shift
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{shifts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('flexible')}</p>
                <p className="text-2xl font-bold">
                  {shifts.filter((s) => s.is_flexible).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover transition-all duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
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

      {/* Shift list */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle>Shift Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search & Filter */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search shifts by name or code..."
              />
            </div>
            <FilterDropdown label="Type" options={[
              {value:'morning',label:'Morning'},{value:'afternoon',label:'Afternoon'},{value:'night',label:'Night'},{value:'flexible',label:'Flexible'}
            ]} value={typeFilter} onChange={setTypeFilter} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No shifts defined"
              description="Create your first shift template to get started"
            />
          ) : (
            <div className="space-y-3 stagger-children">
              {paged.map((shift) => (
                <div
                  key={shift.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card card-hover transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: shift.color || "#4f46e5" }}
                      />
                      <Link
                        href={`/manager/shifts/${shift.id}`}
                        className="font-medium hover:text-primary transition-all duration-200"
                      >
                        {shift.name}
                      </Link>
                      <Badge variant="info" className="text-xs">
                        {shift.code}
                      </Badge>
                      {shift.is_flexible && (
                        <Badge variant="warning" className="text-xs">
                          Flexible
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                      <span>
                        {shift.start_time.substring(0, 5)} →{" "}
                        {shift.end_time.substring(0, 5)}
                      </span>
                      <span>Grace: {shift.grace_minutes}min</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(shift)}
                      className="active:scale-95 transition-all duration-200"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssignModal(shift)}
                      className="active:scale-95 transition-all duration-200"
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(shift)}
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
        <Modal
          title="Create Shift"
          onClose={() => { setShowCreateModal(false); resetForm(); }}
          onSubmit={handleCreate}
          submitting={submitting}
        >
          <ShiftForm form={form} setForm={setForm} />
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && (
        <Modal
          title={`Edit: ${showEditModal.name}`}
          onClose={() => { setShowEditModal(null); resetForm(); }}
          onSubmit={handleEdit}
          submitting={submitting}
        >
          <ShiftForm form={form} setForm={setForm} />
        </Modal>
      )}

      {/* ── Assign Modal ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto card-hover transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Assign: {showAssignModal.name}
              </CardTitle>
              <button onClick={() => setShowAssignModal(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkAssign} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Effective From
                    </label>
                    <Input
                      type="date"
                      value={assignForm.effective_from}
                      onChange={(e) =>
                        setAssignForm((f) => ({
                          ...f,
                          effective_from: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Effective To (optional)
                    </label>
                    <Input
                      type="date"
                      value={assignForm.effective_to}
                      onChange={(e) =>
                        setAssignForm((f) => ({
                          ...f,
                          effective_to: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Select Employees ({assignForm.employee_ids.length} selected)
                  </label>
                  {employees.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No employees found
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                      {employees.map((emp) => (
                        <label
                          key={emp.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={assignForm.employee_ids.includes(emp.id)}
                            onChange={() => toggleEmployee(emp.id)}
                            className="rounded border-border"
                          />
                          <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {emp.employee_code}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAssignModal(null)}
                    className="active:scale-95 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting || assignForm.employee_ids.length === 0
                    }
                    className="active:scale-95 transition-all duration-200"
                  >
                    {submitting
                      ? "Assigning..."
                      : `Assign to ${assignForm.employee_ids.length} employee(s)`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        variant="danger"
        open={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          handleDelete().then(() => setShowDeleteConfirm(null));
        }}
        title="Delete Shift"
        message={`Are you sure you want to delete ${showDeleteConfirm?.name} (${showDeleteConfirm?.code})? This action cannot be undone.`}
      />
    </div>
  );
}

// ── Reusable Modal ──
function Modal({
  title,
  onClose,
  onSubmit,
  submitting,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto card-hover transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {children}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="active:scale-95 transition-all duration-200">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="active:scale-95 transition-all duration-200">
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shift Form Fields ──
function ShiftForm({
  form,
  setForm,
}: {
  form: ShiftFormValues;
  setForm: React.Dispatch<React.SetStateAction<ShiftFormValues>>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <Input
            placeholder="e.g. Shift Pagi"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Code</label>
          <Input
            placeholder="e.g. PAGI"
            value={form.code}
            onChange={(e) =>
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Start Time</label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) =>
              setForm((f) => ({ ...f, start_time: e.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">End Time</label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) =>
              setForm((f) => ({ ...f, end_time: e.target.value }))
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Grace Minutes
          </label>
          <Input
            type="number"
            min={0}
            value={form.grace_minutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                grace_minutes: parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>
        <div className="flex items-center gap-3 pt-7">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_flexible}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_flexible: e.target.checked }))
              }
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Flexible Shift</span>
          </label>
        </div>
      </div>

      {!form.is_flexible && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Clock-in Window (min before)
            </label>
            <Input
              type="number"
              min={0}
              value={form.clockin_window_before_minutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  clockin_window_before_minutes: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Clock-out Window (min after)
            </label>
            <Input
              type="number"
              min={0}
              value={form.clockout_window_after_minutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  clockout_window_after_minutes: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Color</label>
        <div className="flex items-center gap-3">
          <Input
            type="color"
            value={form.color}
            onChange={(e) =>
              setForm((f) => ({ ...f, color: e.target.value }))
            }
            className="w-16 h-10 p-1"
          />
          <span className="text-sm text-muted-foreground">
            {form.color}
          </span>
        </div>
      </div>
    </>
  );
}
