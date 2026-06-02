"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchAllUsers, updateUserRole, type UserWithTenant } from "@/lib/api-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Users, AlertCircle, Search, X, Edit3, Check, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterDropdown } from "@/components/ui/filter-dropdown";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "tenant_admin", label: "Tenant Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

interface ConfirmState {
  user: UserWithTenant;
  newRole: string;
}

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const ta = useTranslations('accessDenied');
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [users, setUsers] = useState<UserWithTenant[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Inline editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");

  // Confirm dialog
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [updating, setUpdating] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;
  const pagedUsers = filteredUsers.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredUsers.length / perPage);

  useEffect(() => {
    setPage(1);
  }, [search, tenantFilter, roleFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllUsers();
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadUsers();
  }, [isSuperAdmin, loadUsers]);

  useEffect(() => {
    let result = users ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q)
      );
    }
    if (tenantFilter) {
      result = result.filter((u) => u.tenant_name === tenantFilter);
    }
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    setFilteredUsers(result);
  }, [search, tenantFilter, roleFilter, users]);

  const uniqueTenants = [...new Set((users ?? []).map((u) => u.tenant_name))];

  const roleConfig: Record<string, { label: string; variant: string }> = {
    super_admin: { label: t('superAdmin'), variant: "danger" },
    tenant_admin: { label: t('tenantAdmin'), variant: "info" },
    manager: { label: "Manager", variant: "success" },
    employee: { label: "Employee", variant: "default" },
  };

  // ── Inline edit handlers ──────────────────────────────────────────────

  const handleStartEdit = (u: UserWithTenant) => {
    setEditingUserId(u.id);
    setEditingRole(u.role);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole("");
  };

  const handleRoleSelectChange = (value: string) => {
    setEditingRole(value);
  };

  const handleConfirmUpdate = async () => {
    if (!confirm) return;
    setUpdating(true);
    setError("");
    try {
      await updateUserRole(confirm.user.id, {
        role: confirm.newRole,
        tenant_id: confirm.user.tenant_id,
      });
      setConfirm(null);
      setEditingUserId(null);
      setEditingRole("");
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      setConfirm(null);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveClick = (u: UserWithTenant) => {
    if (editingRole === u.role) {
      // No change, just cancel editing
      handleCancelEdit();
      return;
    }
    setConfirm({ user: u, newRole: editingRole });
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">{ta('title')}</p>
          <p className="text-sm text-muted-foreground mt-1">{ta('requiredRole', { role: 'Super Admin' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('users')}</h1>
        <p className="text-muted-foreground mt-1">
          {tc('totalItems', { count: users.length })}
        </p>
      </div>

      {/* Filters */}
      <Card className="card-hover transition-all duration-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{tc('search')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t('search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('tenantName')}</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
              >
                <option value="">{tc('all')} {t('tenants')}</option>
                {(uniqueTenants ?? []).map((tn) => (
                  <option key={tn} value={tn}>{tn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('role')}</label>
              <FilterDropdown label={t('role')} options={[
                {value:'super_admin',label:t('superAdmin')},{value:'tenant_admin',label:t('tenantAdmin')},{value:'manager',label:'Manager'},{value:'employee',label:'Employee'}
              ]} value={roleFilter} onChange={setRoleFilter} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearch(""); setTenantFilter(""); setRoleFilter(""); }} className="active:scale-95 transition-all duration-200">
                {tc('clear')} {tc('filter')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger transition-all duration-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Users table */}
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {filteredUsers.length} {t('users')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState variant="fullscreen" />
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon="search" title={t('noUsers')} description={tc('tryDifferentSearch')} />
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{tc('name')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{tc('email')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('tenantName')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('role')}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{tc('status')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => {
                    const isEditing = editingUserId === u.id;
                    const rc = roleConfig[u.role] || { label: u.role, variant: "default" };
                    return (
                      <tr key={`${u.id}-${u.tenant_slug}`} className="border-b border-border hover:bg-muted/50 transition-all duration-200">
                        <td className="py-3 px-4">
                          <span className="font-medium">{u.full_name}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4 text-sm">{u.tenant_name}</td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <Select
                                options={ROLE_OPTIONS}
                                value={editingRole}
                                onChange={(e) => handleRoleSelectChange(e.target.value)}
                                className="h-8 min-w-[130px] text-xs"
                              />
                              <button
                                onClick={() => handleSaveClick(u)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-green-600 hover:bg-green-50 active:scale-95 transition-all duration-200"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted active:scale-95 transition-all duration-200"
                                title="Cancel"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Badge variant={rc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                                {rc.label}
                              </Badge>
                              <button
                                onClick={() => handleStartEdit(u)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted active:scale-95 transition-all duration-200"
                                title="Edit role"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              u.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={u.is_active ? tc('active') : tc('inactive')}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm role change dialog */}
      <ConfirmDialog
        variant="warning"
        open={!!confirm}
        onClose={() => {
          if (!updating) setConfirm(null);
        }}
        onConfirm={handleConfirmUpdate}
        title="Change User Role"
        message={
          confirm
            ? `Are you sure you want to change ${confirm.user.full_name}'s role from "${roleConfig[confirm.user.role]?.label || confirm.user.role}" to "${ROLE_OPTIONS.find((o) => o.value === confirm.newRole)?.label || confirm.newRole}"?`
            : ""
        }
        confirmLabel={updating ? "Updating..." : "Change Role"}
        loading={updating}
      />
    </div>
  );
}
