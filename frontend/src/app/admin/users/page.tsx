"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchAllUsers, type UserWithTenant } from "@/lib/api-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, Search, X } from "lucide-react";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [users, setUsers] = useState<UserWithTenant[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

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
    let result = users;
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
    setFilteredUsers(result);
  }, [search, tenantFilter, users]);

  const uniqueTenants = [...new Set(users.map((u) => u.tenant_name))];

  const roleConfig: Record<string, { label: string; variant: string }> = {
    super_admin: { label: "Super Admin", variant: "danger" },
    tenant_admin: { label: "Tenant Admin", variant: "info" },
    manager: { label: "Manager", variant: "success" },
    employee: { label: "Employee", variant: "default" },
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
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">All Users</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          View all users across all tenants ({users.length} total)
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  className="pl-9"
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tenant</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
              >
                <option value="">All Tenants</option>
                {uniqueTenants.map((tn) => (
                  <option key={tn} value={tn}>{tn}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearch(""); setTenantFilter(""); }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--primary)]" />
            {filteredUsers.length} Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1">Try adjusting your search filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Tenant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Role</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const rc = roleConfig[u.role] || { label: u.role, variant: "default" };
                    return (
                      <tr key={`${u.id}-${u.tenant_slug}`} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                        <td className="py-3 px-4">
                          <span className="font-medium">{u.full_name}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--muted-foreground)]">{u.email}</td>
                        <td className="py-3 px-4 text-sm">{u.tenant_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={rc.variant as "default" | "success" | "warning" | "danger" | "info"}>
                            {rc.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              u.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={u.is_active ? "Active" : "Inactive"}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--muted-foreground)]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
