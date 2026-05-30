package domain

// ── Auth request DTOs ─────────────────────────────

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required,min=2"`
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

// ── Employee change status ───────────────────────

type ChangeEmployeeStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=active probation resigned terminated suspended"`
}
