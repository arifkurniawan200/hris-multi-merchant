"use client";

import { useState, useEffect } from "react";
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
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<EmployeeShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employee_ids: [] as string[],
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

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
      setAssignments(assignmentsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load shift details");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const data = await api.get<Employee[]>("/api/v1/employees");
      setEmployees(data);
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
    if (!confirm(`Remove shift assignment for ${employeeName}?`)) return;
    setError("");
    setSuccess("");
    try {
      // We need the employee_id; iterate to find it
      // The endpoint is DELETE /api/v1/employees/{id}/shifts/{sid}
      // But we don't have the format here — use the assignment ID lookup
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
          <p className="font-medium text-[var(--foreground)]">Access Denied</p>
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

  if (!shift) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">Shift not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/manager/shifts")}>
          Back to Shifts
        </Button>
      </div>
    );
  }

  const assignedIds = assignments.map((a) => a.employee_id);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/manager/shifts"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shifts
      </Link>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Shift header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: shift.color || "#4f46e5" }}
              />
              <CardTitle>{shift.name}</CardTitle>
              <Badge variant="info">{shift.code}</Badge>
              {shift.is_flexible && <Badge variant="warning">Flexible</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Created: {new Date(shift.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openAssignModal}>
              <Link2 className="h-4 w-4 mr-1" />
              Assign Employees
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Start</p>
              <p className="text-lg font-bold">{shift.start_time.substring(0, 5)}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">End</p>
              <p className="text-lg font-bold">{shift.end_time.substring(0, 5)}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Grace</p>
              <p className="text-lg font-bold">{shift.grace_minutes} min</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Employees</p>
              <p className="text-lg font-bold">{assignments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Employees ({assignments.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openAssignModal}>
            <Link2 className="h-4 w-4 mr-1" />
            Assign
          </Button>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No employees assigned</p>
              <p className="text-sm mt-1">Assign employees to this shift to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {a.employee_name || "Employee"}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {a.effective_from} → {a.effective_to || "Indefinite"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[var(--danger)] border-red-200 hover:bg-red-50"
                    onClick={() => handleRemoveAssignment(a.id, a.employee_name || "this employee")}
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
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Assign: {shift.name}</CardTitle>
              <button onClick={() => setShowAssignModal(false)}>
                <X className="h-5 w-5 text-[var(--muted-foreground)]" />
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
                    <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                      No employees found
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--border)] rounded-lg p-2">
                      {employees
                        .filter((emp) => !assignedIds.includes(emp.id))
                        .map((emp) => (
                          <label key={emp.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--secondary)] cursor-pointer">
                            <input type="checkbox" checked={assignForm.employee_ids.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} className="rounded border-[var(--border)]" />
                            <span className="text-sm font-medium">{emp.name}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">{emp.code}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || assignForm.employee_ids.length === 0}>
                    {submitting ? "Assigning..." : `Assign to ${assignForm.employee_ids.length}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
