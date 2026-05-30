package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type EmployeeUC struct {
	empRepo  domain.EmployeeRepository
	deptRepo domain.DepartmentRepository
	posRepo  domain.PositionRepository
	log      *zap.Logger
}

func NewEmployeeUC(
	empRepo domain.EmployeeRepository,
	deptRepo domain.DepartmentRepository,
	posRepo domain.PositionRepository,
	log *zap.Logger,
) domain.EmployeeUseCase {
	return &EmployeeUC{
		empRepo:  empRepo,
		deptRepo: deptRepo,
		posRepo:  posRepo,
		log:      log,
	}
}

func (uc *EmployeeUC) Create(req *domain.CreateEmployeeRequest) (*domain.Employee, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.empRepo.GetByCode(req.TenantID, req.EmployeeCode)
	if existing != nil {
		return nil, domain.NewConflict("employee code already exists in this tenant")
	}

	if req.DepartmentID != nil && *req.DepartmentID != "" {
		if _, err := uc.deptRepo.GetByID(*req.DepartmentID); err != nil {
			return nil, domain.NewValidation("department not found")
		}
	}

	if req.PositionID != nil && *req.PositionID != "" {
		if _, err := uc.posRepo.GetByID(*req.PositionID); err != nil {
			return nil, domain.NewValidation("position not found")
		}
	}

	e := &domain.Employee{
		ID:               uuid.New().String(),
		TenantID:         req.TenantID,
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

	if err := uc.empRepo.Create(e); err != nil {
		uc.log.Error("create employee failed",
			zap.String("tenant_id", req.TenantID),
			zap.String("code", req.EmployeeCode),
			zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("create employee: %v", err))
	}

	uc.log.Info("employee created",
		zap.String("emp_id", e.ID),
		zap.String("code", e.EmployeeCode),
		zap.String("tenant_id", e.TenantID),
		zap.String("status", e.EmploymentStatus))

	// Return with joined fields
	return uc.empRepo.GetByID(e.ID)
}

func (uc *EmployeeUC) Get(id string) (*domain.Employee, error) {
	e, err := uc.empRepo.GetByID(id)
	if err != nil {
		return nil, domain.NewNotFound("employee not found")
	}
	return e, nil
}

func (uc *EmployeeUC) Update(e *domain.Employee) error {
	if err := uc.empRepo.Update(e); err != nil {
		uc.log.Error("update employee failed", zap.String("emp_id", e.ID), zap.Error(err))
		return domain.NewInternal(fmt.Sprintf("update employee: %v", err))
	}
	uc.log.Info("employee updated", zap.String("emp_id", e.ID))
	return nil
}

func (uc *EmployeeUC) List(tenantID string, filter domain.EmployeeFilter) (*domain.EmployeeListResult, error) {
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	total, err := uc.empRepo.Count(tenantID, filter)
	if err != nil {
		uc.log.Error("count employees failed", zap.String("tenant_id", tenantID), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("count employees: %v", err))
	}

	employees, err := uc.empRepo.List(tenantID, filter)
	if err != nil {
		uc.log.Error("list employees failed", zap.String("tenant_id", tenantID), zap.Error(err))
		return nil, domain.NewInternal(fmt.Sprintf("list employees: %v", err))
	}

	return &domain.EmployeeListResult{
		Data:   employees,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (uc *EmployeeUC) SoftDelete(id string) error {
	if err := uc.empRepo.SoftDelete(id); err != nil {
		uc.log.Error("soft delete employee failed", zap.String("emp_id", id), zap.Error(err))
		return domain.NewInternal("failed to delete employee")
	}
	uc.log.Info("employee soft deleted", zap.String("emp_id", id))
	return nil
}

func (uc *EmployeeUC) ChangeStatus(id, status string) error {
	validStatuses := map[string]bool{
		"active": true, "probation": true, "resigned": true,
		"terminated": true, "suspended": true,
	}
	if !validStatuses[status] {
		return domain.NewValidation("invalid employment status")
	}

	if err := uc.empRepo.UpdateStatus(id, status); err != nil {
		uc.log.Error("change employee status failed",
			zap.String("emp_id", id), zap.String("status", status), zap.Error(err))
		return domain.NewInternal("failed to change status")
	}

	uc.log.Info("employee status changed",
		zap.String("emp_id", id), zap.String("status", status))
	return nil
}
