package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/config"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type TenantUC struct {
	tenantRepo domain.TenantRepository
	plans      *config.PlansConfig
	log        *zap.Logger
}

func NewTenantUC(repo domain.TenantRepository, plans *config.PlansConfig, log *zap.Logger) domain.TenantUseCase {
	return &TenantUC{tenantRepo: repo, plans: plans, log: log}
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

	if err := uc.tenantRepo.Create(t); err != nil {
		uc.log.Error("create tenant failed", zap.String("slug", req.Slug), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("create tenant: %v", err))
	}

	uc.log.Info("tenant created", zap.String("tenant_id", t.ID), zap.String("slug", t.Slug), zap.String("plan", t.Plan))
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
	if err := uc.tenantRepo.Update(t); err != nil {
		uc.log.Error("update tenant failed", zap.String("tenant_id", t.ID), zap.Error(err))
		return domain.NewInternal(fmt.Sprintf("update tenant: %v", err))
	}
	uc.log.Info("tenant updated", zap.String("tenant_id", t.ID))
	return nil
}

func (uc *TenantUC) ListTenants() ([]domain.Tenant, error) {
	tenants, err := uc.tenantRepo.List(100, 0)
	if err != nil {
		uc.log.Error("list tenants failed", zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("list tenants: %v", err))
	}
	return tenants, nil
}

func (uc *TenantUC) ActivateTenant(id string) error {
	if err := uc.tenantRepo.Activate(id); err != nil {
		uc.log.Error("activate tenant failed", zap.String("tenant_id", id), zap.Error(err))
		return domain.NewInternal("failed to activate tenant")
	}
	uc.log.Info("tenant activated", zap.String("tenant_id", id))
	return nil
}

func (uc *TenantUC) DeactivateTenant(id string) error {
	if err := uc.tenantRepo.Deactivate(id); err != nil {
		uc.log.Error("deactivate tenant failed", zap.String("tenant_id", id), zap.Error(err))
		return domain.NewInternal("failed to deactivate tenant")
	}
	uc.log.Info("tenant deactivated", zap.String("tenant_id", id))
	return nil
}

func (uc *TenantUC) ExtendTenant(id string, months int) error {
	if months < 1 || months > 36 {
		return domain.NewValidation("months must be between 1 and 36")
	}
	if err := uc.tenantRepo.Extend(id, months); err != nil {
		uc.log.Error("extend tenant failed", zap.String("tenant_id", id), zap.Int("months", months), zap.Error(err))
		return domain.NewInternal("failed to extend subscription")
	}
	uc.log.Info("tenant subscription extended", zap.String("tenant_id", id), zap.Int("months", months))
	return nil
}

func (uc *TenantUC) ChangePlan(id string, req *domain.ChangePlanRequest) error {
	if err := Validate().Struct(req); err != nil {
		return domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}
	if err := uc.tenantRepo.ChangePlan(id, req.Plan, req.PricePerEmployee); err != nil {
		uc.log.Error("change plan failed", zap.String("tenant_id", id), zap.String("plan", req.Plan), zap.Error(err))
		return domain.NewInternal("failed to change plan")
	}
	uc.log.Info("tenant plan changed", zap.String("tenant_id", id), zap.String("plan", req.Plan))
	return nil
}

func (uc *TenantUC) SoftDeleteTenant(id string) error {
	if err := uc.tenantRepo.SoftDelete(id); err != nil {
		uc.log.Error("soft delete tenant failed", zap.String("tenant_id", id), zap.Error(err))
		return domain.NewInternal("failed to delete tenant")
	}
	uc.log.Info("tenant soft deleted", zap.String("tenant_id", id))
	return nil
}
