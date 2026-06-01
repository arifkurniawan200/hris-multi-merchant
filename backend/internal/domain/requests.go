package domain

// ── Auth request DTOs ─────────────────────────────

type RegisterRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required,min=8"`
	FullName   string `json:"full_name" validate:"required,min=2"`
	TenantCode string `json:"tenant_code" validate:"required,min=2"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// ── Tenant request DTOs ──────────────────────────

type CreateTenantRequest struct {
	Name             string `json:"name" validate:"required,min=2"`
	Slug             string `json:"slug" validate:"required,slug"`
	Plan             string `json:"plan" validate:"required,oneof=free pro enterprise"`
	PricePerEmployee int64  `json:"price_per_employee"`
}

type UpdateTenantRequest struct {
	Name             string `json:"name,omitempty" validate:"omitempty,min=2"`
	Slug             string `json:"slug,omitempty" validate:"omitempty,slug"`
	Plan             string `json:"plan,omitempty" validate:"omitempty,oneof=free pro enterprise"`
	PricePerEmployee int64  `json:"price_per_employee,omitempty"`
}

type ExtendTenantRequest struct {
	Months int `json:"months" validate:"required,min=1,max=36"`
}

type ChangePlanRequest struct {
	Plan             string `json:"plan" validate:"required,oneof=free pro enterprise"`
	PricePerEmployee int64  `json:"price_per_employee"`
}

// ── Department request DTOs ──────────────────────

type CreateDepartmentRequest struct {
	TenantID    string  `json:"tenant_id" validate:"required,uuid"`
	ParentID    *string `json:"parent_id"`
	Name        string  `json:"name" validate:"required,min=2"`
	Code        string  `json:"code" validate:"required,min=2"`
	Description string  `json:"description"`
	ManagerID   *string `json:"manager_id"`
}

// ── Position request DTOs ────────────────────────

type CreatePositionRequest struct {
	TenantID    string `json:"tenant_id" validate:"required,uuid"`
	Name        string `json:"name" validate:"required,min=2"`
	Code        string `json:"code" validate:"required,min=2"`
	Description string `json:"description"`
	Grade       string `json:"grade" validate:"omitempty,oneof=I II III IV V VI VII VIII IX X"`
	MinSalary   int64  `json:"min_salary"`
	MaxSalary   int64  `json:"max_salary"`
}

// ── Employee request DTOs ────────────────────────

type CreateEmployeeRequest struct {
	TenantID         string  `json:"tenant_id" validate:"required,uuid"`
	EmployeeCode     string  `json:"employee_code" validate:"required,min=2"`
	FirstName        string  `json:"first_name" validate:"required,min=2"`
	LastName         string  `json:"last_name"`
	Gender           string  `json:"gender" validate:"omitempty,oneof=male female"`
	BirthDate        *string `json:"birth_date"`
	BirthPlace       string  `json:"birth_place"`
	Email            string  `json:"email" validate:"required,email"`
	Phone            string  `json:"phone"`
	Address          string  `json:"address"`
	DepartmentID     *string `json:"department_id"`
	PositionID       *string `json:"position_id"`
	ManagerID        *string `json:"manager_id"`
	EmploymentStatus string  `json:"employment_status" validate:"required,oneof=active probation resigned terminated suspended"`
	EmploymentType   string  `json:"employment_type" validate:"required,oneof=permanent contract intern daily freelancer"`
	JoinDate         string  `json:"join_date" validate:"required"`
	ContractStart    *string `json:"contract_start"`
	ContractEnd      *string `json:"contract_end"`
	NationalID       string  `json:"national_id"`
	TaxID            string  `json:"tax_id"`
	BPJSHealth       string  `json:"bpjs_health"`
	BPJSLabor        string  `json:"bpjs_labor"`
	BaseSalary       int64   `json:"base_salary"`
	BankName         string  `json:"bank_name"`
	BankAccount      string  `json:"bank_account"`
	CustomFields     JSONB   `json:"custom_fields"`
	Notes            string  `json:"notes"`
}

// ── Attendance request DTOs ─────────────────────

type ClockInRequest struct {
	EmployeeID string   `json:"employee_id,omitempty"` // optional — resolved from JWT
	UserID     string   `json:"-"`                      // set by handler from JWT context
	TenantID   string   `json:"tenant_id" validate:"required,uuid"`
	Latitude   *float64 `json:"latitude,omitempty"`
	Longitude  *float64 `json:"longitude,omitempty"`
	SelfieURL  string   `json:"selfie_url,omitempty"`
	Notes      string   `json:"notes,omitempty"`
}

type ClockOutRequest struct {
	EmployeeID string `json:"employee_id,omitempty"` // optional — resolved from JWT
	UserID     string `json:"-"`                      // set by handler from JWT context
	TenantID   string `json:"tenant_id" validate:"required,uuid"`
	Notes      string `json:"notes,omitempty"`
}

// ── Employee change status ───────────────────────

type ChangeEmployeeStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=active probation resigned terminated suspended"`
}

// ── Shift request DTOs ──────────────────────────

type CreateShiftRequest struct {
	TenantID            string `json:"tenant_id" validate:"required,uuid"`
	Name                string `json:"name" validate:"required,min=2"`
	Code                string `json:"code" validate:"required,min=2"`
	StartTime           string `json:"start_time" validate:"required"`           // "07:00"
	EndTime             string `json:"end_time" validate:"required"`             // "15:00"
	GraceMinutes        int    `json:"grace_minutes"`
	ClockinWindowBefore int    `json:"clockin_window_before_minutes"`
	ClockoutWindowAfter int    `json:"clockout_window_after_minutes"`
	IsFlexible          bool   `json:"is_flexible"`
	Color               string `json:"color,omitempty"`
}

// ── EmployeeShift request DTOs ──────────────────

type AssignShiftRequest struct {
	EmployeeID    string  `json:"employee_id" validate:"required,uuid"`
	ShiftID       string  `json:"shift_id" validate:"required,uuid"`
	EffectiveFrom string  `json:"effective_from" validate:"required"` // "2006-01-02"
	EffectiveTo   *string `json:"effective_to,omitempty"`
}

type BulkAssignShiftRequest struct {
	ShiftID       string   `json:"shift_id" validate:"required,uuid"`
	EmployeeIDs   []string `json:"employee_ids" validate:"required,min=1,dive,uuid"`
	EffectiveFrom string   `json:"effective_from" validate:"required"`
	EffectiveTo   *string  `json:"effective_to,omitempty"`
}

// ── Leave request DTOs ───────────────────────────

type CreateLeaveRequest struct {
	TenantID    string  `json:"tenant_id" validate:"required,uuid"`
	UserID      string  `json:"-"`                          // set by handler from JWT
	LeaveTypeID string  `json:"leave_type_id" validate:"required,uuid"`
	StartDate   string  `json:"start_date" validate:"required"`   // "2006-01-02"
	EndDate     string  `json:"end_date" validate:"required"`     // "2006-01-02"
	TotalDays   float64 `json:"total_days" validate:"required,min=0.5"`
	Reason      string  `json:"reason" validate:"required,min=10"`
}

type CreateLeaveTypeRequest struct {
	TenantID           string `json:"tenant_id" validate:"required,uuid"`
	Name               string `json:"name" validate:"required,min=2"`
	Code               string `json:"code" validate:"required,min=2"`
	DefaultDaysPerYear int    `json:"default_days_per_year"`
	MaxConsecutiveDays int    `json:"max_consecutive_days"`
	IsPaid             bool   `json:"is_paid"`
	Color              string `json:"color,omitempty"`
	Description        string `json:"description,omitempty"`
}

type ApproveLeaveRequest struct {
	ReviewedBy string `json:"-"` // set by handler from JWT → employee ID
}
type RejectLeaveRequest struct {
	ReviewedBy string `json:"-"`                             // set by handler
	Reason     string `json:"reason" validate:"required,min=10"`
}

// ── Overtime request DTOs ─────────────────────────

type SubmitOvertimeRequest struct {
	TenantID   string  `json:"tenant_id" validate:"required,uuid"`
	UserID     string  `json:"-"` // set by handler from JWT
	Date       string  `json:"date" validate:"required"`
	StartTime  string  `json:"start_time" validate:"required"`
	EndTime    string  `json:"end_time" validate:"required"`
	TotalHours float64 `json:"total_hours" validate:"required,min=0.5"`
	Reason     string  `json:"reason" validate:"required,min=5"`
}

type ApproveOvertimeRequest struct {
	ReviewedBy string `json:"-"` // set by handler
}

type RejectOvertimeRequest struct {
	ReviewedBy string `json:"-"`                             // set by handler
	Reason     string `json:"reason" validate:"required,min=5"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
}

// ── Bulk Import ─────────────────────────────────────

type BulkImportResult struct {
	Total    int           `json:"total"`
	Imported int           `json:"imported"`
	Errors   []ImportError `json:"errors"`
}

type ImportError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

// ── Profile request DTOs ──────────────────────────

type UpdateProfileRequest struct {
	FullName string `json:"full_name" validate:"required,min=2"`
	Phone    string `json:"phone"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required,min=8"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}
