package domain

import "time"

// ── Tenant ──────────────────────────────────────
type Tenant struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Plan           string    `json:"plan"` // free, pro, enterprise
	MaxEmployees   int       `json:"max_employees"`
	Settings       JSONB     `json:"settings"`
	LogoURL        string    `json:"logo_url"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type TenantRepository interface {
	Create(tenant *Tenant) error
	GetByID(id string) (*Tenant, error)
	GetBySlug(slug string) (*Tenant, error)
	Update(tenant *Tenant) error
	List(limit, offset int) ([]Tenant, error)
}

type TenantUseCase interface {
	CreateTenant(name, slug, plan string) (*Tenant, error)
	GetTenant(id string) (*Tenant, error)
	UpdateTenant(t *Tenant) error
	ListTenants() ([]Tenant, error)
}

// ── User ────────────────────────────────────────
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Phone        string    `json:"phone"`
	AvatarURL    string    `json:"avatar_url"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type UserRepository interface {
	Create(user *User) error
	GetByID(id string) (*User, error)
	GetByEmail(email string) (*User, error)
	Update(user *User) error
}

type UserUseCase interface {
	RegisterUser(email, password, fullName string) (*User, error)
	LoginUser(email, password string) (*User, error)
	GetUser(id string) (*User, error)
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
	UserID   string         `json:"user_id"`
	TenantID string         `json:"tenant_id"`
	Role     UserTenantRole `json:"role"`
	IsActive bool           `json:"is_active"`
	JoinedAt time.Time      `json:"joined_at"`
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

// ── JSONB helper ────────────────────────────────
type JSONB map[string]interface{}
