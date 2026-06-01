"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchAllTenants, createTenant, activateTenant, deactivateTenant, extendTenant, changeTenantPlan, deleteTenant, fetchTenantDetail, type Tenant, type CreateTenantData } from "@/lib/api-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, AlertCircle, Plus, Check, X, Shield, ChevronDown, ChevronUp, ExternalLink, Calendar, Users, CreditCard } from "lucide-react";

export default function AdminTenantsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTenantData>({ name: "", slug: "", plan: "free", price_per_employee: 0 });

  // Change plan modal
  const [showPlanModal, setShowPlanModal] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ plan: "free", price_per_employee: 0 });

  // Extend modal
  const [showExtend, setShowExtend] = useState<string | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllTenants();
      setTenants(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadTenants();
  }, [isSuperAdmin, loadTenants]);

  async function handleCreate() {
    try {
      await createTenant(createForm);
      setShowCreate(false);
      setCreateForm({ name: "", slug: "", plan: "free", price_per_employee: 0 });
      loadTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    }
  }

  async function handleToggleActive(t: Tenant) {
    try {
      if (t.is_active) {
        await deactivateTenant(t.id);
      } else {
        await activateTenant(t.id);
      }
      loadTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle tenant status");
    }
  }

  async function handleChangePlan() {
    if (!showPlanModal) return;
    try {
      await changeTenantPlan(showPlanModal, planForm.plan, planForm.price_per_employee);
      setShowPlanModal(null);
      loadTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change plan");
    }
  }

  async function handleExtend() {
    if (!showExtend) return;
    try {
      await extendTenant(showExtend, extendMonths);
      setShowExtend(null);
      setExtendMonths(1);
      loadTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to extend subscription");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteTenant(confirmDelete);
      setConfirmDelete(null);
      loadTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tenant");
    }
  }

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailTenant(null);
      return;
    }
    setExpandedId(id);
    try {
      const detail = await fetchTenantDetail(id);
      setDetailTenant(detail);
    } catch {
      setDetailTenant(null);
    }
  }

  function openPlanModal(t: Tenant) {
    setPlanForm({ plan: t.plan, price_per_employee: t.plan_price_per_employee });
    setShowPlanModal(t.id);
  }

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.is_active).length,
    inactive: tenants.filter((t) => !t.is_active).length,
    totalEmployees: tenants.reduce((sum, t) => sum + (t.employee_count || 0), 0),
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-[var(--foreground)]">Access Denied</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Super admin role required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tenant Management</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Manage all tenants across the platform</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Tenant
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalEmployees}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tenant table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--primary)]" />
            All Tenants ({tenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No tenants found</p>
              <p className="text-sm mt-1">Create your first tenant to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Tenant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Plan</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Employees</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Max</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Subscription</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <>
                      <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleExpand(t.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            {expandedId === t.id ? (
                              <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                            )}
                            <div>
                              <div className="font-medium">{t.name}</div>
                              <div className="text-xs text-[var(--muted-foreground)]">{t.slug}</div>
                            </div>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={t.plan === "enterprise" ? "info" : t.plan === "pro" ? "success" : "default"}>
                            {t.plan}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              t.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={t.is_active ? "Active" : "Inactive"}
                          />
                        </td>
                        <td className="py-3 px-4 text-center text-sm">{t.employee_count || 0}</td>
                        <td className="py-3 px-4 text-center text-sm">{t.max_employees}</td>
                        <td className="py-3 px-4 text-sm">
                          {t.subscription_expires_at
                            ? new Date(t.subscription_expires_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(t)}
                              title={t.is_active ? "Deactivate" : "Activate"}
                              className={t.is_active ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                            >
                              {t.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPlanModal(t)}
                              title="Change Plan"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowExtend(t.id);
                                setExtendMonths(1);
                              }}
                              title="Extend Subscription"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(t.id)}
                              title="Delete Tenant"
                              className="text-red-600 hover:text-red-700"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === t.id && detailTenant && detailTenant.id === t.id && (
                        <tr key={`${t.id}-detail`}>
                          <td colSpan={7} className="px-4 pb-4">
                            <div className="bg-[var(--muted)]/30 rounded-lg p-4 border border-[var(--border)]">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-[var(--muted-foreground)]">ID</span>
                                  <p className="font-mono text-xs mt-0.5">{detailTenant.id}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--muted-foreground)]">Created</span>
                                  <p className="mt-0.5">{new Date(detailTenant.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--muted-foreground)]">Price/Employee</span>
                                  <p className="mt-0.5">Rp {detailTenant.plan_price_per_employee.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--muted-foreground)]">Logo URL</span>
                                  <p className="mt-0.5 truncate max-w-[200px]">{detailTenant.logo_url || "—"}</p>
                                </div>
                              </div>
                              {detailTenant.subscription_expires_at && (
                                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                  <span className="text-[var(--muted-foreground)]">Subscription expires: </span>
                                  <span className={new Date(detailTenant.subscription_expires_at) < new Date() ? "text-red-600 font-medium" : "text-green-600"}>
                                    {new Date(detailTenant.subscription_expires_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--background)] rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create Tenant</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="My Company" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug</label>
                <Input value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} placeholder="my-company" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Plan</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  value={createForm.plan}
                  onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Price per Employee (Rp)</label>
                <Input type="number" value={createForm.price_per_employee} onChange={(e) => setCreateForm({ ...createForm, price_per_employee: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!createForm.name || !createForm.slug}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPlanModal(null)}>
          <div className="bg-[var(--background)] rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Change Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Plan</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  value={planForm.plan}
                  onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Price per Employee (Rp)</label>
                <Input type="number" value={planForm.price_per_employee} onChange={(e) => setPlanForm({ ...planForm, price_per_employee: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowPlanModal(null)}>Cancel</Button>
                <Button onClick={handleChangePlan}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExtend(null)}>
          <div className="bg-[var(--background)] rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Extend Subscription</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Months</label>
                <Input type="number" min={1} max={36} value={extendMonths} onChange={(e) => setExtendMonths(parseInt(e.target.value) || 1)} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowExtend(null)}>Cancel</Button>
                <Button onClick={handleExtend}>Extend</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[var(--background)] rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Delete Tenant</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Are you sure you want to delete this tenant? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
