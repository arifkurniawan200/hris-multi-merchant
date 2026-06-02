package domain

import (
	"context"
	"time"
)

// ── Dashboard Summary ──────────────────────────────

type DashboardSummary struct {
	TodayStats       *TodayStats        `json:"today_stats,omitempty"`
	PendingApprovals *PendingCounts     `json:"pending_approvals,omitempty"`
	RecentAttendance []AttendanceRecord `json:"recent_attendance"`
}

type TodayStats struct {
	TotalEmployees int `json:"total_employees"`
	PresentCount   int `json:"present_count"`
	LateCount      int `json:"late_count"`
	AbsentCount    int `json:"absent_count"`
	OnLeaveCount   int `json:"on_leave_count"`
}

type PendingCounts struct {
	Corrections    int `json:"corrections"`
	Leaves         int `json:"leaves"`
	Overtime       int `json:"overtime"`
	Reimbursements int `json:"reimbursements"`
	ShiftSwaps     int `json:"shift_swaps"`
}

type AttendanceRecord struct {
	ID           string     `json:"id"`
	EmployeeID   string     `json:"employee_id"`
	EmployeeName string     `json:"employee_name,omitempty"`
	EmployeeCode string     `json:"employee_code,omitempty"`
	ClockIn      time.Time  `json:"clock_in"`
	ClockOut     *time.Time `json:"clock_out,omitempty"`
	ClockDate    string     `json:"clock_date"`
	Status       string     `json:"status"`
}

// ── Dashboard Repository ───────────────────────────

type DashboardRepository interface {
	GetTodayAttendanceStats(ctx context.Context, tenantID string) (*TodayStats, error)
	GetPendingCounts(ctx context.Context, tenantID string) (*PendingCounts, error)
	GetRecentAttendance(ctx context.Context, tenantID string, limit int) ([]AttendanceRecord, error)
	GetEmployeeRecentAttendance(ctx context.Context, employeeID string, limit int) ([]AttendanceRecord, error)
}

// ── Dashboard UseCase ──────────────────────────────

type DashboardUseCase interface {
	GetSummary(ctx context.Context, tenantID string, userID string, role string) (*DashboardSummary, error)
}
