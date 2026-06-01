"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  UserPlus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";

// ── Types ──────────────────────────────────
interface Employee {
  id: string;
  tenant_id: string;
  user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string;
  birth_place: string;
  email: string;
  phone: string;
  address: string;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  employment_status: string;
  employment_type: string;
  join_date: string;
  contract_start: string | null;
  contract_end: string | null;
  national_id: string;
  tax_id: string;
  bpjs_health: string;
  bpjs_labor: string;
  base_salary: number;
  bank_name: string;
  bank_account: string;
  notes: string;
  department_name: string;
  position_name: string;
  manager_name: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Position {
  id: string;
  name: string;
  code: string;
}

interface EmployeeFormValues {
  employee_code: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string;
  birth_place: string;
  email: string;
  phone: string;
  address: string;
  department_id: string;
  position_id: string;
  manager_id: string;
  employment_status: string;
  employment_type: string;
  join_date: string;
  contract_start: string;
  contract_end: string;
  national_id: string;
  tax_id: string;
  bpjs_health: string;
  bpjs_labor: string;
  base_salary: number;
  bank_name: string;
  bank_account: string;
  notes: string;
}

const EMPTY_FORM: EmployeeFormValues = {
  employee_code: "",
  first_name: "",
  last_name: "",
  gender: "",
  birth_date: "",
  birth_place: "",
  email: "",
  phone: "",
  address: "",
  department_id: "",
  position_id: "",
  manager_id: "",
  employment_status: "active",
  employment_type: "permanent",
  join_date: new Date().toISOString().split("T")[0],
  contract_start: "",
  contract_end: "",
  national_id: "",
  tax_id: "",
  bpjs_health: "",
  bpjs_labor: "",
  base_salary: 0,
  bank_name: "",
  bank_account: "",
  notes: "",
};

export default function EmployeeManagementPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Employee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Employee | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Form
  const [form, setForm] = useState<EmployeeFormValues>(EMPTY_FORM);

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isManager) {
      loadEmployees();
      loadDepartments();
      loadPositions();
    }
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ data: Employee[]; total: number }>("/api/v1/employees");
      setEmployees(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const data = await api.get<Department[]>("/api/v1/departments");
      setDepartments(data || []);
    } catch { /* optional */ }
  }

  async function loadPositions() {
    try {
      const data = await api.get<Position[]>("/api/v1/positions");
      setPositions(data || []);
    } catch { /* optional */ }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function openEdit(emp: Employee) {
    setForm({
      employee_code: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      gender: emp.gender,
      birth_date: emp.birth_date || "",
      birth_place: emp.birth_place || "",
      email: emp.email,
      phone: emp.phone || "",
      address: emp.address || "",
      department_id: emp.department_id || "",
      position_id: emp.position_id || "",
      manager_id: emp.manager_id || "",
      employment_status: emp.employment_status,
      employment_type: emp.employment_type,
      join_date: emp.join_date || "",
      contract_start: emp.contract_start || "",
      contract_end: emp.contract_end || "",
      national_id: emp.national_id || "",
      tax_id: emp.tax_id || "",
      bpjs_health: emp.bpjs_health || "",
      bpjs_labor: emp.bpjs_labor || "",
      base_salary: emp.base_salary,
      bank_name: emp.bank_name || "",
      bank_account: emp.bank_account || "",
      notes: emp.notes || "",
    });
    setShowEditModal(emp);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      const created = await api.post("/api/v1/employees", form);
      setSuccess(`Employee "${form.first_name} ${form.last_name}" created`);
      setShowCreateModal(false);
      resetForm();
      loadEmployees();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
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
      await api.put(`/api/v1/employees/${showEditModal.id}`, form);
      setSuccess(`Employee "${form.first_name} ${form.last_name}" updated`);
      setShowEditModal(null);
      loadEmployees();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm) return;
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await api.del(`/api/v1/employees/${showDeleteConfirm.id}`);
      setSuccess(`Employee "${showDeleteConfirm.first_name} ${showDeleteConfirm.last_name}" deleted`);
      setShowDeleteConfirm(null);
      loadEmployees();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete employee");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange() {
    if (!showStatusModal || !newStatus) return;
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await api.put(`/api/v1/employees/${showStatusModal.id}/status`, { status: newStatus });
      setSuccess(`Employee "${showStatusModal.first_name} ${showStatusModal.last_name}" status changed to ${newStatus}`);
      setShowStatusModal(null);
      setNewStatus("");
      loadEmployees();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change status");
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadge(status: string) {
    const variants: Record<string, { label: string; cls: string }> = {
      active: { label: "Active", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
      probation: { label: "Probation", cls: "bg-amber-100 text-amber-800 border-amber-200" },
      resigned: { label: "Resigned", cls: "bg-red-100 text-red-800 border-red-200" },
      terminated: { label: "Terminated", cls: "bg-red-200 text-red-900 border-red-300" },
      suspended: { label: "Suspended", cls: "bg-orange-100 text-orange-800 border-orange-200" },
    };
    const v = variants[status] || { label: status, cls: "bg-gray-100 text-gray-800 border-gray-200" };
    return (
      <span className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full border ${v.cls}`}>
        {v.label}
      </span>
    );
  }

  const filtered = search
    ? employees.filter(
        (e) =>
          e.first_name.toLowerCase().includes(search.toLowerCase()) ||
          e.last_name.toLowerCase().includes(search.toLowerCase()) ||
          e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Employee Management</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Manage employees and their records</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent)]">
                <Users className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Active</p>
                <p className="text-2xl font-bold">{employees.filter((e) => e.employment_status === "active" || e.employment_status === "probation").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Departments</p>
                <p className="text-2xl font-bold">{departments.length}</p>
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Employee list */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No employees found</p>
              <p className="text-sm mt-1">
                {search ? "Try a different search term" : "Add your first employee to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((emp) => (
                <div
                  key={emp.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--foreground)]">
                        {emp.first_name} {emp.last_name}
                      </span>
                      <Badge variant="info" className="text-xs">{emp.employee_code}</Badge>
                      {statusBadge(emp.employment_status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-[var(--muted-foreground)]">
                      <span>{emp.email}</span>
                      {emp.department_name && <span>• {emp.department_name}</span>}
                      {emp.position_name && <span>• {emp.position_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => {
                        setNewStatus(emp.employment_status);
                        setShowStatusModal(emp);
                      }}
                    >
                      Status
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(emp)}>
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setShowDeleteConfirm(emp)}
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
        <Modal title="Add Employee" onClose={() => { setShowCreateModal(false); resetForm(); }}
          onSubmit={handleCreate} submitting={submitting}>
          <EmployeeForm form={form} setForm={setForm} departments={departments} positions={positions} isCreate />
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && (
        <Modal title={`Edit: ${showEditModal.first_name} ${showEditModal.last_name}`}
          onClose={() => { setShowEditModal(null); resetForm(); }}
          onSubmit={handleEdit} submitting={submitting}>
          <EmployeeForm form={form} setForm={setForm} departments={departments} positions={positions} />
        </Modal>
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
                Are you sure you want to delete <strong>{showDeleteConfirm.first_name} {showDeleteConfirm.last_name}</strong>
                ({showDeleteConfirm.employee_code})? This action can be undone by an admin.
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

      {/* ── Status Change Modal ── */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Change Status</CardTitle>
              <button onClick={() => { setShowStatusModal(null); setNewStatus(""); }}><X className="h-5 w-5 text-[var(--muted-foreground)]" /></button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Change status for <strong>{showStatusModal.first_name} {showStatusModal.last_name}</strong>
              </p>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm mb-4"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setShowStatusModal(null); setNewStatus(""); }}>Cancel</Button>
                <Button onClick={handleStatusChange} disabled={submitting || !newStatus}>
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Shared Modal Wrapper ──
function Modal({
  title, onClose, onSubmit, submitting, children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <button onClick={onClose}><X className="h-5 w-5 text-[var(--muted-foreground)]" /></button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {children}
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

// ── Employee Form Fields ──
function EmployeeForm({
  form, setForm, departments, positions, isCreate,
}: {
  form: EmployeeFormValues;
  setForm: (f: EmployeeFormValues) => void;
  departments: Department[];
  positions: Position[];
  isCreate?: boolean;
}) {
  function set<K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) {
    setForm({ ...form, [k]: v });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Employee Code *</label>
        <Input value={form.employee_code} onChange={(e) => set("employee_code", e.target.value)} required placeholder="e.g. EMP001" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">First Name *</label>
        <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Last Name</label>
        <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Gender</label>
        <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Birth Date</label>
        <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Address</label>
        <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Department</label>
        <select value={form.department_id} onChange={(e) => set("department_id", e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
          <option value="">Select...</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Position</label>
        <select value={form.position_id} onChange={(e) => set("position_id", e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
          <option value="">Select...</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Employment Type *</label>
        <select value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
          <option value="permanent">Permanent</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
          <option value="daily">Daily</option>
          <option value="freelancer">Freelancer</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Join Date *</label>
        <Input type="date" value={form.join_date} onChange={(e) => set("join_date", e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contract Start</label>
        <Input type="date" value={form.contract_start} onChange={(e) => set("contract_start", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contract End</label>
        <Input type="date" value={form.contract_end} onChange={(e) => set("contract_end", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">National ID (KTP)</label>
        <Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tax ID (NPWP)</label>
        <Input value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">BPJS Kesehatan</label>
        <Input value={form.bpjs_health} onChange={(e) => set("bpjs_health", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">BPJS Ketenagakerjaan</label>
        <Input value={form.bpjs_labor} onChange={(e) => set("bpjs_labor", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Base Salary</label>
        <Input type="number" value={form.base_salary || ""} onChange={(e) => set("base_salary", parseInt(e.target.value) || 0)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Bank Name</label>
        <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Bank Account</label>
        <Input value={form.bank_account} onChange={(e) => set("bank_account", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm min-h-[60px]" />
      </div>
    </div>
  );
}
