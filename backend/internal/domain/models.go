package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ── Tenant ──────────────────────────────────────
type Tenant struct {
	ID                     string     `json:"id" validate:"required,uuid"`
	Name                   string     `json:"name" validate:"required,min=2"`
	Slug                   string     `json:"slug" validate:"required,slug"`
	Plan                   string     `json:"plan" validate:"required,oneof=free pro enterprise"`
	PlanPricePerEmployee   int64      `json:"plan_price_per_employee"`
	SubscriptionExpiresAt  *time.Time `json:"subscription_expires_at,omitempty"`
	IsActive               bool       `json:"is_active"`
	MaxEmployees           int        `json:"max_employees"`
	Settings               JSONB      `json:"settings"`
	LogoURL                string     `json:"logo_url"`
	CreatedAt              time.Time  `json:"created_at"`
	DeletedAt              *time.Time `json:"deleted_at,omitempty"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id string) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	Update(ctx context.Context, tenant *Tenant) error
	List(ctx context.Context, limit, offset int) ([]Tenant, error)
	Activate(ctx context.Context, id string) error
	Deactivate(ctx context.Context, id string) error
	Extend(ctx context.Context, id string, months int) error
	ChangePlan(ctx context.Context, id, plan string, pricePerEmployee int64) error
	SoftDelete(ctx context.Context, id string) error
}

type TenantUseCase interface {
	CreateTenant(ctx context.Context, req *CreateTenantRequest) (*Tenant, error)
	GetTenant(ctx context.Context, id string) (*Tenant, error)
	UpdateTenant(ctx context.Context, t *Tenant) error
	ListTenants(ctx context.Context) ([]Tenant, error)
	ActivateTenant(ctx context.Context, id string) error
	DeactivateTenant(ctx context.Context, id string) error
	ExtendTenant(ctx context.Context, id string, months int) error
	ChangePlan(ctx context.Context, id string, req *ChangePlanRequest) error
	SoftDeleteTenant(ctx context.Context, id string) error
}

// ── User ────────────────────────────────────────
type User struct {
	ID           string     `json:"id" validate:"required,uuid"`
	Email        string     `json:"email" validate:"required,email"`
	PasswordHash string     `json:"-" validate:"required"`
	FullName     string     `json:"full_name" validate:"required,min=2"`
	Phone        string     `json:"phone"`
	AvatarURL    string     `json:"avatar_url"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	UpdatePassword(ctx context.Context, userID, passwordHash string) error
}

type UserUseCase interface {
	RegisterUser(ctx context.Context, req *RegisterRequest) (*User, error)
	LoginUser(ctx context.Context, req *LoginRequest) (*User, error)
	GetUser(ctx context.Context, id string) (*User, error)
	IssueTokens(ctx context.Context, userID string, email string, tenantID string, role UserTenantRole) (*TokenPair, error)
	FindUserTenant(ctx context.Context, userID string) (tenantID string, role UserTenantRole, err error)
	ForgotPassword(ctx context.Context, email string) (string, error)
	ResetPassword(ctx context.Context, token, password string) error
}

// ── Password Reset Token ─────────────────────────
type PasswordResetToken struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	TokenHash string     `json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

type PasswordResetTokenRepository interface {
	Create(ctx context.Context, token *PasswordResetToken) error
	GetValidByTokenHash(ctx context.Context, tokenHash string) (*PasswordResetToken, error)
	MarkUsed(ctx context.Context, id string) error
	DeleteUnusedByUser(ctx context.Context, userID string) error
}

// ── UserTenant (membership) ─────────────────────
type UserTenantRole string

const (
	RoleSuperAdmin  UserTenantRole = "super_admin"
	RoleTenantAdmin UserTenantRole = "tenant_admin"
	RoleManager     UserTenantRole = "manager"
	RoleEmployee    UserTenantRole = "employee"
)

type UserTenant struct {
	UserID    string         `json:"user_id" validate:"required,uuid"`
	TenantID  string         `json:"tenant_id" validate:"required,uuid"`
	Role      UserTenantRole `json:"role" validate:"required,oneof=super_admin tenant_admin manager employee"`
	IsActive  bool           `json:"is_active"`
	JoinedAt  time.Time      `json:"joined_at"`
	DeletedAt *time.Time     `json:"deleted_at,omitempty"`
}

type UserTenantRepository interface {
	Add(ctx context.Context, userTenant *UserTenant) error
	GetUserTenants(ctx context.Context, userID string) ([]UserTenant, error)
	GetTenantUsers(ctx context.Context, tenantID string, limit, offset int) ([]UserTenant, error)
	UpdateRole(ctx context.Context, userID, tenantID string, role UserTenantRole) error
	Remove(ctx context.Context, userID, tenantID string) error
}

// ── Auth ────────────────────────────────────────
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"` // seconds
}

type JWTClaims struct {
	UserID   string         `json:"user_id"`
	Email    string         `json:"email"`
	TenantID string         `json:"tenant_id,omitempty"`
	Role     UserTenantRole `json:"role,omitempty"`
}

// ── Department ──────────────────────────────────

type Department struct {
	ID          string     `json:"id" validate:"required,uuid"`
	TenantID    string     `json:"tenant_id" validate:"required,uuid"`
	ParentID    *string    `json:"parent_id"`
	Name        string     `json:"name" validate:"required,min=2"`
	Code        string     `json:"code" validate:"required,min=2"`
	Description string     `json:"description"`
	ManagerID   *string    `json:"manager_id"`
	Level       int        `json:"level"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

type DepartmentRepository interface {
	Create(ctx context.Context, d *Department) error
	GetByID(ctx context.Context, id string) (*Department, error)
	GetByCode(ctx context.Context, tenantID, code string) (*Department, error)
	Update(ctx context.Context, d *Department) error
	List(ctx context.Context, tenantID string, parentID *string) ([]Department, error)
	SoftDelete(ctx context.Context, id string) error
}

type DepartmentUseCase interface {
	Create(ctx context.Context, req *CreateDepartmentRequest) (*Department, error)
	Get(ctx context.Context, id string) (*Department, error)
	Update(ctx context.Context, d *Department) error
	List(ctx context.Context, tenantID string, parentID *string) ([]Department, error)
	SoftDelete(ctx context.Context, id string) error
}

// ── Position ────────────────────────────────────

type Position struct {
	ID          string     `json:"id" validate:"required,uuid"`
	TenantID    string     `json:"tenant_id" validate:"required,uuid"`
	Name        string     `json:"name" validate:"required,min=2"`
	Code        string     `json:"code" validate:"required,min=2"`
	Description string     `json:"description"`
	Grade       string     `json:"grade" validate:"omitempty,oneof=I II III IV V VI VII VIII IX X"`
	MinSalary   int64      `json:"min_salary"`
	MaxSalary   int64      `json:"max_salary"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

type PositionRepository interface {
	Create(ctx context.Context, p *Position) error
	GetByID(ctx context.Context, id string) (*Position, error)
	GetByCode(ctx context.Context, tenantID, code string) (*Position, error)
	Update(ctx context.Context, p *Position) error
	List(ctx context.Context, tenantID string) ([]Position, error)
	SoftDelete(ctx context.Context, id string) error
}

type PositionUseCase interface {
	Create(ctx context.Context, req *CreatePositionRequest) (*Position, error)
	Get(ctx context.Context, id string) (*Position, error)
	Update(ctx context.Context, p *Position) error
	List(ctx context.Context, tenantID string) ([]Position, error)
	SoftDelete(ctx context.Context, id string) error
}

// ── Attendance ──────────────────────────────────

type AttendanceStatus string

const (
	AttendancePresent AttendanceStatus = "present"
	AttendanceLate    AttendanceStatus = "late"
	AttendanceHalfDay AttendanceStatus = "half_day"
	AttendanceAbsent  AttendanceStatus = "absent"
)

type Attendance struct {
	ID         string           `json:"id"`
	EmployeeID string           `json:"employee_id" validate:"required,uuid"`
	TenantID   string           `json:"tenant_id" validate:"required,uuid"`
	ClockIn    time.Time        `json:"clock_in"`
	ClockOut   *time.Time       `json:"clock_out,omitempty"`
	ClockDate  string           `json:"clock_date" validate:"required"`
	Status     AttendanceStatus `json:"status" validate:"required,oneof=present late half_day absent"`
	Notes      string           `json:"notes,omitempty"`
	Latitude   *float64         `json:"latitude,omitempty"`
	Longitude  *float64         `json:"longitude,omitempty"`
	SelfieURL  string           `json:"selfie_url,omitempty"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
	DeletedAt  *time.Time       `json:"deleted_at,omitempty"`

	// Joined
	EmployeeName string `json:"employee_name,omitempty"`
	EmployeeCode string `json:"employee_code,omitempty"`
}

type AttendanceRepository interface {
	Create(ctx context.Context, a *Attendance) error
	GetToday(ctx context.Context, employeeID string) (*Attendance, error)
	GetTodayForUpdate(ctx context.Context, employeeID string) (*Attendance, error)
	GetByID(ctx context.Context, id string) (*Attendance, error)
	UpdateClockOut(ctx context.Context, id string, clockOut time.Time, notes string) error
	ListByEmployee(ctx context.Context, employeeID string, limit, offset int) ([]Attendance, error)
	ListByTenant(ctx context.Context, tenantID string, clockDate string, limit, offset int) ([]Attendance, error)
	CountByTenant(ctx context.Context, tenantID string, clockDate string) (int, error)
}

type AttendanceUseCase interface {
	ClockIn(ctx context.Context, req *ClockInRequest) (*Attendance, error)
	ClockOut(ctx context.Context, req *ClockOutRequest) (*Attendance, error)
	GetHistory(ctx context.Context, userID string, limit, offset int) ([]Attendance, error)
	GetReport(ctx context.Context, tenantID string, clockDate string, limit, offset int) (*AttendanceReport, error)
}

type AttendanceReport struct {
	Date   string       `json:"date"`
	Total  int          `json:"total"`
	Data   []Attendance `json:"data"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

// ── Shift ───────────────────────────────────────

type Shift struct {
	ID                  string     `json:"id" validate:"required,uuid"`
	TenantID            string     `json:"tenant_id" validate:"required,uuid"`
	Name                string     `json:"name" validate:"required,min=2"`
	Code                string     `json:"code" validate:"required,min=2"`
	StartTime           string     `json:"start_time"`                         // "07:00"
	EndTime             string     `json:"end_time"`                           // "15:00"
	GraceMinutes        int        `json:"grace_minutes"`
	ClockinWindowBefore int        `json:"clockin_window_before_minutes"`
	ClockoutWindowAfter int        `json:"clockout_window_after_minutes"`
	IsFlexible          bool       `json:"is_flexible"`
	Color               string     `json:"color,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	DeletedAt           *time.Time `json:"deleted_at,omitempty"`
}

type ShiftRepository interface {
	Create(ctx context.Context, s *Shift) error
	GetByID(ctx context.Context, id string) (*Shift, error)
	GetByCode(ctx context.Context, tenantID, code string) (*Shift, error)
	Update(ctx context.Context, s *Shift) error
	List(ctx context.Context, tenantID string) ([]Shift, error)
	SoftDelete(ctx context.Context, id string) error
}

type ShiftUseCase interface {
	Create(ctx context.Context, req *CreateShiftRequest) (*Shift, error)
	Get(ctx context.Context, id string) (*Shift, error)
	Update(ctx context.Context, s *Shift) error
	List(ctx context.Context, tenantID string) ([]Shift, error)
	SoftDelete(ctx context.Context, id string) error
}

// ── EmployeeShift (assignment) ──────────────────

type EmployeeShift struct {
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	EmployeeID    string     `json:"employee_id"`
	ShiftID       string     `json:"shift_id"`
	EffectiveFrom string     `json:"effective_from"` // "2006-01-02"
	EffectiveTo   *string    `json:"effective_to,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`

	// Joined
	ShiftName            string `json:"shift_name,omitempty"`
	ShiftCode            string `json:"shift_code,omitempty"`
	StartTime            string `json:"start_time,omitempty"`
	EndTime              string `json:"end_time,omitempty"`
	GraceMinutes         int    `json:"grace_minutes,omitempty"`
	ClockinWindowBefore  int    `json:"clockin_window_before_minutes,omitempty"`
	ClockoutWindowAfter  int    `json:"clockout_window_after_minutes,omitempty"`
	IsFlexible           bool   `json:"is_flexible,omitempty"`
}

type EmployeeShiftRepository interface {
	Create(ctx context.Context, es *EmployeeShift) error
	GetByID(ctx context.Context, id string) (*EmployeeShift, error)
	GetActive(ctx context.Context, employeeID, onDate string) (*EmployeeShift, error)
	GetActiveByEmployee(ctx context.Context, employeeID, onDate string) (*EmployeeShift, error)
	ListByEmployee(ctx context.Context, employeeID string) ([]EmployeeShift, error)
	ListByShift(ctx context.Context, shiftID string) ([]EmployeeShift, error)
	Update(ctx context.Context, es *EmployeeShift) error
	SoftDelete(ctx context.Context, id string) error
}

type EmployeeShiftUseCase interface {
	Assign(ctx context.Context, req *AssignShiftRequest) (*EmployeeShift, error)
	Get(ctx context.Context, id string) (*EmployeeShift, error)
	GetActive(ctx context.Context, employeeID, onDate string) (*EmployeeShift, error)
	Update(ctx context.Context, es *EmployeeShift) error
	ListByEmployee(ctx context.Context, employeeID string) ([]EmployeeShift, error)
	ListByShift(ctx context.Context, shiftID string) ([]EmployeeShift, error)
	RemoveAssignment(ctx context.Context, id string) error
	BulkAssign(ctx context.Context, req *BulkAssignShiftRequest) ([]EmployeeShift, error)
}

// ── Employee ────────────────────────────────────

type Employee struct {
	ID               string     `json:"id" validate:"required,uuid"`
	TenantID         string     `json:"tenant_id" validate:"required,uuid"`
	UserID           *string    `json:"user_id"`
	EmployeeCode     string     `json:"employee_code" validate:"required,min=2"`
	FirstName        string     `json:"first_name" validate:"required,min=2"`
	LastName         string     `json:"last_name"`
	Gender           string     `json:"gender" validate:"omitempty,oneof=male female"`
	BirthDate        *string    `json:"birth_date"`
	BirthPlace       string     `json:"birth_place"`
	Email            string     `json:"email" validate:"required,email"`
	Phone            string     `json:"phone"`
	Address          string     `json:"address"`
	DepartmentID     *string    `json:"department_id"`
	PositionID       *string    `json:"position_id"`
	ManagerID        *string    `json:"manager_id"`
	EmploymentStatus string     `json:"employment_status" validate:"required,oneof=active probation resigned terminated suspended"`
	EmploymentType   string     `json:"employment_type" validate:"required,oneof=permanent contract intern daily freelancer"`
	JoinDate         string     `json:"join_date" validate:"required"`
	ResignDate       *string    `json:"resign_date"`
	ContractStart    *string    `json:"contract_start"`
	ContractEnd      *string    `json:"contract_end"`
	NationalID       string     `json:"national_id"`
	TaxID            string     `json:"tax_id"`
	BPJSHealth       string     `json:"bpjs_health"`
	BPJSLabor        string     `json:"bpjs_labor"`
	BaseSalary       int64      `json:"base_salary"`
	BankName         string     `json:"bank_name"`
	BankAccount      string     `json:"bank_account"`
	CustomFields     JSONB      `json:"custom_fields"`
	Notes            string     `json:"notes"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`

	// Joined fields (read-only, populated by repo)
	DepartmentName string `json:"department_name,omitempty"`
	PositionName   string `json:"position_name,omitempty"`
	ManagerName    string `json:"manager_name,omitempty"`
}

type EmployeeFilter struct {
	Status       string `json:"status,omitempty"`
	DepartmentID string `json:"department_id,omitempty"`
	PositionID   string `json:"position_id,omitempty"`
	Search       string `json:"search,omitempty"`
	Limit        int    `json:"limit"`
	Offset       int    `json:"offset"`
}

type EmployeeListResult struct {
	Data   []Employee `json:"data"`
	Total  int        `json:"total"`
	Limit  int        `json:"limit"`
	Offset int        `json:"offset"`
}

type EmployeeRepository interface {
	Create(ctx context.Context, e *Employee) error
	GetByID(ctx context.Context, id string) (*Employee, error)
	GetByUserID(ctx context.Context, tenantID, userID string) (*Employee, error)
	GetByCode(ctx context.Context, tenantID, code string) (*Employee, error)
	Update(ctx context.Context, e *Employee) error
	List(ctx context.Context, tenantID string, filter EmployeeFilter) ([]Employee, error)
	Count(ctx context.Context, tenantID string, filter EmployeeFilter) (int, error)
	SoftDelete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id, status string) error
}

type EmployeeUseCase interface {
	Create(ctx context.Context, req *CreateEmployeeRequest) (*Employee, error)
	Get(ctx context.Context, id string) (*Employee, error)
	Update(ctx context.Context, e *Employee) error
	List(ctx context.Context, tenantID string, filter EmployeeFilter) (*EmployeeListResult, error)
	SoftDelete(ctx context.Context, id string) error
	ChangeStatus(ctx context.Context, id, status string) error
}

// ── Leave Type ──────────────────────────────────

type LeaveType struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenant_id"`
	Name               string     `json:"name"`
	Code               string     `json:"code"`
	DefaultDaysPerYear int        `json:"default_days_per_year"`
	MaxConsecutiveDays int        `json:"max_consecutive_days"`
	IsPaid             bool       `json:"is_paid"`
	Color              string     `json:"color"`
	Description        string     `json:"description"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`
}

type LeaveTypeRepository interface {
	Create(ctx context.Context, lt *LeaveType) error
	GetByID(ctx context.Context, id uuid.UUID) (*LeaveType, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*LeaveType, error)
	List(ctx context.Context, tenantID uuid.UUID) ([]LeaveType, error)
	Update(ctx context.Context, lt *LeaveType) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

// ── Leave Request ────────────────────────────────

type LeaveRequest struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenant_id"`
	EmployeeID   uuid.UUID  `json:"employee_id"`
	LeaveTypeID  uuid.UUID  `json:"leave_type_id"`
	StartDate    string     `json:"start_date"`
	EndDate      string     `json:"end_date"`
	TotalDays    float64    `json:"total_days"`
	Reason       string     `json:"reason"`
	Status       string     `json:"status"`
	ReviewedBy   *uuid.UUID `json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	RejectReason string     `json:"reject_reason"`
	CancelledAt  *time.Time `json:"cancelled_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
	// Joined fields
	EmployeeName  string `json:"employee_name,omitempty"`
	EmployeeCode  string `json:"employee_code,omitempty"`
	LeaveTypeName string `json:"leave_type_name,omitempty"`
	LeaveTypeCode string `json:"leave_type_code,omitempty"`
	ReviewerName  string `json:"reviewer_name,omitempty"`
}

type LeaveBalance struct {
	LeaveTypeID   uuid.UUID `json:"leave_type_id"`
	LeaveTypeName string    `json:"leave_type_name"`
	LeaveTypeCode string    `json:"leave_type_code"`
	TotalAllocated int      `json:"total_allocated"`
	Used          int       `json:"used"`
	Remaining     int       `json:"remaining"`
}

type LeaveRequestRepository interface {
	Create(ctx context.Context, lr *LeaveRequest) error
	GetByID(ctx context.Context, id uuid.UUID) (*LeaveRequest, error)
	ListByEmployee(ctx context.Context, employeeID uuid.UUID, limit, offset int) ([]LeaveRequest, error)
	ListPending(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]LeaveRequest, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, filter LeaveFilter, limit, offset int) ([]LeaveRequest, error)
	CountByTenant(ctx context.Context, tenantID uuid.UUID, filter LeaveFilter) (int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewedBy uuid.UUID, rejectReason string) error
	Cancel(ctx context.Context, id uuid.UUID) error
	HasOverlap(ctx context.Context, employeeID uuid.UUID, startDate, endDate string, excludeID *uuid.UUID) (bool, error)
	GetUsedDays(ctx context.Context, employeeID, leaveTypeID uuid.UUID, year int) (int, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

type LeaveFilter struct {
	Status     string `json:"status,omitempty"`
	EmployeeID string `json:"employee_id,omitempty"`
	DateFrom   string `json:"date_from,omitempty"`
	DateTo     string `json:"date_to,omitempty"`
}

type LeaveUseCase interface {
	Submit(ctx context.Context, req *CreateLeaveRequest) (*LeaveRequest, error)
	GetByID(ctx context.Context, id uuid.UUID) (*LeaveRequest, error)
	ListMyLeaves(ctx context.Context, tenantID, userID uuid.UUID, limit, offset int) ([]LeaveRequest, error)
	ListPending(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]LeaveRequest, error)
	ListAll(ctx context.Context, tenantID uuid.UUID, filter LeaveFilter, limit, offset int) ([]LeaveRequest, int, error)
	Approve(ctx context.Context, leaveID uuid.UUID, userID uuid.UUID) error
	Reject(ctx context.Context, leaveID uuid.UUID, userID uuid.UUID, reason string) error
	Cancel(ctx context.Context, leaveID uuid.UUID, userID uuid.UUID) error
	GetBalance(ctx context.Context, userID uuid.UUID, year int) ([]LeaveBalance, error)
	CreateLeaveType(ctx context.Context, req *CreateLeaveTypeRequest) (*LeaveType, error)
	ListLeaveTypes(ctx context.Context, tenantID uuid.UUID) ([]LeaveType, error)
	UpdateLeaveType(ctx context.Context, req *LeaveType) error
}

// ── Overtime Request ────────────────────────────

type OvertimeStatus string

const (
	OvertimePending  OvertimeStatus = "pending"
	OvertimeApproved OvertimeStatus = "approved"
	OvertimeRejected OvertimeStatus = "rejected"
)

type OvertimeRequest struct {
	ID           uuid.UUID      `json:"id"`
	TenantID     uuid.UUID      `json:"tenant_id"`
	EmployeeID   uuid.UUID      `json:"employee_id"`
	Date         string         `json:"date"`
	TotalHours   float64        `json:"total_hours"`
	Reason       string         `json:"reason"`
	Status       OvertimeStatus `json:"status"`
	ReviewedBy   *uuid.UUID     `json:"reviewed_by"`
	RejectReason string         `json:"reject_reason"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    *time.Time     `json:"deleted_at,omitempty"`
}

// ── Notification ────────────────────────────────

type NotificationType string

const (
	NotifLeaveSubmitted    NotificationType = "leave_submitted"
	NotifLeaveApproved     NotificationType = "leave_approved"
	NotifLeaveRejected     NotificationType = "leave_rejected"
	NotifOvertimeSubmitted NotificationType = "overtime_submitted"
	NotifOvertimeApproved  NotificationType = "overtime_approved"
	NotifOvertimeRejected  NotificationType = "overtime_rejected"
)

type Notification struct {
	ID            uuid.UUID        `json:"id"`
	TenantID      uuid.UUID        `json:"tenant_id"`
	UserID        uuid.UUID        `json:"user_id"`
	Type          NotificationType `json:"type"`
	Title         string           `json:"title"`
	Message       string           `json:"message"`
	ReferenceType string           `json:"reference_type"`
	ReferenceID   *uuid.UUID       `json:"reference_id"`
	IsRead        bool             `json:"is_read"`
	CreatedAt     time.Time        `json:"created_at"`
	DeletedAt     *time.Time       `json:"deleted_at,omitempty"`
}

type NotificationRepository interface {
	Create(ctx context.Context, n *Notification) error
	CreateForEmployee(ctx context.Context, n *Notification, employeeID uuid.UUID) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Notification, error)
	CountUnread(ctx context.Context, userID uuid.UUID) (int, error)
	MarkRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

type NotificationUseCase interface {
	NotifyLeaveSubmitted(ctx context.Context, leaveReq *LeaveRequest) error
	NotifyLeaveReviewed(ctx context.Context, leaveReq *LeaveRequest, action string, reviewerName string) error
	NotifyOvertimeSubmitted(ctx context.Context, otReq *OvertimeRequest) error
	NotifyOvertimeReviewed(ctx context.Context, otReq *OvertimeRequest, action string, reviewerName string) error
	ListMyNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Notification, error)
	CountUnread(ctx context.Context, userID uuid.UUID) (int, error)
	MarkRead(ctx context.Context, notifID uuid.UUID, userID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

// ── JSONB helper ────────────────────────────────

type JSONB map[string]interface{}
