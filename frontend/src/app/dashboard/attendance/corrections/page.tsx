'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  PenLine,
  History,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_in_status: string | null;
  clock_out: string | null;
  clock_out_status: string | null;
  status: string;
  total_hours: number | null;
}

interface MyCorrection {
  id: string;
  attendance_id: string;
  type: 'clock_in' | 'clock_out' | 'both';
  clock_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  current_clock_in: string | null;
  current_clock_out: string | null;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  reject_reason: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────

function formatTime(t: string | null): string {
  if (!t) return '—';
  const d = new Date(t);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(t: string | null): string {
  if (!t) return '—';
  const d = new Date(t);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime24(t: string): string {
  try {
    const d = new Date(t);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return t;
  }
}

// ── Component ───────────────────────────────────────

export default function AttendanceCorrectionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

  // Tab 1: Request state
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [myAttendances, setMyAttendances] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Correction modal
  const [showModal, setShowModal] = useState(false);
  const [selectedAtt, setSelectedAtt] = useState<AttendanceRecord | null>(null);
  const [corrType, setCorrType] = useState<'clock_in' | 'clock_out' | 'both'>('clock_in');
  const [reqClockIn, setReqClockIn] = useState('');
  const [reqClockOut, setReqClockOut] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tab 2: My corrections history
  const [myCorrections, setMyCorrections] = useState<MyCorrection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Shared
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const loadMyAttendance = useCallback(async () => {
    if (!selectedDate || !user) return;
    setLoadingAttendance(true);
    setError('');
    try {
      const res = await api.get<AttendanceRecord[]>('/api/v1/attendance/history');
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setMyAttendances(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data absensi';
      setError('Terjadi kesalahan: ' + msg);
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedDate, user]);

  const loadMyCorrections = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await api.get<MyCorrection[]>('/api/v1/attendance/corrections/mine');
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setMyCorrections(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat koreksi';
      setError('Terjadi kesalahan: ' + msg);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyAttendance();
  }, [loadMyAttendance]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadMyCorrections();
    }
  }, [activeTab, loadMyCorrections]);

  async function handleSubmit() {
    if (!selectedAtt || !corrReason || corrReason.length < 5) {
      setError('Alasan koreksi minimal 5 karakter');
      return;
    }
    if (corrType === 'clock_in' && !reqClockIn) {
      setError('Masukkan jam clock-in yang benar');
      return;
    }
    if (corrType === 'clock_out' && !reqClockOut) {
      setError('Masukkan jam clock-out yang benar');
      return;
    }
    if (corrType === 'both' && (!reqClockIn || !reqClockOut)) {
      setError('Masukkan jam clock-in dan clock-out yang benar');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, any> = {
        attendance_id: selectedAtt.id,
        type: corrType,
        reason: corrReason,
      };
      // Only include the times relevant to the selected type
      if (corrType === 'clock_in' && reqClockIn) {
        payload.requested_clock_in = `${selectedDate}T${reqClockIn}:00`;
      } else if (corrType === 'clock_out' && reqClockOut) {
        payload.requested_clock_out = `${selectedDate}T${reqClockOut}:00`;
      } else if (corrType === 'both') {
        if (reqClockIn) payload.requested_clock_in = `${selectedDate}T${reqClockIn}:00`;
        if (reqClockOut) payload.requested_clock_out = `${selectedDate}T${reqClockOut}:00`;
      }
      await api.post('/api/v1/attendance/corrections', payload);
      setSuccess('Permintaan koreksi berhasil dikirim');
      setShowModal(false);
      setCorrReason('');
      setReqClockIn('');
      setReqClockOut('');
      loadMyCorrections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim permintaan';
      setError('Terjadi kesalahan: ' + msg);
    } finally {
      setSubmitting(false);
    }
  }

  function openModal(att: AttendanceRecord) {
    setSelectedAtt(att);
    setCorrType('clock_in');
    setReqClockIn(att.clock_in ? formatTime24(att.clock_in) : '');
    setReqClockOut(att.clock_out ? formatTime24(att.clock_out) : '');
    setCorrReason('');
    setError('');
    setSuccess('');
    setShowModal(true);
  }

  if (authLoading) return <LoadingState variant="fullscreen" />;
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Koreksi Absensi
        </h1>
        <p className="text-muted-foreground">
          Ajukan koreksi jika ada kesalahan clock-in atau clock-out
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'request'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenLine className="w-4 h-4 inline mr-1.5" />
          Ajukan Koreksi
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'history'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4 inline mr-1.5" />
          Riwayat Koreksi
        </button>
      </div>

      {activeTab === 'request' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih Tanggal</CardTitle>
            <CardDescription>
              Pilih tanggal untuk melihat data absensi yang bisa dikoreksi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={loadMyAttendance}
                disabled={loadingAttendance}
                size="sm"
              >
                {loadingAttendance ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Memuat...</>
                ) : (
                  <><Calendar className="w-4 h-4 mr-1.5" />Cari Absensi</>
                )}
              </Button>
            </div>

            {loadingAttendance ? (
              <LoadingState variant="fullscreen" />
            ) : myAttendances.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="Tidak ada data absensi"
                description={`Tidak ditemukan absensi pada tanggal ${new Date(selectedDate).toLocaleDateString('id-ID')}`}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Menampilkan {myAttendances.length} catatan absensi
                </p>
                {myAttendances.map((att) => (
                  <Card key={att.id} className="border border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className={
                            att.status === 'present' ? 'bg-green-50 text-green-700 border-green-200' :
                            att.status === 'late' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            att.status === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }>
                            {att.status === 'present' ? 'Hadir' :
                             att.status === 'late' ? 'Terlambat' :
                             att.status === 'absent' ? 'Tidak Hadir' :
                             att.status || '-'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          {formatDate(att.date)}
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            Clock-in: <span className="font-medium">{formatTime(att.clock_in)}</span>
                          </span>
                          <span>
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            Clock-out: <span className="font-medium">{formatTime(att.clock_out)}</span>
                          </span>
                        </div>
                        {att.total_hours != null && (
                          <div className="text-xs text-gray-400">
                            Total: {att.total_hours.toFixed(1)} jam
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(att)}
                        disabled={att.status === 'absent' && !att.clock_in}
                      >
                        <PenLine className="w-4 h-4 mr-1" />
                        Koreksi
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riwayat Koreksi</CardTitle>
            <CardDescription>
              Status permintaan koreksi absensi yang sudah diajukan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <LoadingState variant="fullscreen" />
            ) : myCorrections.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="Belum ada koreksi"
                description="Anda belum mengajukan permintaan koreksi absensi"
                action={{ label: "Ajukan Koreksi Sekarang", onClick: () => setActiveTab('request') }}
              />
            ) : (
              <div className="space-y-3">
                {myCorrections.map((corr) => (
                  <Card key={corr.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            corr.status === 'approved' ? 'success' :
                            corr.status === 'rejected' ? 'danger' :
                            'warning'
                          }>
                            {corr.status === 'pending' ? 'Pending' :
                             corr.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDate(corr.created_at)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">
                          {corr.type === 'clock_in' ? 'Clock-In' : corr.type === 'clock_out' ? 'Clock-Out' : 'Clock-In & Out'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Tanggal:</div>
                        <div className="font-medium">{corr.clock_date}</div>

                        {corr.current_clock_in != null && (
                          <>
                            <div className="text-gray-500">Clock-in saat ini:</div>
                            <div className="font-medium">{formatTime(corr.current_clock_in)}</div>
                          </>
                        )}
                        {corr.requested_clock_in != null && (
                          <>
                            <div className="text-gray-500">Clock-in yang diminta:</div>
                            <div className="font-medium text-indigo-600">{formatTime(corr.requested_clock_in)}</div>
                          </>
                        )}
                        {corr.current_clock_out != null && (
                          <>
                            <div className="text-gray-500">Clock-out saat ini:</div>
                            <div className="font-medium">{formatTime(corr.current_clock_out)}</div>
                          </>
                        )}
                        {corr.requested_clock_out != null && (
                          <>
                            <div className="text-gray-500">Clock-out yang diminta:</div>
                            <div className="font-medium text-indigo-600">{formatTime(corr.requested_clock_out)}</div>
                          </>
                        )}
                        <div className="text-gray-500 col-span-2 mt-1">Alasan:</div>
                        <div className="text-gray-700 col-span-2 bg-gray-50 rounded p-2 text-sm">
                          {corr.reason}
                        </div>
                        {corr.status === 'rejected' && corr.reject_reason && (
                          <>
                            <div className="text-red-500 col-span-2 mt-1">Alasan ditolak:</div>
                            <div className="text-red-700 col-span-2 bg-red-50 rounded p-2 text-sm">
                              {corr.reject_reason}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showModal && selectedAtt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Koreksi Absensi
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>Tanggal: <span className="font-medium">{selectedAtt.date ? formatDate(selectedAtt.date) : '-'}</span></p>
              <p>
                Clock-in saat ini: <span className="font-medium">{formatTime(selectedAtt.clock_in)}</span>
                {selectedAtt.clock_out && (
                  <> | Clock-out saat ini: <span className="font-medium">{formatTime(selectedAtt.clock_out)}</span></>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipe Koreksi
              </label>
              <div className="flex gap-2">
                {(['clock_in', 'clock_out', 'both'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCorrType(t)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      corrType === t
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t === 'clock_in' ? 'Clock-In' : t === 'clock_out' ? 'Clock-Out' : 'Keduanya'}
                  </button>
                ))}
              </div>
            </div>

            {(corrType === 'clock_in' || corrType === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Clock-in yang benar
                </label>
                <Input
                  type="time"
                  value={reqClockIn}
                  onChange={(e) => setReqClockIn(e.target.value)}
                />
              </div>
            )}
            {(corrType === 'clock_out' || corrType === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Clock-out yang benar
                </label>
                <Input
                  type="time"
                  value={reqClockOut}
                  onChange={(e) => setReqClockOut(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Alasan Koreksi
              </label>
              <textarea
                value={corrReason}
                onChange={(e) => setCorrReason(e.target.value)}
                placeholder="Jelaskan alasan koreksi (min. 5 karakter)"
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || corrReason.length < 5}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Mengirim...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-1.5" />Kirim Permintaan</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
