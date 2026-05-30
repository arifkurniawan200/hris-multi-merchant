package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
)

type DepartmentUC struct {
	repo domain.DepartmentRepository
}

func NewDepartmentUC(repo domain.DepartmentRepository) domain.DepartmentUseCase {
	return &DepartmentUC{repo: repo}
}

func (uc *DepartmentUC) Create(req *domain.CreateDepartmentRequest) (*domain.Department, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Check unique code within tenant
	existing, _ := uc.repo.GetByCode(req.TenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("department code already exists in this tenant")
	}

	// Calculate level
	level := 0
	if req.ParentID != nil {
		parent, err := uc.repo.GetByID(*req.ParentID)
		if err != nil {
			return nil, domain.NewNotFound("parent department not found")
		}
		level = parent.Level + 1
	}

	d := &domain.Department{
		ID:          uuid.New().String(),
		TenantID:    req.TenantID,
		ParentID:    req.ParentID,
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		ManagerID:   req.ManagerID,
		Level:       level,
		IsActive:    true,
	}

	if err := uc.repo.Create(d); err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("create department: %v", err))
	}
	return d, nil
}

func (uc *DepartmentUC) Get(id string) (*domain.Department, error) {
	d, err := uc.repo.GetByID(id)
	if err != nil {
		return nil, domain.NewNotFound("department not found")
	}
	return d, nil
}

func (uc *DepartmentUC) Update(d *domain.Department) error {
	return uc.repo.Update(d)
}

func (uc *DepartmentUC) List(tenantID string, parentID *string) ([]domain.Department, error) {
	return uc.repo.List(tenantID, parentID)
}

func (uc *DepartmentUC) SoftDelete(id string) error {
	return uc.repo.SoftDelete(id)
}
