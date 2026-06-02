import { api } from '@/lib/api';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  date: string;
  clock_in: string | null;
  clock_in_status: string | null;
  clock_out: string | null;
  clock_out_status: string | null;
  status: string;
  total_hours: number | null;
}

export interface PendingCorrection {
  id: string;
  tenant_id: string;
  employee_id: string;
  attendance_id: string;
  type: 'clock_in' | 'clock_out' | 'both';
  clock_date: string;
  current_clock_in: string | null;
  requested_clock_in: string | null;
  current_clock_out: string | null;
  requested_clock_out: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_code: string;
  approved_by: string | null;
  approved_at: string | null;
  reject_reason: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

interface BackendReport<T> {
  total: number;
  data: T[];
  limit: number;
  offset: number;
}

export async function fetchAttendanceReport(
  tenant: string,
  date: string,
  limit = 50,
  offset = 0
): Promise<PaginatedResponse<AttendanceRecord>> {
  return api.get<PaginatedResponse<AttendanceRecord>>(
    `/api/v1/attendance/report?date=${date}&limit=${limit}&offset=${offset}`
  );
}

export async function requestCorrection(
  tenant: string,
  data: {
    attendance_id: string;
    type: 'clock_in' | 'clock_out' | 'both';
    requested_clock_in?: string;
    requested_clock_out?: string;
    reason: string;
  }
): Promise<PendingCorrection> {
  return api.post<PendingCorrection>('/api/v1/attendance/corrections', data);
}

export async function fetchPendingCorrections(
  tenant: string,
  limit = 50,
  offset = 0
): Promise<{ total: number; data: PendingCorrection[]; limit: number; offset: number }> {
  return api.get<BackendReport<PendingCorrection>>(
    `/api/v1/attendance/corrections/pending?limit=${limit}&offset=${offset}`
  );
}

export async function approveCorrection(
  tenant: string,
  id: string
): Promise<void> {
  return api.put(`/api/v1/attendance/corrections/${id}/approve`);
}

export async function rejectCorrection(
  tenant: string,
  id: string,
  rejectReason: string
): Promise<void> {
  return api.put(`/api/v1/attendance/corrections/${id}/reject`, {
    reject_reason: rejectReason,
  });
}
