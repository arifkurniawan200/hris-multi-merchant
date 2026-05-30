package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type PositionUC struct {
	repo domain.PositionRepository
	log  *zap.Logger
}

func NewPositionUC(repo domain.PositionRepository, log *zap.Logger) domain.PositionUseCase {
	return &PositionUC{repo: repo, log: log}
}

func (uc *PositionUC) Create(req *domain.CreatePositionRequest) (*domain.Position, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.repo.GetByCode(req.TenantID, req.Code)
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

	if err := uc.repo.Create(p); err != nil {
		uc.log.Error("create position failed", zap.String("tenant_id", req.TenantID), zap.String("code", req.Code), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("create position: %v", err))
	}

	uc.log.Info("position created", zap.String("pos_id", p.ID), zap.String("code", p.Code), zap.String("tenant_id", p.TenantID))
	return p, nil
}

func (uc *PositionUC) Get(id string) (*domain.Position, error) {
	p, err := uc.repo.GetByID(id)
	if err != nil {
		return nil, domain.NewNotFound("position not found")
	}
	return p, nil
}

func (uc *PositionUC) Update(p *domain.Position) error {
	if err := uc.repo.Update(p); err != nil {
		uc.log.Error("update position failed", zap.String("pos_id", p.ID), zap.Error(err))
		return domain.NewInternal(fmt.Sprintf("update position: %v", err))
	}
	uc.log.Info("position updated", zap.String("pos_id", p.ID))
	return nil
}

func (uc *PositionUC) List(tenantID string) ([]domain.Position, error) {
	positions, err := uc.repo.List(tenantID)
	if err != nil {
		uc.log.Error("list positions failed", zap.String("tenant_id", tenantID), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("list positions: %v", err))
	}
	return positions, nil
}

func (uc *PositionUC) SoftDelete(id string) error {
	if err := uc.repo.SoftDelete(id); err != nil {
		uc.log.Error("soft delete position failed", zap.String("pos_id", id), zap.Error(err))
		return domain.NewInternal("failed to delete position")
	}
	uc.log.Info("position soft deleted", zap.String("pos_id", id))
	return nil
}
