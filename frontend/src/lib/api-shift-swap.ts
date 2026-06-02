import { api } from '@/lib/api';

export interface ShiftSwap {
  id: string;
  tenant_id: string;
  requester_employee_id: string;
  requester_date: string;
  target_employee_id: string;
  target_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  requester_name: string;
  requester_code: string;
  target_name: string;
  target_code: string;
}

export interface CreateShiftSwapRequest {
  target_employee_id: string;
  requester_date: string;
  target_date: string;
  reason: string;
}

// ── Employee endpoints ──

export async function fetchMyShiftSwaps(): Promise<ShiftSwap[]> {
  return api.get<ShiftSwap[]>('/api/v1/shift-swaps/my');
}

export async function createShiftSwap(data: CreateShiftSwapRequest): Promise<ShiftSwap> {
  return api.post<ShiftSwap>('/api/v1/shift-swaps', data);
}

export async function cancelShiftSwap(id: string): Promise<void> {
  return api.put(`/api/v1/shift-swaps/${id}/cancel`);
}

// ── Manager endpoints ──

export async function fetchPendingShiftSwaps(_tenant: string): Promise<ShiftSwap[]> {
  return api.get<ShiftSwap[]>('/api/v1/shift-swaps/pending');
}

export async function fetchAllShiftSwaps(_tenant: string, status?: string): Promise<ShiftSwap[]> {
  const params = status ? `?status=${status}` : '';
  return api.get<ShiftSwap[]>(`/api/v1/shift-swaps${params}`);
}

export async function approveShiftSwap(id: string): Promise<void> {
  return api.put(`/api/v1/shift-swaps/${id}/approve`);
}

export async function rejectShiftSwap(id: string, rejectionReason: string): Promise<void> {
  return api.put(`/api/v1/shift-swaps/${id}/reject`, {
    rejection_reason: rejectionReason,
  });
}
