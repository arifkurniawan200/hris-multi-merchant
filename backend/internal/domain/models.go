package domain

import (
	"context"
	"time"
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
}

type UserUseCase interface {
	RegisterUser(ctx context.Context, req *RegisterRequest) (*User, error)
	LoginUser(ctx context.Context, req *LoginRequest) (*User, error)
	GetUser(ctx context.Context, id string) (*User, error)
	IssueTokens(ctx context.Context, userID string, email string, tenantID string, role UserTenantRole) (*TokenPair, error)
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
	GetHistory(ctx context.Context, employeeID string, limit, offset int) ([]Attendance, error)
	GetReport(ctx context.Context, tenantID string, clockDate string, limit, offset int) (*AttendanceReport, error)
}

type AttendanceReport struct {
	Date   string       `json:"date"`
	Total  int          `json:"total"`
	Data   []Attendance `json:"data"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
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

// ── JSONB helper ────────────────────────────────

type JSONB map[string]interface{}
