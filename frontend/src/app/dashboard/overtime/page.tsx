"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, CheckCircle2, AlertCircle, Moon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

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

const statusConfig: Record<string, { label: string; variant: "warning" | "success" | "danger" | "default" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function OvertimePage() {
  const t = useTranslations('overtime');
  const tc = useTranslations('common');
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
      setMyOT(res ?? []);
    } catch {
      // silent
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
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">Submit and track your overtime requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('title')}</p>
                <p className="text-2xl font-bold">{(myOT ?? []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('pending')}</p>
                <p className="text-2xl font-bold">
                  {(myOT ?? []).filter((o: OvertimeRequest) => o.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('approved')}</p>
                <p className="text-2xl font-bold">
                  {(myOT ?? []).filter((o: OvertimeRequest) => o.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger animate-slide-up">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error.startsWith("Overtime") ? "⚠️ " + error : error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success animate-slide-up">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Submit Form */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-500" />
            {t('newRequest')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('date')}</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('startTime')}</label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => { setForm({ ...form, start_time: e.target.value }); setTimeout(calcHours, 50); }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('endTime')}</label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => { setForm({ ...form, end_time: e.target.value }); setTimeout(calcHours, 50); }}
                  required
                />
              </div>
            </div>
            {totalHours && (
              <p className="text-sm text-muted-foreground">
                {t('hours')}: <span className="font-semibold text-foreground">{totalHours} hours</span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Why do you need overtime?"
              />
            </div>
            <Button type="submit" disabled={submitting} className="transition-all duration-200 active:scale-95">
              {submitting ? tc('submitting') : t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Overtime History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!myOT || myOT.length === 0 ? (
            <EmptyState icon="inbox" title={t('noOvertime')} description="Submit your first overtime request above" />
          ) : (
            <div className="space-y-3 stagger-children">
              {myOT.map((ot) => (
                <div key={ot.id} className="p-4 rounded-lg border border-border bg-card card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{ot.date}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {ot.start_time} - {ot.end_time} ({ot.total_hours}h)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{ot.reason}</p>
                    </div>
                    <Badge variant={statusConfig[ot.status]?.variant || "default"}>
                      {t(ot.status)}
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
