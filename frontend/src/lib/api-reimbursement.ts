import { api } from '@/lib/api';

export interface ReimbursementType {
  id: string;
  name: string;
  code: string;
  description?: string;
  max_amount?: number;
  created_at: string;
}

export interface Reimbursement {
  id: string;
  employee_id?: string;
  employee_name?: string;
  type_id: string;
  type_name?: string;
  amount: number;
  description: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  created_at: string;
  updated_at?: string;
}

interface PaginatedReimbursements {
  items: Reimbursement[];
  total: number;
  limit: number;
  offset: number;
}

// Reimbursement Types (manager+)
export async function fetchReimbursementTypes(
  _tenant: string
): Promise<ReimbursementType[]> {
  return api.get<ReimbursementType[]>('/api/v1/reimbursements/types');
}

export async function createReimbursementType(
  _tenant: string,
  data: {
    name: string;
    code: string;
    description?: string;
    max_amount?: number;
  }
): Promise<ReimbursementType> {
  return api.post<ReimbursementType>('/api/v1/reimbursements/types', data);
}

export async function updateReimbursementType(
  _tenant: string,
  id: string,
  data: {
    name: string;
    code: string;
    description?: string;
    max_amount?: number;
  }
): Promise<ReimbursementType> {
  return api.put<ReimbursementType>(`/api/v1/reimbursements/types/${id}`, data);
}

export async function deleteReimbursementType(
  _tenant: string,
  id: string
): Promise<void> {
  return api.del(`/api/v1/reimbursements/types/${id}`);
}

// Reimbursement submission (employee+)
export async function submitReimbursement(
  _tenant: string,
  data: {
    type_id: string;
    amount: number;
    description: string;
    receipt_url?: string;
  }
): Promise<Reimbursement> {
  return api.post<Reimbursement>('/api/v1/reimbursements', data);
}

export async function fetchMyReimbursements(
  _tenant: string,
  limit = 50,
  offset = 0
): Promise<PaginatedReimbursements> {
  return api.get<PaginatedReimbursements>(
    `/api/v1/reimbursements/my?limit=${limit}&offset=${offset}`
  );
}

// Reimbursement management (manager+)
export async function fetchAllReimbursements(
  _tenant: string,
  status?: string,
  limit = 50,
  offset = 0
): Promise<PaginatedReimbursements> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return api.get<PaginatedReimbursements>(
    `/api/v1/reimbursements?${params.toString()}`
  );
}

export async function fetchPendingReimbursements(
  _tenant: string,
  limit = 50,
  offset = 0
): Promise<PaginatedReimbursements> {
  return api.get<PaginatedReimbursements>(
    `/api/v1/reimbursements/pending?limit=${limit}&offset=${offset}`
  );
}

export async function approveReimbursement(
  _tenant: string,
  id: string
): Promise<void> {
  return api.put(`/api/v1/reimbursements/${id}/approve`);
}

export async function rejectReimbursement(
  _tenant: string,
  id: string,
  rejectReason: string
): Promise<void> {
  return api.put(`/api/v1/reimbursements/${id}/reject`, {
    reject_reason: rejectReason,
  });
}
