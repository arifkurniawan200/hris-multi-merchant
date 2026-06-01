package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type DepartmentUC struct {
	repo domain.DepartmentRepository
}

func NewDepartmentUC(repo domain.DepartmentRepository) domain.DepartmentUseCase {
	return &DepartmentUC{repo: repo}
}

func (uc *DepartmentUC) Create(ctx context.Context, req *domain.CreateDepartmentRequest) (*domain.Department, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.repo.GetByCode(ctx, req.TenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("department code already exists in this tenant")
	}

	level := 0
	if req.ParentID != nil {
		parent, err := uc.repo.GetByID(ctx, *req.ParentID)
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

	if err := uc.repo.Create(ctx, d); err != nil {
		logger.Error(ctx, "create department failed", "tenant_id", req.TenantID, "code", req.Code, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create department: %v", err))
	}

	logger.Info(ctx, "department created", "dept_id", d.ID, "code", d.Code, "tenant_id", d.TenantID)
	return d, nil
}

func (uc *DepartmentUC) Get(ctx context.Context, id string) (*domain.Department, error) {
	d, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("department not found")
	}
	return d, nil
}

func (uc *DepartmentUC) Update(ctx context.Context, d *domain.Department) error {
	if err := uc.repo.Update(ctx, d); err != nil {
		logger.Error(ctx, "update department failed", "dept_id", d.ID, "error", err)
		return domain.NewInternal(fmt.Sprintf("update department: %v", err))
	}
	logger.Info(ctx, "department updated", "dept_id", d.ID)
	return nil
}

func (uc *DepartmentUC) List(ctx context.Context, tenantID string, parentID *string) ([]domain.Department, error) {
	depts, err := uc.repo.List(ctx, tenantID, parentID)
	if err != nil {
		logger.Error(ctx, "list departments failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("list departments: %v", err))
	}
	return depts, nil
}

func (uc *DepartmentUC) SoftDelete(ctx context.Context, id string) error {
	if err := uc.repo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete department failed", "dept_id", id, "error", err)
		return domain.NewInternal("failed to delete department")
	}
	logger.Info(ctx, "department soft deleted", "dept_id", id)
	return nil
}
