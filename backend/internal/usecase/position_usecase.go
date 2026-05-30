package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type PositionUC struct {
	repo domain.PositionRepository
}

func NewPositionUC(repo domain.PositionRepository) domain.PositionUseCase {
	return &PositionUC{repo: repo}
}

func (uc *PositionUC) Create(ctx context.Context, req *domain.CreatePositionRequest) (*domain.Position, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.repo.GetByCode(ctx, req.TenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("position code already exists in this tenant")
	}

	p := &domain.Position{
		ID:          uuid.New().String(),
		TenantID:    req.TenantID,
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Grade:       req.Grade,
		MinSalary:   req.MinSalary,
		MaxSalary:   req.MaxSalary,
		IsActive:    true,
	}

	if err := uc.repo.Create(ctx, p); err != nil {
		logger.Error(ctx, "create position failed", "tenant_id", req.TenantID, "code", req.Code, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create position: %v", err))
	}

	logger.Info(ctx, "position created", "pos_id", p.ID, "code", p.Code, "tenant_id", p.TenantID)
	return p, nil
}

func (uc *PositionUC) Get(ctx context.Context, id string) (*domain.Position, error) {
	p, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("position not found")
	}
	return p, nil
}

func (uc *PositionUC) Update(ctx context.Context, p *domain.Position) error {
	if err := uc.repo.Update(ctx, p); err != nil {
		logger.Error(ctx, "update position failed", "pos_id", p.ID, "error", err)
		return domain.NewInternal(fmt.Sprintf("update position: %v", err))
	}
	logger.Info(ctx, "position updated", "pos_id", p.ID)
	return nil
}

func (uc *PositionUC) List(ctx context.Context, tenantID string) ([]domain.Position, error) {
	positions, err := uc.repo.List(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "list positions failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("list positions: %v", err))
	}
	return positions, nil
}

func (uc *PositionUC) SoftDelete(ctx context.Context, id string) error {
	if err := uc.repo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete position failed", "pos_id", id, "error", err)
		return domain.NewInternal("failed to delete position")
	}
	logger.Info(ctx, "position soft deleted", "pos_id", id)
	return nil
}
