import { api } from '@/lib/api';

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department_name: string;
  position_name: string;
  period_year: number;
  period_month: number;
  base_salary: number;
  overtime_pay: number;
  late_deduction: number;
  absent_deduction: number;
  leave_deduction: number;
  reimbursement: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export interface PayrollConfig {
  id: string;
  tenant_id: string;
  daily_salary_ratio: number;
  late_penalty_amount: number;
  absent_penalty_amount: number;
  overtime_rate: number;
}

interface PaginatedPayroll {
  items: PayrollRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface GeneratePayrollData {
  period_year: number;
  period_month: number;
  employee_ids?: string[];
}

export async function generatePayroll(
  _tenant: string,
  data: GeneratePayrollData
): Promise<PayrollRecord[]> {
  return api.post<PayrollRecord[]>('/api/v1/payroll/generate', data);
}

export async function fetchPayrolls(
  _tenant: string,
  year?: number,
  month?: number,
  limit = 50,
  offset = 0
): Promise<PaginatedPayroll> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return api.get<PaginatedPayroll>(`/api/v1/payroll?${params.toString()}`);
}

export async function fetchPayrollByID(
  _tenant: string,
  id: string
): Promise<PayrollRecord> {
  return api.get<PayrollRecord>(`/api/v1/payroll/${id}`);
}

export async function approvePayroll(
  _tenant: string,
  id: string
): Promise<void> {
  return api.put(`/api/v1/payroll/${id}/approve`);
}

export async function markPaid(
  _tenant: string,
  id: string
): Promise<void> {
  return api.put(`/api/v1/payroll/${id}/paid`);
}

export async function fetchPayrollConfig(
  _tenant: string
): Promise<PayrollConfig> {
  return api.get<PayrollConfig>('/api/v1/payroll/config');
}

export async function updatePayrollConfig(
  _tenant: string,
  data: Partial<PayrollConfig>
): Promise<PayrollConfig> {
  return api.put<PayrollConfig>('/api/v1/payroll/config', data);
}
