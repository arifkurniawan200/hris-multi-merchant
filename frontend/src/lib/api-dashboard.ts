// Dashboard API — aggregates data from existing HRIS endpoints
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  employee_name: string;
  employee_code: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: string;
  notes?: string;
}

export interface AttendanceReport {
  total: number;
  present: number;
  late: number;
  absent: number;
  half_day?: number;
  data: AttendanceRecord[];
}

export interface Employee {
  id: string;
  name: string;
  code: string;
  department?: string;
  status?: string;
}

export interface PendingItem {
  id: string;
  employee_name: string;
  type?: string;
  reason?: string;
  amount?: number;
  days?: number;
  status: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_name: string;
  gross_salary: number;
  net_salary: number;
  deductions: number;
  status: string;
}

export interface DashboardSummary {
  employeeCount: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  todayTotalAttendance: number;
  pendingLeaves: number;
  pendingOvertime: number;
  pendingReimbursements: number;
  pendingApprovalsTotal: number;
  thisMonthPayroll: number;
  payrollCount: number;
}

export interface PendingApprovals {
  leaves: { count: number; items: PendingItem[] };
  overtime: { count: number; items: PendingItem[] };
  reimbursements: { count: number; items: PendingItem[] };
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function currentMonthYear(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ── API Functions ──────────────────────────────────────────────────────────────

/**
 * Fetch all key dashboard metrics by calling multiple endpoints in parallel.
 * Returns a ready-to-render DashboardSummary.
 */
export async function fetchDashboardSummary(
  _tenant?: string
): Promise<DashboardSummary> {
  const today = todayDate();
  const { year, month } = currentMonthYear();

  const [empRes, attRes, leavesRes, overtimeRes, reimbursementsRes, payrollRes] =
    await Promise.allSettled([
      api.get<{ data: Employee[] } | any>(`/api/v1/employees?limit=100`),
      api.get<AttendanceReport>(`/api/v1/attendance/report?date=${today}`),
      api.get<{ data: PendingItem[] } | any>(`/api/v1/leaves/pending?limit=100`),
      api.get<{ data: PendingItem[] } | any>(`/api/v1/overtime/pending`),
      api.get<{ data: PendingItem[] } | any>(`/api/v1/reimbursements/pending`),
      api.get<{ data: PayrollRecord[] } | any>(
        `/api/v1/payroll?year=${year}&month=${month}`
      ),
    ]);

  // Employees
  let employeeCount = 0;
  if (empRes.status === 'fulfilled') {
    const empData = empRes.value;
    employeeCount = Array.isArray(empData)
      ? empData.length
      : empData?.data
        ? (Array.isArray(empData.data) ? empData.data.length : 0)
        : 0;
  }

  // Attendance
  let todayPresent = 0;
  let todayLate = 0;
  let todayAbsent = 0;
  let todayTotalAttendance = 0;
  if (attRes.status === 'fulfilled') {
    const a = attRes.value;
    todayPresent = a.present ?? 0;
    todayLate = a.late ?? 0;
    todayAbsent = a.absent ?? 0;
    todayTotalAttendance = a.total ?? 0;
  }

  // Pending leaves
  let pendingLeaves = 0;
  if (leavesRes.status === 'fulfilled') {
    const ld = leavesRes.value;
    if (Array.isArray(ld)) {
      pendingLeaves = ld.length;
    } else if (ld?.data && Array.isArray(ld.data)) {
      pendingLeaves = ld.data.length;
    } else if (ld?.total !== undefined) {
      pendingLeaves = ld.total;
    }
  }

  // Pending overtime
  let pendingOvertime = 0;
  if (overtimeRes.status === 'fulfilled') {
    const od = overtimeRes.value;
    if (Array.isArray(od)) {
      pendingOvertime = od.length;
    } else if (od?.data && Array.isArray(od.data)) {
      pendingOvertime = od.data.length;
    } else if (od?.total !== undefined) {
      pendingOvertime = od.total;
    }
  }

  // Pending reimbursements
  let pendingReimbursements = 0;
  if (reimbursementsRes.status === 'fulfilled') {
    const rd = reimbursementsRes.value;
    if (Array.isArray(rd)) {
      pendingReimbursements = rd.length;
    } else if (rd?.data && Array.isArray(rd.data)) {
      pendingReimbursements = rd.data.length;
    } else if (rd?.total !== undefined) {
      pendingReimbursements = rd.total;
    }
  }

  // Payroll
  let thisMonthPayroll = 0;
  let payrollCount = 0;
  if (payrollRes.status === 'fulfilled') {
    const pd = payrollRes.value;
    const records: PayrollRecord[] = Array.isArray(pd)
      ? pd
      : pd?.data
        ? (Array.isArray(pd.data) ? pd.data : [])
        : [];
    payrollCount = records.length;
    thisMonthPayroll = records.reduce(
      (sum, r) => sum + (r.net_salary ?? r.gross_salary ?? 0),
      0
    );
  }

  const pendingApprovalsTotal =
    pendingLeaves + pendingOvertime + pendingReimbursements;

  return {
    employeeCount,
    todayPresent,
    todayLate,
    todayAbsent,
    todayTotalAttendance,
    pendingLeaves,
    pendingOvertime,
    pendingReimbursements,
    pendingApprovalsTotal,
    thisMonthPayroll,
    payrollCount,
  };
}

/**
 * Fetch attendance data for a date range (trend visualization).
 */
export async function fetchAttendanceTrend(
  _tenant: string,
  dateFrom: string,
  dateTo: string
): Promise<AttendanceReport | null> {
  try {
    const data = await api.get<AttendanceReport>(
      `/api/v1/attendance/export?date_from=${dateFrom}&date_to=${dateTo}`
    );
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch aggregated pending approvals (leaves, overtime, reimbursements).
 */
export async function fetchPendingApprovals(
  _tenant?: string
): Promise<PendingApprovals> {
  const [leavesRes, overtimeRes, reimbursementsRes] = await Promise.allSettled([
    api.get<{ data: PendingItem[] } | any>(`/api/v1/leaves/pending?limit=100`),
    api.get<{ data: PendingItem[] } | any>(`/api/v1/overtime/pending`),
    api.get<{ data: PendingItem[] } | any>(`/api/v1/reimbursements/pending`),
  ]);

  const extractItems = (
    res: PromiseSettledResult<any>
  ): PendingItem[] => {
    if (res.status !== 'fulfilled') return [];
    const d = res.value;
    if (Array.isArray(d)) return d;
    if (d?.data && Array.isArray(d.data)) return d.data;
    return [];
  };

  const leaves = extractItems(leavesRes);
  const overtime = extractItems(overtimeRes);
  const reimbursements = extractItems(reimbursementsRes);

  return {
    leaves: { count: leaves.length, items: leaves },
    overtime: { count: overtime.length, items: overtime },
    reimbursements: { count: reimbursements.length, items: reimbursements },
    total: leaves.length + overtime.length + reimbursements.length,
  };
}
