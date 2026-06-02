"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Users,
  Clock,
  CalendarDays,
  AlertCircle,
  AlertTriangle,
  Link2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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

interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  employee_name?: string;
  employee_code?: string;
}

interface Employee {
  id: string;
  name: string;
  code: string;
}

export default function ShiftDetailPage() {
  const t = useTranslations('shifts');
  const tc = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<EmployeeShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ⚠️ RBAC guard
  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employee_ids: [] as string[],
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });

  // Confirm dialog for remove
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; employeeName: string } | null>(null);

  useEffect(() => {
    if (params.id && isManager) loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [shiftData, assignmentsData] = await Promise.all([
        api.get<Shift>(`/api/v1/shifts/${params.id}`),
        api.get<EmployeeShift[]>(`/api/v1/shifts/${params.id}/employees`),
      ]);
      setShift(shiftData);
      setAssignments(assignmentsData || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load shift details");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const data = await api.get<Employee[]>("/api/v1/employees");
      setEmployees(data || []);
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
    if (!shift || assignForm.employee_ids.length === 0) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/shifts/bulk-assign", {
        shift_id: shift.id,
        employee_ids: assignForm.employee_ids,
        effective_from: assignForm.effective_from,
        effective_to: assignForm.effective_to || undefined,
      });
      setSuccess(`Assigned to ${assignForm.employee_ids.length} employee(s)`);
      setShowAssignModal(false);
      setAssignForm({ employee_ids: [], effective_from: new Date().toISOString().split("T")[0], effective_to: "" });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string, employeeName: string) {
    setError("");
    setSuccess("");
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;
      await api.del(`/api/v1/employees/${assignment.employee_id}/shifts/${assignmentId}`);
      setSuccess("Assignment removed");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove assignment");
    }
  }

  function openAssignModal() {
    loadEmployees();
    setAssignForm({
      employee_ids: [],
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: "",
    });
    setShowAssignModal(true);
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">Access Denied</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  if (!shift) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Shift not found</p>
        <Button variant="outline" className="mt-4 active:scale-95 transition-all duration-200" onClick={() => router.push("/manager/shifts")}>
          Back to Shifts
        </Button>
      </div>
    );
  }

  const assignedIds = assignments.map((a) => a.employee_id);

  if (authLoading) return null;
  if (!isManager) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link
        href="/manager/shifts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')}
      </Link>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Shift header */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: shift.color || "#4f46e5" }}
              />
              <CardTitle>{shift.name}</CardTitle>
              <Badge variant="info">{shift.code}</Badge>
              {shift.is_flexible && <Badge variant="warning">{t('flexible')}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Created: {new Date(shift.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openAssignModal} className="active:scale-95 transition-all duration-200">
              <Link2 className="h-4 w-4 mr-1" />
              {t('assign')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="text-lg font-bold">{shift.start_time.substring(0, 5)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">End</p>
              <p className="text-lg font-bold">{shift.end_time.substring(0, 5)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">Grace</p>
              <p className="text-lg font-bold">{shift.grace_minutes} min</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-lg font-bold">{assignments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Employees */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('assignments')} ({assignments.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openAssignModal} className="active:scale-95 transition-all duration-200">
            <Link2 className="h-4 w-4 mr-1" />
            {t('assign')}
          </Button>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={t('noAssignments')}
              description="Assign employees to this shift to get started"
            />
          ) : (
            <div className="space-y-3 stagger-children">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border card-hover transition-all duration-200"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {a.employee_name || "Employee"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.effective_from} → {a.effective_to || "Indefinite"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-danger border-red-200 hover:bg-red-50 active:scale-95 transition-all duration-200"
                    onClick={() => setRemoveConfirm({ id: a.id, employeeName: a.employee_name || "this employee" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto card-hover transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Assign: {shift.name}</CardTitle>
              <button onClick={() => setShowAssignModal(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkAssign} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Effective From</label>
                    <Input type="date" value={assignForm.effective_from} onChange={(e) => setAssignForm((f) => ({ ...f, effective_from: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Effective To (opt)</label>
                    <Input type="date" value={assignForm.effective_to} onChange={(e) => setAssignForm((f) => ({ ...f, effective_to: e.target.value }))} />
                  </div>
                </div>
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
                      {employees
                        .filter((emp) => !assignedIds.includes(emp.id))
                        .map((emp) => (
                          <label key={emp.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary cursor-pointer">
                            <input type="checkbox" checked={assignForm.employee_ids.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} className="rounded border-border" />
                            <span className="text-sm font-medium">{emp.name}</span>
                            <span className="text-xs text-muted-foreground">{emp.code}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)} className="active:scale-95 transition-all duration-200">Cancel</Button>
                  <Button type="submit" disabled={submitting || assignForm.employee_ids.length === 0} className="active:scale-95 transition-all duration-200">
                    {submitting ? "Assigning..." : `Assign to ${assignForm.employee_ids.length}`}
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
            handleRemoveAssignment(removeConfirm.id, removeConfirm.employeeName).then(() => setRemoveConfirm(null));
          }
        }}
        title="Remove Shift Assignment"
        message={`Remove shift assignment for ${removeConfirm?.employeeName}?`}
      />
    </div>
  );
}
