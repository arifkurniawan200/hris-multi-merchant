package domain

import "time"

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
	Create(tenant *Tenant) error
	GetByID(id string) (*Tenant, error)
	GetBySlug(slug string) (*Tenant, error)
	Update(tenant *Tenant) error
	List(limit, offset int) ([]Tenant, error)
	Activate(id string) error
	Deactivate(id string) error
	Extend(id string, months int) error
	ChangePlan(id, plan string, pricePerEmployee int64) error
	SoftDelete(id string) error
}

type TenantUseCase interface {
	CreateTenant(req *CreateTenantRequest) (*Tenant, error)
	GetTenant(id string) (*Tenant, error)
	UpdateTenant(t *Tenant) error
	ListTenants() ([]Tenant, error)
	ActivateTenant(id string) error
	DeactivateTenant(id string) error
	ExtendTenant(id string, months int) error
	ChangePlan(id string, req *ChangePlanRequest) error
	SoftDeleteTenant(id string) error
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
	Create(user *User) error
	GetByID(id string) (*User, error)
	GetByEmail(email string) (*User, error)
	Update(user *User) error
}

type UserUseCase interface {
	RegisterUser(req *RegisterRequest) (*User, error)
	LoginUser(req *LoginRequest) (*User, error)
	GetUser(id string) (*User, error)
	IssueTokens(userID string, email string, tenantID string, role UserTenantRole) (*TokenPair, error)
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
	Add(userTenant *UserTenant) error
	GetUserTenants(userID string) ([]UserTenant, error)
	GetTenantUsers(tenantID string, limit, offset int) ([]UserTenant, error)
	UpdateRole(userID, tenantID string, role UserTenantRole) error
	Remove(userID, tenantID string) error
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
	Create(d *Department) error
	GetByID(id string) (*Department, error)
	GetByCode(tenantID, code string) (*Department, error)
	Update(d *Department) error
	List(tenantID string, parentID *string) ([]Department, error)
	SoftDelete(id string) error
}

type DepartmentUseCase interface {
	Create(req *CreateDepartmentRequest) (*Department, error)
	Get(id string) (*Department, error)
	Update(d *Department) error
	List(tenantID string, parentID *string) ([]Department, error)
	SoftDelete(id string) error
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
	Create(p *Position) error
	GetByID(id string) (*Position, error)
	GetByCode(tenantID, code string) (*Position, error)
	Update(p *Position) error
	List(tenantID string) ([]Position, error)
	SoftDelete(id string) error
}

type PositionUseCase interface {
	Create(req *CreatePositionRequest) (*Position, error)
	Get(id string) (*Position, error)
	Update(p *Position) error
	List(tenantID string) ([]Position, error)
	SoftDelete(id string) error
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
	Create(e *Employee) error
	GetByID(id string) (*Employee, error)
	GetByCode(tenantID, code string) (*Employee, error)
	Update(e *Employee) error
	List(tenantID string, filter EmployeeFilter) ([]Employee, error)
	Count(tenantID string, filter EmployeeFilter) (int, error)
	SoftDelete(id string) error
	UpdateStatus(id, status string) error
}

type EmployeeUseCase interface {
	Create(req *CreateEmployeeRequest) (*Employee, error)
	Get(id string) (*Employee, error)
	Update(e *Employee) error
	List(tenantID string, filter EmployeeFilter) (*EmployeeListResult, error)
	SoftDelete(id string) error
	ChangeStatus(id, status string) error
}

// ── JSONB helper ────────────────────────────────

type JSONB map[string]interface{}
