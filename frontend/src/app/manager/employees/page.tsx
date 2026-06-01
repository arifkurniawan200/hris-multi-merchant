"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Pagination } from '@/components/ui/pagination';
import {
  Users,
  UserPlus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
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

// ── Status helpers ──
const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  active: { label: "Active", variant: "success" },
  probation: { label: "Probation", variant: "warning" },
  resigned: { label: "Resigned", variant: "danger" },
  terminated: { label: "Terminated", variant: "danger" },
  suspended: { label: "Suspended", variant: "warning" },
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "daily", label: "Daily" },
  { value: "freelancer", label: "Freelancer" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "probation", label: "Probation" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
  { value: "suspended", label: "Suspended" },
];

// ── Page ──
export default function EmployeeManagementPage() {
  const { user } = useAuth();
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, deptFilter]);

  // Dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Employee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Employee | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Form
  const [form, setForm] = useState<EmployeeFormValues>(EMPTY_FORM);

  const isManager =
    user?.role === "manager" ||
    user?.role === "tenant_admin" ||
    user?.role === "super_admin";

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
      const data = await api.get<{ data: Employee[]; total: number }>(
        "/api/v1/employees"
      );
      setEmployees(data.data || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load employees"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const data = await api.get<Department[]>("/api/v1/departments");
      setDepartments(data || []);
    } catch {
      /* optional */
    }
  }

  async function loadPositions() {
    try {
      const data = await api.get<Position[]>("/api/v1/positions");
      setPositions(data || []);
    } catch {
      /* optional */
    }
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
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/employees", form);
      setSuccess(
        `Employee "${form.first_name} ${form.last_name}" created`
      );
      setShowCreateModal(false);
      resetForm();
      loadEmployees();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create employee"
      );
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
      await api.put(`/api/v1/employees/${showEditModal.id}`, form);
      setSuccess(
        `Employee "${form.first_name} ${form.last_name}" updated`
      );
      setShowEditModal(null);
      loadEmployees();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update employee"
      );
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
      await api.del(`/api/v1/employees/${showDeleteConfirm.id}`);
      setSuccess(
        `Employee "${showDeleteConfirm.first_name} ${showDeleteConfirm.last_name}" deleted`
      );
      setShowDeleteConfirm(null);
      loadEmployees();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to delete employee"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange() {
    if (!showStatusModal || !newStatus) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.put(
        `/api/v1/employees/${showStatusModal.id}/status`,
        { status: newStatus }
      );
      setSuccess(
        `Employee "${showStatusModal.first_name} ${showStatusModal.last_name}" status changed to ${newStatus}`
      );
      setShowStatusModal(null);
      setNewStatus("");
      loadEmployees();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to change status"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadge(status: string) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) {
      return (
        <Badge variant="default" className="text-xs">
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant={cfg.variant} className="text-xs">
        {cfg.label}
      </Badge>
    );
  }

  function formField<K extends keyof EmployeeFormValues>(
    k: K,
    v: EmployeeFormValues[K]
  ) {
    setForm({ ...form, [k]: v });
  }

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "probation", label: "Probation" },
    { value: "resigned", label: "Resigned" },
    { value: "terminated", label: "Terminated" },
    { value: "suspended", label: "Suspended" },
  ];

  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.first_name.toLowerCase().includes(search.toLowerCase()) ||
      e.last_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || e.employment_status === statusFilter;
    const matchDept = !deptFilter || e.department_id === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const paged = filtered.slice((page-1)*perPage, page*perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const posOptions = positions.map((p) => ({ value: p.id, label: p.name }));

  // ── Access denied ──
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

  // ── Loading ──
  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  // ── Render ──
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('title')}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Employees
                </p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {
                    employees.filter(
                      (e) =>
                        e.employment_status === "active" ||
                        e.employment_status === "probation"
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Search & Filters */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search employees..." className="max-w-sm" />
      <div className="flex flex-wrap gap-3">
        <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <FilterDropdown label="Department" options={deptOptions} value={deptFilter} onChange={setDeptFilter} />
      </div>

      {/* Employee list */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="No employees found" description={search ? "Try a different search term" : "Add your first employee to get started"} />
          ) : (
            <div className="space-y-3">
              {paged.map((emp) => (
                <div
                  key={emp.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {emp.first_name} {emp.last_name}
                      </span>
                      <Badge variant="info" className="text-xs">
                        {emp.employee_code}
                      </Badge>
                      {statusBadge(emp.employment_status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                      <span>{emp.email}</span>
                      {emp.department_name && (
                        <span>• {emp.department_name}</span>
                      )}
                      {emp.position_name && (
                        <span>• {emp.position_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewStatus(emp.employment_status);
                        setShowStatusModal(emp);
                      }}
                    >
                      Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(emp)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(emp)}
                      className="text-danger border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* ── Create/Edit Dialog ── */}
      <Dialog
        open={showCreateModal || !!showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(null);
          resetForm();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {showCreateModal
              ? "Add Employee"
              : `Edit: ${showEditModal?.first_name} ${showEditModal?.last_name}`}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={showCreateModal ? handleCreate : handleEdit}
        >
          <DialogContent className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee Code */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Employee Code *
                </label>
                <Input
                  value={form.employee_code}
                  onChange={(e) => formField("employee_code", e.target.value)}
                  required
                  placeholder="e.g. EMP001"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  First Name *
                </label>
                <Input
                  value={form.first_name}
                  onChange={(e) => formField("first_name", e.target.value)}
                  required
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Last Name
                </label>
                <Input
                  value={form.last_name}
                  onChange={(e) => formField("last_name", e.target.value)}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => formField("email", e.target.value)}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => formField("phone", e.target.value)}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Gender
                </label>
                <Select
                  value={form.gender}
                  onChange={(e) => formField("gender", e.target.value)}
                  options={GENDER_OPTIONS}
                  placeholder="Select..."
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Birth Date
                </label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => formField("birth_date", e.target.value)}
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Address
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => formField("address", e.target.value)}
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department
                </label>
                <Select
                  value={form.department_id}
                  onChange={(e) => formField("department_id", e.target.value)}
                  options={deptOptions}
                  placeholder="Select..."
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Position
                </label>
                <Select
                  value={form.position_id}
                  onChange={(e) => formField("position_id", e.target.value)}
                  options={posOptions}
                  placeholder="Select..."
                />
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Employment Type *
                </label>
                <Select
                  value={form.employment_type}
                  onChange={(e) =>
                    formField("employment_type", e.target.value)
                  }
                  options={EMPLOYMENT_TYPE_OPTIONS}
                />
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Join Date *
                </label>
                <Input
                  type="date"
                  value={form.join_date}
                  onChange={(e) => formField("join_date", e.target.value)}
                  required
                />
              </div>

              {/* Contract Start */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Contract Start
                </label>
                <Input
                  type="date"
                  value={form.contract_start}
                  onChange={(e) => formField("contract_start", e.target.value)}
                />
              </div>

              {/* Contract End */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Contract End
                </label>
                <Input
                  type="date"
                  value={form.contract_end}
                  onChange={(e) => formField("contract_end", e.target.value)}
                />
              </div>

              {/* National ID */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  National ID (KTP)
                </label>
                <Input
                  value={form.national_id}
                  onChange={(e) => formField("national_id", e.target.value)}
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tax ID (NPWP)
                </label>
                <Input
                  value={form.tax_id}
                  onChange={(e) => formField("tax_id", e.target.value)}
                />
              </div>

              {/* BPJS Kesehatan */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  BPJS Kesehatan
                </label>
                <Input
                  value={form.bpjs_health}
                  onChange={(e) => formField("bpjs_health", e.target.value)}
                />
              </div>

              {/* BPJS Ketenagakerjaan */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  BPJS Ketenagakerjaan
                </label>
                <Input
                  value={form.bpjs_labor}
                  onChange={(e) => formField("bpjs_labor", e.target.value)}
                />
              </div>

              {/* Base Salary */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Base Salary
                </label>
                <Input
                  type="number"
                  value={form.base_salary || ""}
                  onChange={(e) =>
                    formField(
                      "base_salary",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bank Name
                </label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => formField("bank_name", e.target.value)}
                />
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bank Account
                </label>
                <Input
                  value={form.bank_account}
                  onChange={(e) => formField("bank_account", e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => formField("notes", e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[60px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${showDeleteConfirm?.first_name} ${showDeleteConfirm?.last_name} (${showDeleteConfirm?.employee_code})? This action can be undone by an admin.`}
        variant="danger"
        confirmLabel={submitting ? "Deleting..." : "Delete"}
        loading={submitting}
      />

      {/* ── Status Change Dialog ── */}
      <Dialog
        open={!!showStatusModal}
        onClose={() => {
          setShowStatusModal(null);
          setNewStatus("");
        }}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted-foreground mb-4">
            Change status for{" "}
            <strong>
              {showStatusModal?.first_name} {showStatusModal?.last_name}
            </strong>
          </p>
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={STATUS_OPTIONS}
            placeholder="Select status..."
          />
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowStatusModal(null);
              setNewStatus("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStatusChange}
            disabled={submitting || !newStatus}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
