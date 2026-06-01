package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/config"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type TenantUC struct {
	tenantRepo domain.TenantRepository
	plans      *config.PlansConfig
}

func NewTenantUC(repo domain.TenantRepository, plans *config.PlansConfig) domain.TenantUseCase {
	return &TenantUC{tenantRepo: repo, plans: plans}
}

// CreateTenant validates the request and creates a new tenant.
func (uc *TenantUC) CreateTenant(ctx context.Context, req *domain.CreateTenantRequest) (*domain.Tenant, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.tenantRepo.GetBySlug(ctx, req.Slug)
	if existing != nil {
		return nil, domain.NewConflict("slug already exists")
	}

	t := &domain.Tenant{
		ID:                   uuid.New().String(),
		Name:                 req.Name,
		Slug:                 req.Slug,
		Plan:                 req.Plan,
		PlanPricePerEmployee: req.PricePerEmployee,
		IsActive:             true,
		MaxEmployees:         uc.plans.MaxEmployeesForPlan(req.Plan),
		Settings:             domain.JSONB{},
	}

	if err := uc.tenantRepo.Create(ctx, t); err != nil {
		logger.Error(ctx, "create tenant failed", "slug", req.Slug, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create tenant: %v", err))
	}

	logger.Info(ctx, "tenant created", "tenant_id", t.ID, "slug", t.Slug, "plan", t.Plan)
	return t, nil
}

func (uc *TenantUC) GetTenant(ctx context.Context, id string) (*domain.Tenant, error) {
	t, err := uc.tenantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("tenant not found")
	}
	return t, nil
}

func (uc *TenantUC) UpdateTenant(ctx context.Context, t *domain.Tenant) error {
	if err := uc.tenantRepo.Update(ctx, t); err != nil {
		logger.Error(ctx, "update tenant failed", "tenant_id", t.ID, "error", err)
		return domain.NewInternal(fmt.Sprintf("update tenant: %v", err))
	}
	logger.Info(ctx, "tenant updated", "tenant_id", t.ID)
	return nil
}

func (uc *TenantUC) ListTenants(ctx context.Context) ([]domain.Tenant, error) {
	tenants, err := uc.tenantRepo.List(ctx, 100, 0)
	if err != nil {
		logger.Error(ctx, "list tenants failed", "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("list tenants: %v", err))
	}
	return tenants, nil
}

func (uc *TenantUC) ActivateTenant(ctx context.Context, id string) error {
	if err := uc.tenantRepo.Activate(ctx, id); err != nil {
		logger.Error(ctx, "activate tenant failed", "tenant_id", id, "error", err)
		return domain.NewInternal("failed to activate tenant")
	}
	logger.Info(ctx, "tenant activated", "tenant_id", id)
	return nil
}

func (uc *TenantUC) DeactivateTenant(ctx context.Context, id string) error {
	if err := uc.tenantRepo.Deactivate(ctx, id); err != nil {
		logger.Error(ctx, "deactivate tenant failed", "tenant_id", id, "error", err)
		return domain.NewInternal("failed to deactivate tenant")
	}
	logger.Info(ctx, "tenant deactivated", "tenant_id", id)
	return nil
}

func (uc *TenantUC) ExtendTenant(ctx context.Context, id string, months int) error {
	if months < 1 || months > 36 {
		return domain.NewValidation("months must be between 1 and 36")
	}
	if err := uc.tenantRepo.Extend(ctx, id, months); err != nil {
		logger.Error(ctx, "extend tenant failed", "tenant_id", id, "months", months, "error", err)
		return domain.NewInternal("failed to extend subscription")
	}
	logger.Info(ctx, "tenant subscription extended", "tenant_id", id, "months", months)
	return nil
}

func (uc *TenantUC) ChangePlan(ctx context.Context, id string, req *domain.ChangePlanRequest) error {
	if err := Validate().Struct(req); err != nil {
		return domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}
	if err := uc.tenantRepo.ChangePlan(ctx, id, req.Plan, req.PricePerEmployee); err != nil {
		logger.Error(ctx, "change plan failed", "tenant_id", id, "plan", req.Plan, "error", err)
		return domain.NewInternal("failed to change plan")
	}
	logger.Info(ctx, "tenant plan changed", "tenant_id", id, "plan", req.Plan)
	return nil
}

func (uc *TenantUC) SoftDeleteTenant(ctx context.Context, id string) error {
	if err := uc.tenantRepo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete tenant failed", "tenant_id", id, "error", err)
		return domain.NewInternal("failed to delete tenant")
	}
	logger.Info(ctx, "tenant soft deleted", "tenant_id", id)
	return nil
}
