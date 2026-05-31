package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type EmployeeUC struct {
	empRepo  domain.EmployeeRepository
	userRepo domain.UserRepository
	deptRepo domain.DepartmentRepository
	posRepo  domain.PositionRepository
}

func NewEmployeeUC(
	empRepo domain.EmployeeRepository,
	userRepo domain.UserRepository,
	deptRepo domain.DepartmentRepository,
	posRepo domain.PositionRepository,
) domain.EmployeeUseCase {
	return &EmployeeUC{
		empRepo:  empRepo,
		userRepo: userRepo,
		deptRepo: deptRepo,
		posRepo:  posRepo,
	}
}

func (uc *EmployeeUC) Create(ctx context.Context, req *domain.CreateEmployeeRequest) (*domain.Employee, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.empRepo.GetByCode(ctx, req.TenantID, req.EmployeeCode)
	if existing != nil {
		return nil, domain.NewConflict("employee code already exists in this tenant")
	}

	if req.DepartmentID != nil && *req.DepartmentID != "" {
		if _, err := uc.deptRepo.GetByID(ctx, *req.DepartmentID); err != nil {
			return nil, domain.NewValidation("department not found")
		}
	}

	if req.PositionID != nil && *req.PositionID != "" {
		if _, err := uc.posRepo.GetByID(ctx, *req.PositionID); err != nil {
			return nil, domain.NewValidation("position not found")
		}
	}

	// ── Auto-link user_id by email ──────────────────────
	var userID *string
	if u, err := uc.userRepo.GetByEmail(ctx, req.Email); err == nil && u != nil {
		userID = &u.ID
	}

	e := &domain.Employee{
		ID:               uuid.New().String(),
		TenantID:         req.TenantID,
		UserID:           userID,
		EmployeeCode:     req.EmployeeCode,
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Gender:           req.Gender,
		BirthDate:        req.BirthDate,
		BirthPlace:       req.BirthPlace,
		Email:            req.Email,
		Phone:            req.Phone,
		Address:          req.Address,
		DepartmentID:     req.DepartmentID,
		PositionID:       req.PositionID,
		ManagerID:        req.ManagerID,
		EmploymentStatus: req.EmploymentStatus,
		EmploymentType:   req.EmploymentType,
		JoinDate:         req.JoinDate,
		ContractStart:    req.ContractStart,
		ContractEnd:      req.ContractEnd,
		NationalID:       req.NationalID,
		TaxID:            req.TaxID,
		BPJSHealth:       req.BPJSHealth,
		BPJSLabor:        req.BPJSLabor,
		BaseSalary:       req.BaseSalary,
		BankName:         req.BankName,
		BankAccount:      req.BankAccount,
		CustomFields:     req.CustomFields,
		Notes:            req.Notes,
	}

	if e.CustomFields == nil {
		e.CustomFields = domain.JSONB{}
	}

	if err := uc.empRepo.Create(ctx, e); err != nil {
		logger.Error(ctx, "create employee failed",
			"tenant_id", req.TenantID,
			"code", req.EmployeeCode,
			"error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create employee: %v", err))
	}

	logger.Info(ctx, "employee created",
		"emp_id", e.ID,
		"code", e.EmployeeCode,
		"tenant_id", e.TenantID,
		"status", e.EmploymentStatus)

	// Return with joined fields
	return uc.empRepo.GetByID(ctx, e.ID)
}

func (uc *EmployeeUC) Get(ctx context.Context, id string) (*domain.Employee, error) {
	e, err := uc.empRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("employee not found")
	}
	return e, nil
}

func (uc *EmployeeUC) Update(ctx context.Context, e *domain.Employee) error {
	if err := uc.empRepo.Update(ctx, e); err != nil {
		logger.Error(ctx, "update employee failed", "emp_id", e.ID, "error", err)
		return domain.NewInternal(fmt.Sprintf("update employee: %v", err))
	}
	logger.Info(ctx, "employee updated", "emp_id", e.ID)
	return nil
}

func (uc *EmployeeUC) List(ctx context.Context, tenantID string, filter domain.EmployeeFilter) (*domain.EmployeeListResult, error) {
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	total, err := uc.empRepo.Count(ctx, tenantID, filter)
	if err != nil {
		logger.Error(ctx, "count employees failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("count employees: %v", err))
	}

	employees, err := uc.empRepo.List(ctx, tenantID, filter)
	if err != nil {
		logger.Error(ctx, "list employees failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("list employees: %v", err))
	}

	return &domain.EmployeeListResult{
		Data:   employees,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (uc *EmployeeUC) SoftDelete(ctx context.Context, id string) error {
	if err := uc.empRepo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete employee failed", "emp_id", id, "error", err)
		return domain.NewInternal("failed to delete employee")
	}
	logger.Info(ctx, "employee soft deleted", "emp_id", id)
	return nil
}

func (uc *EmployeeUC) ChangeStatus(ctx context.Context, id, status string) error {
	validStatuses := map[string]bool{
		"active": true, "probation": true, "resigned": true,
		"terminated": true, "suspended": true,
	}
	if !validStatuses[status] {
		return domain.NewValidation("invalid employment status")
	}

	if err := uc.empRepo.UpdateStatus(ctx, id, status); err != nil {
		logger.Error(ctx, "change employee status failed",
			"emp_id", id, "status", status, "error", err)
		return domain.NewInternal("failed to change status")
	}

	logger.Info(ctx, "employee status changed",
		"emp_id", id, "status", status)
	return nil
}
