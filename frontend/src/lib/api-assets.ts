// Asset Management API
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AssetCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  tenant_id: string;
  category_id: string;
  asset_code: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  condition: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  current_holder?: string;
}

export interface AssetAssignment {
  id: string;
  tenant_id: string;
  asset_id: string;
  employee_id: string;
  assigned_by: string;
  assigned_at: string;
  returned_at?: string;
  condition_at_assignment: string;
  condition_at_return?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  asset_name?: string;
  asset_code?: string;
  employee_name?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Category API ────────────────────────────────────────────────────────────────

export async function fetchAssetCategories(): Promise<AssetCategory[]> {
  const res = await api.get<AssetCategory[]>('/api/v1/assets/categories');
  return res;
}

export async function createAssetCategory(data: { name: string; description?: string }): Promise<AssetCategory> {
  return api.post<AssetCategory>('/api/v1/assets/categories', data);
}

export async function updateAssetCategory(id: string, data: { name?: string; description?: string }): Promise<AssetCategory> {
  return api.put<AssetCategory>(`/api/v1/assets/categories/${id}`, data);
}

export async function deleteAssetCategory(id: string): Promise<void> {
  await api.del(`/api/v1/assets/categories/${id}`);
}

// ── Asset API ───────────────────────────────────────────────────────────────────

export async function fetchAssets(params?: {
  category_id?: string;
  status?: string;
  condition?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<Asset>> {
  const searchParams = new URLSearchParams();
  if (params?.category_id) searchParams.set('category_id', params.category_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.condition) searchParams.set('condition', params.condition);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  return api.get<PaginatedResponse<Asset>>(`/api/v1/assets${qs ? `?${qs}` : ''}`);
}

export async function getAsset(id: string): Promise<Asset> {
  return api.get<Asset>(`/api/v1/assets/${id}`);
}

export async function createAsset(data: {
  category_id: string;
  asset_code: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  condition: string;
  status?: string;
  notes?: string;
}): Promise<Asset> {
  return api.post<Asset>('/api/v1/assets', data);
}

export async function updateAsset(id: string, data: Partial<{
  category_id: string;
  asset_code: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: number;
  condition: string;
  status: string;
  notes: string;
}>): Promise<Asset> {
  return api.put<Asset>(`/api/v1/assets/${id}`, data);
}

export async function deleteAsset(id: string): Promise<void> {
  await api.del(`/api/v1/assets/${id}`);
}

// ── Assignment API ──────────────────────────────────────────────────────────────

export async function assignAsset(data: {
  asset_id: string;
  employee_id: string;
  condition_at_assignment: string;
  notes?: string;
}): Promise<AssetAssignment> {
  return api.post<AssetAssignment>(`/api/v1/assets/${data.asset_id}/assign`, data);
}

export async function returnAsset(assignmentId: string, data?: {
  returned_at?: string;
  condition_at_return?: string;
  notes?: string;
}): Promise<AssetAssignment> {
  return api.put<AssetAssignment>(`/api/v1/assets/assignments/${assignmentId}/return`, data || {});
}

export async function fetchAssignments(params?: {
  asset_id?: string;
  employee_id?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<AssetAssignment>> {
  const searchParams = new URLSearchParams();
  if (params?.asset_id) searchParams.set('asset_id', params.asset_id);
  if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
  if (params?.active) searchParams.set('active', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  return api.get<PaginatedResponse<AssetAssignment>>(`/api/v1/assets/assignments${qs ? `?${qs}` : ''}`);
}

// ── Employee Self-Service ────────────────────────────────────────────────────────

export async function fetchMyAssets(): Promise<AssetAssignment[]> {
  return api.get<AssetAssignment[]>('/api/v1/assets/mine');
}
