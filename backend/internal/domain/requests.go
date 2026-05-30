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
