// Payroll API — payslip self-service
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  position_name?: string;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  payroll_type?: string;
  notes?: string;
  paid_by?: string;
  generated_by?: string;
  department_name: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  overtime_pay: number;
  late_deduction: number;
  absent_deduction: number;
  leave_deduction: number;
  reimbursement: number;
  allowances: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  created_at: string;
}

// ── API Functions ──────────────────────────────────────────────────────────────

export async function fetchMyPayslips(
  _tenant: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ data: PayrollRecord[]; total: number }> {
  const res = await api.get<{ data: PayrollRecord[]; total: number }>(
    `/api/v1/payroll/mine?limit=${limit}&offset=${offset}`
  );
  return res;
}

// ── Payroll Config ──────────────────────────────────────

export interface PayrollConfig {
  ptkp_status?: string;
  bpjs_kes?: boolean;
  bpjs_tk?: boolean;
  pph21_method?: string;
  [key: string]: any;
}

export async function fetchPayrollConfig(_tenant?: string): Promise<PayrollConfig> {
  return api.get<PayrollConfig>('/api/v1/payroll/config');
}

export async function updatePayrollConfig(config: PayrollConfig, _tenant?: string): Promise<PayrollConfig> {
  return api.put<PayrollConfig>('/api/v1/payroll/config', config);
}

// ── Manager Payroll ─────────────────────────────────────

export interface PayrollFilter {
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}

export async function fetchPayrolls(
  _tenant: string,
  yearOrFilter?: number | PayrollFilter,
  month?: number
): Promise<{ data: PayrollRecord[]; total: number; items?: PayrollRecord[] }> {
  let filter: PayrollFilter;
  if (typeof yearOrFilter === 'number') {
    filter = { year: yearOrFilter, month: month ?? new Date().getMonth() + 1 };
  } else {
    filter = yearOrFilter ?? {};
  }
  const params = new URLSearchParams();
  if (filter?.year) params.set('year', String(filter.year));
  if (filter?.month) params.set('month', String(filter.month));
  if (filter?.limit) params.set('limit', String(filter.limit));
  if (filter?.offset) params.set('offset', String(filter.offset));
  const qs = params.toString();
  const res = await api.get<{ data: PayrollRecord[]; total: number }>(`/api/v1/payroll${qs ? `?${qs}` : ''}`);
  return { ...res, items: res.data };
}

export async function generatePayroll(tenant: string, body: { year: number; month: number }): Promise<any> {
  return api.post('/api/v1/payroll/generate', body);
}

export async function approvePayroll(id: string, _tenant?: string): Promise<any> {
  return api.put(`/api/v1/payroll/${id}/approve`);
}

export async function markPaid(id: string, _tenant?: string): Promise<any> {
  return api.put(`/api/v1/payroll/${id}/paid`);
}
