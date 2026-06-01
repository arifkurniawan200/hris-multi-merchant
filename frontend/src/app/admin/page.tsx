"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Shield, ArrowRight } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-[var(--foreground)]">Access Denied</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Super admin role required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Admin Panel</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Platform administration and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/tenants")}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tenants</CardTitle>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Manage all tenant companies, their plans, subscriptions, and activation status
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/users")}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Users</CardTitle>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    View all users across every tenant with their roles and status
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
