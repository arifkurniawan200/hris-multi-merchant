"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CheckCircle,
  Upload,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Building2,
  Badge as BadgeIcon,
  Hash,
  DollarSign,
  Banknote,
  FileSignature,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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

interface Document {
  id: string;
  employee_id: string;
  tenant_id: string;
  document_type: string;
  document_name: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  notes: string;
  uploaded_by: string;
  is_verified: boolean;
  created_at: string;
}

const DOCUMENT_TYPES = [
  "KTP",
  "NPWP",
  "BPJS Kesehatan",
  "BPJS Ketenagakerjaan",
  "Ijazah",
  "Sertifikat",
  "Kontrak",
  "Lainnya",
] as const;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function getDocumentIcon(type: string) {
  const iconMap: Record<string, React.ReactNode> = {
    KTP: <FileImage className="h-8 w-8 text-blue-500" />,
    NPWP: <FileSpreadsheet className="h-8 w-8 text-purple-500" />,
    "BPJS Kesehatan": <FileText className="h-8 w-8 text-emerald-500" />,
    "BPJS Ketenagakerjaan": <FileText className="h-8 w-8 text-amber-500" />,
    Ijazah: <FileSignature className="h-8 w-8 text-indigo-500" />,
    Sertifikat: <File className="h-8 w-8 text-cyan-500" />,
    Kontrak: <FileText className="h-8 w-8 text-rose-500" />,
  };
  return iconMap[type] || <File className="h-8 w-8 text-gray-500" />;
}

// ── Page Component ─────────────────────────
export default function EmployeeDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('employees');
  const params = useParams();
  const id = params.id as string;

  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "documents">("profile");

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>(DOCUMENT_TYPES[0]);
  const [uploadName, setUploadName] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Verify
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const emp = await api.get<Employee>(`/api/v1/employees/${id}`);
      setEmployee(emp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load employee");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.get<Document[]>(`/api/v1/employees/documents?employee_id=${id}`);
      setDocuments(docs || []);
    } catch {
      // Silently fail - documents endpoint may not exist yet
    }
  }, [id]);

  useEffect(() => {
    loadData();
    loadDocuments();
  }, [loadData, loadDocuments]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      // Map display types to backend slug values
      const typeMap: Record<string, string> = {
        "KTP": "ktp",
        "NPWP": "npwp",
        "BPJS Kesehatan": "bpjs_health",
        "BPJS Ketenagakerjaan": "bpjs_labor",
        "Ijazah": "ijazah",
        "Sertifikat": "certificate",
        "Kontrak": "contract",
        "Lainnya": "other",
      };
      formData.append("document_type", typeMap[uploadType] || uploadType.toLowerCase());
      formData.append("employee_id", id);
      if (uploadName) formData.append("document_name", uploadName);
      if (uploadNotes) formData.append("notes", uploadNotes);

      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/employees/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Upload failed (${res.status})`);
      }

      await loadDocuments();
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadType(DOCUMENT_TYPES[0]);
      setUploadName("");
      setUploadNotes("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await api.del(`/api/v1/employees/documents/${deleteTarget.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }

  async function handleVerify(doc: Document) {
    setVerifyingId(doc.id);
    setError("");
    try {
      const updated = await api.put<Document>(
        `/api/v1/employees/documents/${doc.id}/verify`,
        { is_verified: !doc.is_verified }
      );
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_verified: updated.is_verified } : d))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update document");
    } finally {
      setVerifyingId(null);
    }
  }

  // ── Loading State ──
  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  // ── Error State ──
  if (error && !employee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link
          href="/manager/employees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-danger" />
            <p className="font-medium text-foreground">Failed to load employee</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4 active:scale-95 transition-all duration-200" onClick={loadData}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  if (authLoading) return null;
  if (!isManager) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button + header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/manager/employees"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {employee.first_name} {employee.last_name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="info" className="text-xs">
              {employee.employee_code}
            </Badge>
            {statusBadge(employee.employment_status)}
          </div>
        </div>
        <Button variant="outline" onClick={() => setActiveTab("documents")} className="active:scale-95 transition-all duration-200">
          <FileText className="h-4 w-4 mr-2" />
          {t('detail')}
        </Button>
      </div>

      {/* Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4 inline mr-1.5" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "documents"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" />
          Documents
          {documents.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary/10 text-primary">
              {documents.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" ? (
        <ProfileTab employee={employee} />
      ) : (
        <DocumentsTab
          documents={documents}
          onUpload={() => {
            setUploadFile(null);
            setUploadType(DOCUMENT_TYPES[0]);
            setUploadName("");
            setUploadNotes("");
            setShowUploadModal(true);
          }}
          onDownload={(doc) => {
            window.open(`/api/v1/employees/documents/${doc.id}/download`);
          }}
          onDelete={(doc) => setDeleteTarget(doc)}
          onVerify={(doc) => handleVerify(doc)}
          verifyingId={verifyingId}
        />
      )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg card-hover transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upload Document</CardTitle>
              <button onClick={() => setShowUploadModal(false)}>
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* File picker */}
                <div>
                  <label className="block text-sm font-medium mb-1">File *</label>
                  <Input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  {uploadFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>

                {/* Document type */}
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type *</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Document Name</label>
                  <Input
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. KTP - John Doe"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[60px]"
                    placeholder="Optional notes about this document"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    className="active:scale-95 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !uploadFile} className="active:scale-95 transition-all duration-200">
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${deleteTarget?.document_name || deleteTarget?.file_name}? This action cannot be undone.`}
        variant="danger"
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        loading={deleting}
      />
    </div>
  );
}

// ── Profile Tab ────────────────────────────
function ProfileTab({ employee }: { employee: Employee }) {
  const fields: { label: string; value: string | number; icon: React.ReactNode }[] = [
    {
      label: "Employee Code",
      value: employee.employee_code,
      icon: <Hash className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Email",
      value: employee.email,
      icon: <Mail className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Phone",
      value: employee.phone || "-",
      icon: <Phone className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Gender",
      value: employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : "-",
      icon: <User className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Birth Date",
      value: employee.birth_date ? formatDate(employee.birth_date) : "-",
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Birth Place",
      value: employee.birth_place || "-",
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Address",
      value: employee.address || "-",
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Department",
      value: employee.department_name || "-",
      icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Position",
      value: employee.position_name || "-",
      icon: <Briefcase className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Manager",
      value: employee.manager_name || "-",
      icon: <User className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Employment Type",
      value: employee.employment_type
        ? employee.employment_type.charAt(0).toUpperCase() + employee.employment_type.slice(1)
        : "-",
      icon: <Briefcase className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Join Date",
      value: employee.join_date ? formatDate(employee.join_date) : "-",
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Contract Period",
      value:
        employee.contract_start && employee.contract_end
          ? `${formatDate(employee.contract_start)} - ${formatDate(employee.contract_end)}`
          : "-",
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "National ID (KTP)",
      value: employee.national_id || "-",
      icon: <FileSignature className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Tax ID (NPWP)",
      value: employee.tax_id || "-",
      icon: <FileSignature className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "BPJS Kesehatan",
      value: employee.bpjs_health || "-",
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "BPJS Ketenagakerjaan",
      value: employee.bpjs_labor || "-",
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Base Salary",
      value: employee.base_salary
        ? `Rp ${employee.base_salary.toLocaleString("id-ID")}`
        : "-",
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Bank",
      value: employee.bank_name || "-",
      icon: <Banknote className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Bank Account",
      value: employee.bank_account || "-",
      icon: <Hash className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Notes",
      value: employee.notes || "-",
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <Card className="card-hover transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-lg">Employee Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {fields.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="mt-0.5 flex-shrink-0">{f.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {f.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Documents Tab ──────────────────────────
function DocumentsTab({
  documents,
  onUpload,
  onDownload,
  onDelete,
  onVerify,
  verifyingId,
}: {
  documents: Document[];
  onUpload: () => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onVerify: (doc: Document) => void;
  verifyingId: string | null;
}) {
  return (
    <Card className="card-hover transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documents ({documents.length})</CardTitle>
        <Button onClick={onUpload} className="active:scale-95 transition-all duration-200">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <EmptyState icon="inbox" title="No documents uploaded" description="Upload employee documents to get started" action={{ label: "Upload Document", onClick: onUpload }} />
        ) : (
          <div className="space-y-3 stagger-children">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card card-hover transition-all duration-200"
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getDocumentIcon(doc.document_type)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {doc.document_name || doc.file_name}
                    </span>
                    <Badge variant="info" className="text-xs">
                      {doc.document_type}
                    </Badge>
                    {doc.is_verified ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-0.5 inline" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-0.5 inline" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                    {doc.notes && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{doc.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(doc)}
                    title="Download"
                    className="active:scale-95 transition-all duration-200"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVerify(doc)}
                    disabled={verifyingId === doc.id}
                    title={doc.is_verified ? "Mark as unverified" : "Verify document"}
                    className={
                      doc.is_verified
                        ? "text-amber-600 border-amber-200 hover:bg-amber-50 active:scale-95 transition-all duration-200"
                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all duration-200"
                    }
                  >
                    {verifyingId === doc.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : doc.is_verified ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(doc)}
                    title="Delete"
                    className="text-danger border-red-200 hover:bg-red-50 active:scale-95 transition-all duration-200"
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
  );
}
