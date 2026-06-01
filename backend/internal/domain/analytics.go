package domain

import "context"

// ── Analytics Summary ──────────────────────────────

type DepartmentDistribution struct {
	DepartmentName string `json:"department_name"`
	EmployeeCount  int    `json:"employee_count"`
}

type EmploymentTypeDistribution struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

type GenderDistribution struct {
	Gender string `json:"gender"`
	Count  int    `json:"count"`
}

type AttendanceTrendItem struct {
	Date    string `json:"date"`
	Present int    `json:"present"`
	Late    int    `json:"late"`
	Absent  int    `json:"absent"`
	HalfDay int    `json:"half_day"`
}

type AnalyticsSummary struct {
	TotalEmployees              int                        `json:"total_employees"`
	DepartmentDistribution      []DepartmentDistribution   `json:"department_distribution"`
	EmploymentTypeDistribution  []EmploymentTypeDistribution  `json:"employment_type_distribution"`
	GenderDistribution          []GenderDistribution       `json:"gender_distribution"`
	AttendanceTrend             []AttendanceTrendItem      `json:"attendance_trend"`
}

// ── Analytics Repository ───────────────────────────

type AnalyticsRepository interface {
	GetDepartmentDistribution(ctx context.Context, tenantID string) ([]DepartmentDistribution, error)
	GetEmploymentTypeDistribution(ctx context.Context, tenantID string) ([]EmploymentTypeDistribution, error)
	GetGenderDistribution(ctx context.Context, tenantID string) ([]GenderDistribution, error)
	GetAttendanceTrend(ctx context.Context, tenantID string, sinceDate string) ([]AttendanceTrendItem, error)
	GetTotalEmployees(ctx context.Context, tenantID string) (int, error)
}

// ── Analytics UseCase ──────────────────────────────

type AnalyticsUseCase interface {
	GetSummary(ctx context.Context, tenantID string) (*AnalyticsSummary, error)
}
