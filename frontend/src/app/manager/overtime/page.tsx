"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Users, AlertTriangle, Moon } from "lucide-react";

interface PendingOvertime {
  id: string;
  employee_name: string;
  employee_code: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  reason: string;
  created_at: string;
}

export default function OvertimeApprovalsPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingOvertime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const isManager = user?.role === "manager" || user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isManager) loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<PendingOvertime[]>("/api/v1/overtime/pending?limit=50&offset=0");
      setPending(data);
    } catch (err: unknown) {
      setError("Overtime approvals API not available yet");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setProcessing(id);
    setError("");
    try {
      await api.put(`/api/v1/overtime/${id}/approve`);
      setSuccess("Overtime approved successfully");
      loadPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setProcessing(null);
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Overtime Approvals</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Review pending overtime requests from your team</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Pending</p>
                <p className="text-2xl font-bold">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Employees</p>
                <p className="text-2xl font-bold">
                  {new Set(pending.map((p) => p.employee_code)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50">
                <Moon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Hours</p>
                <p className="text-2xl font-bold">
                  {pending.reduce((sum, p) => sum + p.total_hours, 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            {error.includes("not available") ? "⚠️ " + error : error}
          </p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Pending list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Overtime Requests ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No pending overtime requests to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((ot) => (
                <div
                  key={ot.id}
                  className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--foreground)]">{ot.employee_name}</span>
                        <Badge variant="default" className="text-xs">{ot.employee_code}</Badge>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-[var(--muted-foreground)]">Date:</span> {ot.date}
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">Time:</span> {ot.start_time} - {ot.end_time}
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">Hours:</span> {ot.total_hours}h
                        </div>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">"{ot.reason}"</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(ot.id)}
                      disabled={processing === ot.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {processing === ot.id ? (
                        <span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={true}
                      className="text-[var(--muted-foreground)]"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject (coming soon)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
