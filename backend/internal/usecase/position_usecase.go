package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
)

type PositionUC struct {
	repo domain.PositionRepository
}

func NewPositionUC(repo domain.PositionRepository) domain.PositionUseCase {
	return &PositionUC{repo: repo}
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
		return nil, domain.NewInternal(fmt.Sprintf("create position: %v", err))
	}
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
	return uc.repo.Update(p)
}

func (uc *PositionUC) List(tenantID string) ([]domain.Position, error) {
	return uc.repo.List(tenantID)
}

func (uc *PositionUC) SoftDelete(id string) error {
	return uc.repo.SoftDelete(id)
}
