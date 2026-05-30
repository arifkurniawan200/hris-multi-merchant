package usecase

import (
	"fmt"
	"regexp"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
)

type TenantUC struct {
	tenantRepo domain.TenantRepository
}

func NewTenantUC(repo domain.TenantRepository) domain.TenantUseCase {
	return &TenantUC{tenantRepo: repo}
}

func (uc *TenantUC) CreateTenant(name, slug, plan string) (*domain.Tenant, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if slug == "" {
		return nil, fmt.Errorf("slug is required")
	}
	if !regexp.MustCompile(`^[a-z0-9-]+$`).MatchString(slug) {
		return nil, fmt.Errorf("slug must be lowercase alphanumeric with dashes")
	}

	existing, _ := uc.tenantRepo.GetBySlug(slug)
	if existing != nil {
		return nil, fmt.Errorf("slug already exists")
	}

	maxEmp := 5
	switch plan {
	case "pro":
		maxEmp = 50
	case "enterprise":
		maxEmp = 10000
	}

	t := &domain.Tenant{
		ID:           uuid.New().String(),
		Name:         name,
		Slug:         slug,
		Plan:         plan,
		MaxEmployees: maxEmp,
		Settings:     domain.JSONB{},
	}

	if err := uc.tenantRepo.Create(t); err != nil {
		return nil, fmt.Errorf("create tenant: %w", err)
	}
	return t, nil
}

func (uc *TenantUC) GetTenant(id string) (*domain.Tenant, error) {
	t, err := uc.tenantRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("get tenant: %w", err)
	}
	return t, nil
}

func (uc *TenantUC) UpdateTenant(t *domain.Tenant) error {
	return uc.tenantRepo.Update(t)
}

func (uc *TenantUC) ListTenants() ([]domain.Tenant, error) {
	return uc.tenantRepo.List(100, 0)
}
