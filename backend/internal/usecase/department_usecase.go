package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type DepartmentUC struct {
	repo domain.DepartmentRepository
	log  *zap.Logger
}

func NewDepartmentUC(repo domain.DepartmentRepository, log *zap.Logger) domain.DepartmentUseCase {
	return &DepartmentUC{repo: repo, log: log}
}

func (uc *DepartmentUC) Create(req *domain.CreateDepartmentRequest) (*domain.Department, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.repo.GetByCode(req.TenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("department code already exists in this tenant")
	}

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
		uc.log.Error("create department failed", zap.String("tenant_id", req.TenantID), zap.String("code", req.Code), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("create department: %v", err))
	}

	uc.log.Info("department created", zap.String("dept_id", d.ID), zap.String("code", d.Code), zap.String("tenant_id", d.TenantID))
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
	if err := uc.repo.Update(d); err != nil {
		uc.log.Error("update department failed", zap.String("dept_id", d.ID), zap.Error(err))
		return domain.NewInternal(fmt.Sprintf("update department: %v", err))
	}
	uc.log.Info("department updated", zap.String("dept_id", d.ID))
	return nil
}

func (uc *DepartmentUC) List(tenantID string, parentID *string) ([]domain.Department, error) {
	depts, err := uc.repo.List(tenantID, parentID)
	if err != nil {
		uc.log.Error("list departments failed", zap.String("tenant_id", tenantID), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("list departments: %v", err))
	}
	return depts, nil
}

func (uc *DepartmentUC) SoftDelete(id string) error {
	if err := uc.repo.SoftDelete(id); err != nil {
		uc.log.Error("soft delete department failed", zap.String("dept_id", id), zap.Error(err))
		return domain.NewInternal("failed to delete department")
	}
	uc.log.Info("department soft deleted", zap.String("dept_id", id))
	return nil
}
