'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Plus,
  Package,
  Tag,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Calendar,
  Users,
  Briefcase,
  ArrowUpRight,
  Undo2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  fetchAssets,
  fetchAssetCategories,
  createAsset,
  updateAsset,
  deleteAsset,
  getAsset,
  assignAsset,
  returnAsset,
  fetchAssignments,
  type Asset,
  type AssetCategory,
  type AssetAssignment,
} from '@/lib/api-assets';

// ── Types ──────────────────────────────────────────────

interface AssetForm {
  category_id: string;
  asset_code: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: number | undefined;
  condition: string;
  status: string;
  notes: string;
}

interface AssignForm {
  employee_id: string;
  condition_at_assignment: string;
  notes: string;
}

const EMPTY_FORM: AssetForm = {
  category_id: '',
  asset_code: '',
  name: '',
  brand: '',
  model: '',
  serial_number: '',
  purchase_date: '',
  purchase_price: undefined,
  condition: 'good',
  status: 'available',
  notes: '',
};

const EMPTY_ASSIGN: AssignForm = {
  employee_id: '',
  condition_at_assignment: 'good',
  notes: '',
};

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

// ── Helpers ────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'available': return 'success';
    case 'assigned': return 'info';
    case 'maintenance': return 'warning';
    case 'retired': return 'danger';
    default: return 'default';
  }
}

function conditionBadgeColor(condition: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (condition) {
    case 'new': return 'success';
    case 'good': return 'default';
    case 'fair': return 'info';
    case 'poor': return 'warning';
    case 'damaged': return 'danger';
    default: return 'default';
  }
}

function formatCurrency(val: number | undefined | null): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// ── Page ───────────────────────────────────────────────

export default function AssetsPage() {
  const t = useTranslations('nav.assets');
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

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Categories
  const [categories, setCategories] = useState<AssetCategory[]>([]);

  // Modal state — Create/Edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignAssetId, setAssignAssetId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignForm>(EMPTY_ASSIGN);
  const [assigning, setAssigning] = useState(false);

  // Return confirmation
  const [returnId, setReturnId] = useState<string | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Load Data ──────────────────────────────────────

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category_id = filterCategory;
      if (search.trim()) params.search = search.trim();

      const [data, cats] = await Promise.all([
        fetchAssets({
          ...params,
          limit: 50,
        }),
        fetchAssetCategories().catch(() => [] as AssetCategory[]),
      ]);

      setAssets(data.data ?? []);
      setTotal(data.total ?? 0);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : te('fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterCategory, search, te]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // ── Detail ────────────────────────────────────────────

  const openDetail = async (id: string) => {
    setDetailId(id);
    setLoadingDetail(true);
    setDetailAsset(null);
    setAssignments([]);
    try {
      const [asset, assigns] = await Promise.all([
        getAsset(id),
        fetchAssignments({ asset_id: id, limit: 10 }),
      ]);
      setDetailAsset(asset);
      setAssignments(assigns.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Submit ──────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.asset_code.trim() || !form.category_id) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body = {
        category_id: form.category_id,
        asset_code: form.asset_code.trim(),
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        serial_number: form.serial_number.trim() || undefined,
        purchase_date: form.purchase_date || undefined,
        purchase_price: form.purchase_price ?? undefined,
        condition: form.condition,
        status: form.status || 'available',
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        await updateAsset(editingId, body);
        setSuccess(t('updateSuccess') || 'Asset updated successfully');
      } else {
        await createAsset(body);
        setSuccess(t('createSuccess') || 'Asset created successfully');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      loadAssets();
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
      await deleteAsset(deleteId);
      setSuccess(t('deleteSuccess') || 'Asset deleted successfully');
      setDeleteId(null);
      if (detailId === deleteId) {
        setDetailId(null);
        setDetailAsset(null);
      }
      loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // ── Edit ────────────────────────────────────────────

  const handleEdit = (a: Asset) => {
    setForm({
      category_id: a.category_id,
      asset_code: a.asset_code,
      name: a.name,
      brand: a.brand ?? '',
      model: a.model ?? '',
      serial_number: a.serial_number ?? '',
      purchase_date: a.purchase_date ?? '',
      purchase_price: a.purchase_price ?? undefined,
      condition: a.condition,
      status: a.status,
      notes: a.notes ?? '',
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  // ── Assign ──────────────────────────────────────────

  const openAssignModal = (assetId: string) => {
    setAssignAssetId(assetId);
    setAssignForm(EMPTY_ASSIGN);
    setShowAssign(true);
  };

  const handleAssign = async () => {
    if (!assignAssetId || !assignForm.employee_id.trim()) return;
    setAssigning(true);
    setError('');
    try {
      await assignAsset({
        asset_id: assignAssetId,
        employee_id: assignForm.employee_id.trim(),
        condition_at_assignment: assignForm.condition_at_assignment,
        notes: assignForm.notes.trim() || undefined,
      });
      setSuccess(t('assignSuccess') || 'Asset assigned successfully');
      setShowAssign(false);
      setAssignAssetId(null);
      setAssignForm(EMPTY_ASSIGN);
      loadAssets();
      if (detailId) openDetail(detailId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  // ── Return ──────────────────────────────────────────

  const handleReturn = async () => {
    if (!returnId) return;
    try {
      await returnAsset(returnId);
      setSuccess(t('returnSuccess') || 'Asset returned successfully');
      setReturnId(null);
      loadAssets();
      if (detailId) openDetail(detailId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return');
    }
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
            <Briefcase className="h-6 w-6" />
            {t('assets') || 'Asset Management'}
          </h2>
          <p className="text-muted-foreground mt-1">{tc('totalItems', { count: total })}</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('create') || 'Create Asset'}
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

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={tc('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={[
              { value: '', label: tc('all') + ' Status' },
              ...STATUS_OPTIONS,
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder={tc('all') + ' Status'}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={[
              { value: '', label: tc('all') + ' Category' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder={tc('all') + ' Category'}
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Empty */}
      {!isLoading && assets.length === 0 && (
        <EmptyState
          icon={<Package className="h-12 w-12 text-muted-foreground/40" />}
          title={t('noAssets') || 'No assets found'}
          action={{
            label: t('create') || 'Create Asset',
            onClick: () => {
              setForm(EMPTY_FORM);
              setShowForm(true);
            },
          }}
        />
      )}

      {/* List */}
      {!isLoading && assets.length > 0 && (
        <div className="space-y-4">
          {assets.map((a) => (
            <Card key={a.id} className="card-hover cursor-pointer" onClick={() => openDetail(a.id)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusBadgeVariant(a.status)}>
                        {a.status}
                      </Badge>
                      <Badge variant={conditionBadgeColor(a.condition)}>
                        {a.condition}
                      </Badge>
                      {a.category_name && (
                        <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                          <Tag className="h-3 w-3 mr-1" />
                          {a.category_name}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-foreground mt-2">
                      {a.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span>
                        <Package className="h-3 w-3 inline mr-1" />
                        {a.asset_code}
                      </span>
                      {a.brand && (
                        <span>{a.brand}{a.model ? ` - ${a.model}` : ''}</span>
                      )}
                      {a.serial_number && (
                        <span>SN: {a.serial_number}</span>
                      )}
                      <span>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(a.purchase_date)}
                      </span>
                      {a.current_holder && (
                        <span>
                          <Users className="h-3 w-3 inline mr-1" />
                          {a.current_holder}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {a.status === 'available' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssignModal(a.id)}
                        title={t('assign') || 'Assign'}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(a)}
                      title={tc('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(a.id)}
                      title={tc('delete')}
                    >
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
      <Dialog open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }}>
        <DialogHeader>
          <DialogTitle>
            {editingId ? (t('edit') || 'Edit Asset') : (t('create') || 'Create Asset')}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {/* Asset Code */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('assetCode') || 'Asset Code'} <span className="text-danger">*</span>
            </label>
            <Input
              value={form.asset_code}
              onChange={(e) => setForm((f) => ({ ...f, asset_code: e.target.value }))}
              placeholder="e.g. IT-001"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('name') || 'Name'} <span className="text-danger">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Asset name"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('category') || 'Category'} <span className="text-danger">*</span>
            </label>
            <Select
              options={[
                { value: '', label: tc('select') || 'Select...' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            />
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('brand') || 'Brand'}</label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('model') || 'Model'}</label>
              <Input
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('serialNumber') || 'Serial Number'}</label>
            <Input
              value={form.serial_number}
              onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
              placeholder="SN"
            />
          </div>

          {/* Purchase Date & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('purchaseDate') || 'Purchase Date'}</label>
              <Input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('purchasePrice') || 'Purchase Price'}</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.purchase_price ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('condition') || 'Condition'} <span className="text-danger">*</span>
            </label>
            <Select
              options={CONDITION_OPTIONS}
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('status') || 'Status'}</label>
            <Select
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes') || 'Notes'}</label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.name.trim() || !form.asset_code.trim() || !form.category_id}
          >
            {submitting
              ? tc('saving') || 'Saving...'
              : editingId
                ? (tc('save') || 'Save')
                : (t('create') || 'Create')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Detail Modal ─────────────────────────────── */}
      <Dialog open={!!detailId} onClose={() => { setDetailId(null); setDetailAsset(null); setAssignments([]); }}>
        <DialogHeader>
          <DialogTitle>
            {detailAsset ? detailAsset.name : (t('detail') || 'Asset Detail')}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {loadingDetail ? (
            <LoadingState />
          ) : detailAsset ? (
            <>
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('assetCode') || 'Asset Code'}</span>
                  <p className="font-medium">{detailAsset.asset_code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('category') || 'Category'}</span>
                  <p className="font-medium">{detailAsset.category_name || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('status') || 'Status'}</span>
                  <p>
                    <Badge variant={statusBadgeVariant(detailAsset.status)}>{detailAsset.status}</Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('condition') || 'Condition'}</span>
                  <p>
                    <Badge variant={conditionBadgeColor(detailAsset.condition)}>{detailAsset.condition}</Badge>
                  </p>
                </div>
                {detailAsset.brand && (
                  <div>
                    <span className="text-muted-foreground">{t('brand') || 'Brand'}</span>
                    <p className="font-medium">{detailAsset.brand}</p>
                  </div>
                )}
                {detailAsset.model && (
                  <div>
                    <span className="text-muted-foreground">{t('model') || 'Model'}</span>
                    <p className="font-medium">{detailAsset.model}</p>
                  </div>
                )}
                {detailAsset.serial_number && (
                  <div>
                    <span className="text-muted-foreground">{t('serialNumber') || 'Serial Number'}</span>
                    <p className="font-medium">{detailAsset.serial_number}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('purchaseDate') || 'Purchase Date'}</span>
                  <p className="font-medium">{formatDate(detailAsset.purchase_date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('purchasePrice') || 'Purchase Price'}</span>
                  <p className="font-medium">{formatCurrency(detailAsset.purchase_price)}</p>
                </div>
                {detailAsset.current_holder && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t('currentHolder') || 'Current Holder'}</span>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {detailAsset.current_holder}
                    </p>
                  </div>
                )}
              </div>

              {detailAsset.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">{t('notes') || 'Notes'}</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{detailAsset.notes}</p>
                </div>
              )}

              {/* Assignment History */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {t('assignmentHistory') || 'Assignment History'}
                </h4>
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noAssignments') || 'No assignments yet'}</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((as) => (
                      <div
                        key={as.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{as.employee_name || as.employee_id}</p>
                          <p className="text-muted-foreground text-xs">
                            {t('assignedAt') || 'Assigned'}: {formatDate(as.assigned_at)}
                            {as.returned_at && (
                              <> | {t('returnedAt') || 'Returned'}: {formatDate(as.returned_at)}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={conditionBadgeColor(as.condition_at_assignment)}>
                            {as.condition_at_assignment}
                          </Badge>
                          {!as.returned_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReturnId(as.id)}
                              title={t('return') || 'Return'}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {detailAsset.status === 'available' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setDetailId(null);
                      setDetailAsset(null);
                      setAssignments([]);
                      openAssignModal(detailAsset.id);
                    }}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    {t('assign') || 'Assign'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleEdit(detailAsset);
                    setDetailId(null);
                    setDetailAsset(null);
                    setAssignments([]);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  {tc('edit')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteId(detailId);
                    setDetailId(null);
                    setDetailAsset(null);
                    setAssignments([]);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {tc('delete')}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{tc('noData')}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Assign Modal ─────────────────────────────── */}
      <Dialog open={showAssign} onClose={() => { setShowAssign(false); setAssignAssetId(null); }}>
        <DialogHeader>
          <DialogTitle>{t('assign') || 'Assign Asset'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {/* Employee ID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('employee') || 'Employee'} <span className="text-danger">*</span>
            </label>
            <Input
              value={assignForm.employee_id}
              onChange={(e) => setAssignForm((f) => ({ ...f, employee_id: e.target.value }))}
              placeholder={t('employeeId') || 'Employee ID'}
            />
          </div>

          {/* Condition at assignment */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('conditionAtAssignment') || 'Condition at Assignment'}
            </label>
            <Select
              options={CONDITION_OPTIONS}
              value={assignForm.condition_at_assignment}
              onChange={(e) => setAssignForm((f) => ({ ...f, condition_at_assignment: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes') || 'Notes'}</label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
              value={assignForm.notes}
              onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowAssign(false); setAssignAssetId(null); }}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assigning || !assignForm.employee_id.trim()}
          >
            {assigning ? (tc('submitting') || 'Submitting...') : (t('assign') || 'Assign')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────── */}
      <ConfirmDialog
        open={!!deleteId}
        title={t('confirmDelete') || 'Delete this asset?'}
        message={tc('confirmDeleteMessage')}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />

      {/* ── Return Confirmation ──────────────────────── */}
      <ConfirmDialog
        open={!!returnId}
        title={t('confirmReturn') || 'Return this asset?'}
        message={t('confirmReturnDesc') || 'Mark this assignment as returned?'}
        onConfirm={handleReturn}
        onClose={() => setReturnId(null)}
      />
    </div>
  );
}
