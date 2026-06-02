'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Megaphone,
  Pin,
  PinOff,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Building2,
  Send,
  Pencil,
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  message: string;
  department_id: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  department_name?: string;
  is_read?: boolean;
  read_count?: number;
  target_count?: number;
}

interface AnnouncementForm {
  title: string;
  message: string;
  department_id: string | null;
  is_pinned: boolean;
  audience: 'all' | 'department';
}

interface Department {
  id: string;
  name: string;
}

const EMPTY_FORM: AnnouncementForm = {
  title: '',
  message: '',
  department_id: null,
  is_pinned: false,
  audience: 'all',
};

// ── Helpers ────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'MMM d, yyyy HH:mm');
  } catch {
    return '—';
  }
}

// ── Page ───────────────────────────────────────────────

export default function AnnouncementsPage() {
  const t = useTranslations('nav.announcements');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const isManager =
    user?.role === 'manager' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.replace('/dashboard');
    }
  }, [authLoading, isManager, router]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Departments for filter
  const [departments, setDepartments] = useState<Department[]>([]);

  // ── Load Data ──────────────────────────────────────

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [data, deptData] = await Promise.all([
        api.get<{ data: Announcement[]; total: number }>('/api/v1/announcements?limit=50'),
        api.get<Department[]>('/api/v1/departments').catch(() => [] as Department[]),
      ]);
      setAnnouncements(data.data ?? []);
      setTotal(data.total ?? 0);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : te('fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [te]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // ── Submit ──────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body: any = {
        title: form.title.trim(),
        message: form.message.trim(),
        is_pinned: form.is_pinned,
        audience: form.audience,
      };
      if (form.audience === 'department' && form.department_id) {
        body.department_id = form.department_id;
      }

      if (editingId) {
        await api.put(`/api/v1/announcements/${editingId}`, body);
        setSuccess(t('updateSuccess'));
      } else {
        await api.post('/api/v1/announcements', body);
        setSuccess(t('createSuccess'));
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.del(`/api/v1/announcements/${deleteId}`);
      setSuccess(t('deleteSuccess'));
      setDeleteId(null);
      loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // ── Mark Read ───────────────────────────────────────

  const handleMarkRead = async (id: string) => {
    try {
      await api.post(`/api/v1/announcements/${id}/read`);
      loadAnnouncements();
    } catch {
      // silent
    }
  };

  // ── Edit ────────────────────────────────────────────

  const handleEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      message: a.message,
      department_id: a.department_id,
      is_pinned: a.is_pinned,
      audience: a.department_id ? 'department' : 'all',
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  // ── Render ──────────────────────────────────────────

  if (authLoading) return null;
  if (!isManager) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            {t('announcements')}
          </h2>
          <p className="text-muted-foreground mt-1">{total} total</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('create')}
        </Button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/20 p-4 text-sm text-danger">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md bg-success/10 border border-success/20 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Empty */}
      {!isLoading && announcements.length === 0 && (
        <EmptyState
          icon={<Megaphone className="h-12 w-12 text-muted-foreground/40" />}
          title={t('noAnnouncements')}
          action={{ label: t('create'), onClick: () => { setForm(EMPTY_FORM); setShowForm(true); } }}
        />
      )}

      {/* List */}
      {!isLoading && announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className={`card-hover ${a.is_pinned ? 'ring-1 ring-primary/20 border-primary/10' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.is_pinned && (
                        <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                          <Pin className="h-3 w-3 mr-1" />
                          {t('pinned')}
                        </Badge>
                      )}
                      {a.department_id && (
                        <Badge variant="info">
                          <Building2 className="h-3 w-3 mr-1" />
                          {a.department_name || 'Department'}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(a.created_at)}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-foreground mt-2">
                      {a.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                      {a.message}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {a.read_count !== undefined && a.target_count !== undefined && (
                        <span>
                          <Eye className="h-3 w-3 inline mr-1" />
                          {a.read_count}/{a.target_count} {t('readCount').toLowerCase()}
                        </span>
                      )}
                      {a.creator_name && (
                        <span>
                          {t('from')} {a.creator_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!a.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(a.id)} title={t('markRead')}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(a)} title={tc('edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)} title={tc('delete')}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingId ? t('edit') : t('create')}</CardTitle>
              <CardDescription>{t('message')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('title')}</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t('title')}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('message')}</label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={t('message')}
                  rows={5}
                />
              </div>

              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('audience')}</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={form.audience === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, audience: 'all', department_id: null }))}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    {t('all')}
                  </Button>
                  <Button
                    type="button"
                    variant={form.audience === 'department' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, audience: 'department' }))}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    {t('department')}
                  </Button>
                </div>
              </div>

              {/* Department selector */}
              {form.audience === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={form.department_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value || null }))}
                  >
                    <option value="">{tc('select')}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pinned toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_pinned: !f.is_pinned }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    form.is_pinned
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {form.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  {form.is_pinned ? t('pinned') : t('pinToDashboard')}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>{tc('cancel')}</Button>
                <Button onClick={handleSubmit} disabled={submitting || !form.title.trim() || !form.message.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? '...' : editingId ? tc('save') : t('create')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation ──────────────────────── */}
      <ConfirmDialog
        open={!!deleteId}
        title={t('confirmDelete')}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
