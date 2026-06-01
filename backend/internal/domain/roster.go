package domain

import "context"

// ── Roster ─────────────────────────────────────────

type RosterEmployee struct {
	ID             string `json:"id"`
	EmployeeCode   string `json:"employee_code"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	DepartmentName string `json:"department_name,omitempty"`
}

type RosterAssignment struct {
	ID            string  `json:"id"`
	EmployeeID    string  `json:"employee_id"`
	ShiftID       string  `json:"shift_id"`
	ShiftName     string  `json:"shift_name"`
	ShiftCode     string  `json:"shift_code"`
	StartTime     string  `json:"start_time"`
	EndTime       string  `json:"end_time"`
	Color         string  `json:"color"`
	Date          string  `json:"date"`
	EffectiveFrom string  `json:"effective_from"`
	EffectiveTo   *string `json:"effective_to,omitempty"`
}

type RosterResponse struct {
	Employees   []RosterEmployee   `json:"employees"`
	Assignments []RosterAssignment `json:"assignments"`
}

// ── Roster Repository ──────────────────────────────

type RosterRepository interface {
	GetEmployees(ctx context.Context, tenantID string) ([]RosterEmployee, error)
	GetAssignments(ctx context.Context, tenantID string, dateFrom, dateTo string) ([]RosterAssignment, error)
}

// ── Roster UseCase ─────────────────────────────────

type RosterUseCase interface {
	GetRoster(ctx context.Context, tenantID string, dateFrom, dateTo string) (*RosterResponse, error)
}
