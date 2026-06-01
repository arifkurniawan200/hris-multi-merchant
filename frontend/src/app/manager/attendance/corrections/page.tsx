'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  X,
  PenLine,
  History,
} from 'lucide-react';
import {
  fetchAttendanceReport,
  requestCorrection,
  fetchPendingCorrections,
  approveCorrection,
  rejectCorrection,
  type AttendanceRecord,
  type PendingCorrection,
} from '@/lib/api-attendance-corrections';

type Tab = 'request' | 'pending';

export default function AttendanceCorrectionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('request');

  // Tab 1: Request Correction state
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceTotal, setAttendanceTotal] = useState(0);

  // Correction request modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [correctionType, setCorrectionType] = useState<'clock_in' | 'clock_out' | 'both'>('clock_in');
  const [requestedClockIn, setRequestedClockIn] = useState('');
  const [requestedClockOut, setRequestedClockOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Tab 2: Pending Corrections state
  const [pendingCorrections, setPendingCorrections] = useState<PendingCorrection[]>([]);
  const [allCorrections, setAllCorrections] = useState<PendingCorrection[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState('');

  // Shared
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ id: string; employeeName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const tenant = user?.tenant_id || '';
  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  // Load attendance report for selected date
  const loadAttendanceReport = useCallback(async () => {
    if (!selectedDate || !isManager) return;
    setLoadingAttendance(true);
    setError('');
    try {
      const result = await fetchAttendanceReport(tenant, selectedDate, 50, 0);
      setAttendanceRecords(result.items || []);
      setAttendanceTotal(result.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance report');
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedDate, tenant, isManager]);

  useEffect(() => {
    if (isManager && selectedDate) {
      loadAttendanceReport();
    }
  }, [selectedDate, loadAttendanceReport, isManager]);

  // Load pending corrections
  const loadPendingCorrections = useCallback(async () => {
    if (!isManager) return;
    setLoadingPending(true);
    setPendingError('');
    try {
      const data = await fetchPendingCorrections(tenant, 50, 0);
      setAllCorrections(data);
      setPendingCorrections(data.filter((c) => c.status === 'pending'));
    } catch (err: unknown) {
      setPendingError(err instanceof Error ? err.message : 'Failed to load pending corrections');
      setAllCorrections([]);
      setPendingCorrections([]);
    } finally {
      setLoadingPending(false);
    }
  }, [tenant, isManager]);

  useEffect(() => {
    if (activeTab === 'pending' && isManager) {
      loadPendingCorrections();
    }
  }, [activeTab, loadPendingCorrections, isManager]);

  // Open correction request modal
  function openCorrectionModal(record: AttendanceRecord) {
    setSelectedRecord(record);
    setCorrectionType('clock_in');
    setRequestedClockIn(record.clock_in || '');
    setRequestedClockOut(record.clock_out || '');
    setCorrectionReason('');
    setError('');
    setSuccess('');
    setShowCorrectionModal(true);
  }

  // Submit correction request
  async function handleSubmitCorrection() {
    if (!selectedRecord || !correctionReason.trim()) return;

    setSubmittingCorrection(true);
    setError('');
    setSuccess('');

    try {
      const payload: {
        attendance_id: string;
        type: 'clock_in' | 'clock_out' | 'both';
        requested_clock_in?: string;
        requested_clock_out?: string;
        reason: string;
      } = {
        attendance_id: selectedRecord.id,
        type: correctionType,
        reason: correctionReason.trim(),
      };

      if (correctionType === 'clock_in' || correctionType === 'both') {
        payload.requested_clock_in = requestedClockIn || undefined;
      }
      if (correctionType === 'clock_out' || correctionType === 'both') {
        payload.requested_clock_out = requestedClockOut || undefined;
      }

      await requestCorrection(tenant, payload);
      setSuccess('Correction request submitted successfully');
      setShowCorrectionModal(false);
      setSelectedRecord(null);
      // Refresh data
      loadAttendanceReport();
      if (activeTab === 'pending') {
        loadPendingCorrections();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit correction request');
    } finally {
      setSubmittingCorrection(false);
    }
  }

  // Approve correction
  async function handleApprove(id: string) {
    setProcessing(id);
    setError('');
    setSuccess('');
    try {
      await approveCorrection(tenant, id);
      setSuccess('Correction approved successfully');
      loadPendingCorrections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve correction');
    } finally {
      setProcessing(null);
    }
  }

  // Reject correction
  async function handleReject() {
    if (!rejectModal || rejectReason.trim().length < 10) return;
    setProcessing(rejectModal.id);
    setError('');
    setSuccess('');
    try {
      await rejectCorrection(tenant, rejectModal.id, rejectReason.trim());
      setSuccess('Correction rejected');
      setRejectModal(null);
      setRejectReason('');
      loadPendingCorrections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject correction');
    } finally {
      setProcessing(null);
    }
  }

  // --- Loading / Access Denied ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">Manager role required</p>
        </div>
      </div>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '—';
    // If it's a full datetime, show only time portion
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].substring(0, 5);
    }
    // Already a time string like HH:mm:ss
    return timeStr.substring(0, 5);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PenLine className="h-6 w-6" />
            Attendance Correction
          </h1>
          <p className="text-muted-foreground mt-1">
            Request corrections to attendance records or review pending requests
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('request')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'request'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Request Correction
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Pending Corrections
        </button>
      </div>

      {/* Tab 1: Request Correction */}
      {activeTab === 'request' && (
        <div className="space-y-6">
          {/* Date picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Date
              </CardTitle>
              <CardDescription>
                Choose a date to view attendance records and request corrections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Attendance records table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance Records ({selectedDate})
                {attendanceTotal > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    — {attendanceTotal} record{attendanceTotal !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAttendance ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No attendance records</p>
                  <p className="text-sm mt-1">
                    No records found for {selectedDate}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Code</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Clock In</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Clock Out</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-3 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-3 font-medium text-foreground">
                            {record.employee_name}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {record.employee_code}
                          </td>
                          <td className="py-3 px-3">
                            <span className={record.clock_in ? 'text-foreground' : 'text-muted-foreground'}>
                              {formatTime(record.clock_in)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={record.clock_out ? 'text-foreground' : 'text-muted-foreground'}>
                              {formatTime(record.clock_out)}
                            </span>
                          </td>
                          <td className="py-3 px-3">{getStatusBadge(record.status)}</td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCorrectionModal(record)}
                            >
                              <PenLine className="h-3.5 w-3.5 mr-1" />
                              Request Correction
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Pending Corrections */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{pendingCorrections.length}</p>
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
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">
                      {allCorrections.filter((c) => c.status === 'approved').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">
                      {allCorrections.filter((c) => c.status === 'rejected').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending corrections list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Requests ({pendingCorrections.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingError ? (
                <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{pendingError}</span>
                </div>
              ) : pendingCorrections.length === 0 && allCorrections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No correction requests</p>
                  <p className="text-sm mt-1">No attendance correction requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending corrections */}
                  {pendingCorrections.length > 0 && (
                    <div className="space-y-3">
                      {pendingCorrections.map((correction) => (
                        <div
                          key={correction.id}
                          className="p-4 rounded-lg border border-border bg-card space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">
                                  {correction.employee_name}
                                </span>
                                <Badge variant="default" className="text-xs">
                                  {correction.employee_code}
                                </Badge>
                                {getStatusBadge(correction.status)}
                              </div>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Date: </span>
                                  <span className="font-medium">{correction.date}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Type: </span>
                                  <span className="font-medium capitalize">{correction.type.replace('_', ' ')}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Original: </span>
                                  <span className="font-medium">
                                    {correction.original_clock_in
                                      ? formatTime(correction.original_clock_in)
                                      : '—'}{' '}
                                    /{' '}
                                    {correction.original_clock_out
                                      ? formatTime(correction.original_clock_out)
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Requested: </span>
                                  <span className="font-medium">
                                    {correction.requested_clock_in
                                      ? formatTime(correction.requested_clock_in)
                                      : '—'}{' '}
                                    /{' '}
                                    {correction.requested_clock_out
                                      ? formatTime(correction.requested_clock_out)
                                      : '—'}
                                  </span>
                                </div>
                              </div>
                              {correction.reason && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <span className="font-medium">Reason:</span> {correction.reason}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Requested by: {correction.requested_by_name}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApprove(correction.id)}
                                disabled={processing === correction.id}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setRejectModal({
                                    id: correction.id,
                                    employeeName: correction.employee_name,
                                  })
                                }
                                disabled={processing === correction.id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Approved/Rejected history */}
                  {allCorrections.filter((c) => c.status !== 'pending').length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-6 mb-3">
                        <History className="h-4 w-4" />
                        History ({allCorrections.filter((c) => c.status !== 'pending').length})
                      </h3>
                      <div className="space-y-2">
                        {allCorrections
                          .filter((c) => c.status !== 'pending')
                          .map((correction) => (
                            <div
                              key={correction.id}
                              className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">
                                  {correction.employee_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({correction.employee_code})
                                </span>
                                {getStatusBadge(correction.status)}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>
                                  {correction.date} — {correction.type.replace('_', ' ')} correction
                                </p>
                                <p>
                                  Original: {formatTime(correction.original_clock_in)} /{' '}
                                  {formatTime(correction.original_clock_out)} → Requested:{' '}
                                  {formatTime(correction.requested_clock_in)} /{' '}
                                  {formatTime(correction.requested_clock_out)}
                                </p>
                                {correction.reject_reason && (
                                  <p>
                                    Rejection reason: {correction.reject_reason}
                                  </p>
                                )}
                                <p>
                                  By: {correction.approved_by_name || correction.requested_by_name}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Correction Request Modal */}
      {showCorrectionModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Request Correction</CardTitle>
              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setSelectedRecord(null);
                }}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee info */}
              <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Employee: </span>
                  <span className="font-medium">{selectedRecord.employee_name}</span>
                  <Badge variant="default" className="ml-2 text-xs">
                    {selectedRecord.employee_code}
                  </Badge>
                </p>
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium">{selectedRecord.date}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Current Times: </span>
                  <span className="font-medium">
                    In: {formatTime(selectedRecord.clock_in)} / Out:{' '}
                    {formatTime(selectedRecord.clock_out)}
                  </span>
                </p>
              </div>

              {/* Correction type */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Correction Type
                </label>
                <div className="flex gap-2">
                  {(['clock_in', 'clock_out', 'both'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setCorrectionType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                        correctionType === type
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requested times */}
              {(correctionType === 'clock_in' || correctionType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Requested Clock In Time
                  </label>
                  <Input
                    type="time"
                    value={requestedClockIn}
                    onChange={(e) => setRequestedClockIn(e.target.value)}
                  />
                </div>
              )}
              {(correctionType === 'clock_out' || correctionType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Requested Clock Out Time
                  </label>
                  <Input
                    type="time"
                    value={requestedClockOut}
                    onChange={(e) => setRequestedClockOut(e.target.value)}
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Reason for Correction <span className="text-danger">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y text-sm"
                  placeholder="Describe why this correction is needed..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setSelectedRecord(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitCorrection}
                  disabled={
                    submittingCorrection || !correctionReason.trim()
                  }
                >
                  {submittingCorrection ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <PenLine className="h-4 w-4 mr-2" />
                      Submit Correction
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reject Correction Request</CardTitle>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rejecting correction request from{' '}
                <strong>{rejectModal.employeeName}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Rejection Reason (min 10 chars)
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y text-sm"
                  placeholder="Provide a reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={
                    rejectReason.trim().length < 10 ||
                    processing === rejectModal.id
                  }
                >
                  {processing === rejectModal.id ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
