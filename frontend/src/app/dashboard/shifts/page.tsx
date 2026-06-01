"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays, MapPin, AlertTriangle } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

interface ShiftAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  color: string;
  is_flexible: boolean;
}

export default function MyShiftPage() {
  const t = useTranslations('shifts');
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMyShift();
  }, []);

  async function loadMyShift() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<ShiftAssignment>("/api/v1/employee/me/shift");
      // Check if we got a real assignment (has shift_name) or a "no shift" response
      if (data && "shift_name" in data) {
        setAssignment(data);
      } else {
        setAssignment(null);
      }
    } catch (err: unknown) {
      setAssignment(null);
      if (err instanceof Error && err.message !== "no active shift for today") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState variant="fullscreen" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('myShift')}</h1>
        <p className="text-muted-foreground mt-1">
          View your current shift schedule
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!assignment ? (
        <Card className="card-hover transition-all duration-200">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg text-foreground">{t('noActiveShift')}</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                You don&apos;t have an active shift for today. Please contact your manager or admin to assign your shift.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
          {/* Main shift info */}
          <Card className="card-hover transition-all duration-200 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: assignment.color || "#4f46e5" }}
                />
                {assignment.shift_name}
                <Badge variant="info">{assignment.shift_code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                  <Clock className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('startTime')}</p>
                    <p className="text-lg font-bold">{assignment.start_time.substring(0, 5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                  <Clock className="h-8 w-8 text-danger" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('endTime')}</p>
                    <p className="text-lg font-bold">{assignment.end_time.substring(0, 5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                  <MapPin className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Grace Period</p>
                    <p className="text-lg font-bold">{assignment.grace_minutes} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                  <CalendarDays className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('flexible')}</p>
                    <p className="text-lg font-bold">
                      {assignment.is_flexible ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Effective period */}
          <Card className="card-hover transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-base">Effective Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="font-medium">{assignment.effective_from}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="font-medium">
                  {assignment.effective_to || "Indefinite"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Clock info */}
          <Card className="card-hover transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-base">Clock Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Arrive no later than {assignment.grace_minutes} min after start time</span>
              </div>
              {!assignment.is_flexible && (
                <>
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>You can clock in {assignment.grace_minutes} min before start</span>
                  </div>
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Clock out after shift ends</span>
                  </div>
                </>
              )}
              {assignment.is_flexible && (
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Flexible shift — no strict clock-in window</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
