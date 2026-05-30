package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
)

type TenantUC struct {
	tenantRepo domain.TenantRepository
}

func NewTenantUC(repo domain.TenantRepository) domain.TenantUseCase {
	return &TenantUC{tenantRepo: repo}
}

// CreateTenant validates the request and creates a new tenant.
func (uc *TenantUC) CreateTenant(req *domain.CreateTenantRequest) (*domain.Tenant, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.tenantRepo.GetBySlug(req.Slug)
	if existing != nil {
		return nil, domain.NewConflict("slug already exists")
	}

	maxEmp := 5
	switch req.Plan {
	case "pro":
		maxEmp = 50
	case "enterprise":
		maxEmp = 10000
	}

	t := &domain.Tenant{
		ID:                   uuid.New().String(),
		Name:                 req.Name,
		Slug:                 req.Slug,
		Plan:                 req.Plan,
		PlanPricePerEmployee: req.PricePerEmployee,
		IsActive:             true,
		MaxEmployees:         maxEmp,
		Settings:             domain.JSONB{},
	}

	if err := uc.tenantRepo.Create(t); err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("create tenant: %v", err))
	}
	return t, nil
}

func (uc *TenantUC) GetTenant(id string) (*domain.Tenant, error) {
	t, err := uc.tenantRepo.GetByID(id)
	if err != nil {
		return nil, domain.NewNotFound("tenant not found")
	}
	return t, nil
}

func (uc *TenantUC) UpdateTenant(t *domain.Tenant) error {
	return uc.tenantRepo.Update(t)
}

func (uc *TenantUC) ListTenants() ([]domain.Tenant, error) {
	return uc.tenantRepo.List(100, 0)
}

func (uc *TenantUC) ActivateTenant(id string) error {
	return uc.tenantRepo.Activate(id)
}

func (uc *TenantUC) DeactivateTenant(id string) error {
	return uc.tenantRepo.Deactivate(id)
}

func (uc *TenantUC) ExtendTenant(id string, months int) error {
	if months < 1 || months > 36 {
		return domain.NewValidation("months must be between 1 and 36")
	}
	return uc.tenantRepo.Extend(id, months)
}

func (uc *TenantUC) ChangePlan(id string, req *domain.ChangePlanRequest) error {
	if err := Validate().Struct(req); err != nil {
		return domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}
	return uc.tenantRepo.ChangePlan(id, req.Plan, req.PricePerEmployee)
}

func (uc *TenantUC) SoftDeleteTenant(id string) error {
	return uc.tenantRepo.SoftDelete(id)
}
