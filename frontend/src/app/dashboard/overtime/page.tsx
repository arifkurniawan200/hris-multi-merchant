"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, CheckCircle2, AlertCircle, Moon } from "lucide-react";

interface OvertimeRequest {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  reason: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function OvertimePage() {
  const { user } = useAuth();
  const [myOT, setMyOT] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    reason: "",
  });

  const [totalHours, setTotalHours] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await api.get<OvertimeRequest[]>("/api/v1/overtime?limit=10&offset=0");
      setMyOT(res);
    } catch (err) {
      // API mungkin belum ada, silent
    } finally {
      setLoading(false);
    }
  }

  function calcHours() {
    if (form.start_time && form.end_time) {
      const [sh, sm] = form.start_time.split(":").map(Number);
      const [eh, em] = form.end_time.split(":").map(Number);
      const diff = (eh * 60 + em - sh * 60 - sm) / 60;
      if (diff > 0) {
        setTotalHours(diff.toFixed(1));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/overtime", {
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        total_hours: parseFloat(totalHours),
        reason: form.reason,
        tenant_id: user?.tenant_id,
      });
      setSuccess("Overtime request submitted successfully!");
      setForm({ date: "", start_time: "", end_time: "", reason: "" });
      setTotalHours("");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Overtime module is not ready yet");
    } finally {
      setSubmitting(false);
    }
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Overtime Request</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Submit and track your overtime requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent)]">
                <FileText className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Requests</p>
                <p className="text-2xl font-bold">{myOT.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Pending</p>
                <p className="text-2xl font-bold">
                  {myOT.filter((o) => o.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Approved</p>
                <p className="text-2xl font-bold">
                  {myOT.filter((o) => o.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error.startsWith("Overtime") ? "⚠️ " + error : error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Submit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-500" />
            New Overtime Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Start Time</label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => { setForm({ ...form, start_time: e.target.value }); setTimeout(calcHours, 50); }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">End Time</label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => { setForm({ ...form, end_time: e.target.value }); setTimeout(calcHours, 50); }}
                  required
                />
              </div>
            </div>
            {totalHours && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Total: <span className="font-semibold text-[var(--foreground)]">{totalHours} hours</span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Why do you need overtime?"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Overtime Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Overtime History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--primary)]" />
            My Overtime History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myOT.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Moon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No overtime requests</p>
              <p className="text-sm mt-1">Submit your first overtime request above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOT.map((ot) => (
                <div key={ot.id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--foreground)]">{ot.date}</p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                        {ot.start_time} - {ot.end_time} ({ot.total_hours}h)
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">{ot.reason}</p>
                    </div>
                    <Badge variant={statusConfig[ot.status]?.variant as any || "default"}>
                      {statusConfig[ot.status]?.label || ot.status}
                    </Badge>
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
