package usecase

import (
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
)

type EmployeeUC struct {
	empRepo  domain.EmployeeRepository
	deptRepo domain.DepartmentRepository
	posRepo  domain.PositionRepository
}

func NewEmployeeUC(
	empRepo domain.EmployeeRepository,
	deptRepo domain.DepartmentRepository,
	posRepo domain.PositionRepository,
) domain.EmployeeUseCase {
	return &EmployeeUC{
		empRepo:  empRepo,
		deptRepo: deptRepo,
		posRepo:  posRepo,
	}
}

func (uc *EmployeeUC) Create(req *domain.CreateEmployeeRequest) (*domain.Employee, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Check unique code within tenant
	existing, _ := uc.empRepo.GetByCode(req.TenantID, req.EmployeeCode)
	if existing != nil {
		return nil, domain.NewConflict("employee code already exists in this tenant")
	}

	// Validate department exists
	if req.DepartmentID != nil && *req.DepartmentID != "" {
		_, err := uc.deptRepo.GetByID(*req.DepartmentID)
		if err != nil {
			return nil, domain.NewValidation("department not found")
		}
	}

	// Validate position exists
	if req.PositionID != nil && *req.PositionID != "" {
		_, err := uc.posRepo.GetByID(*req.PositionID)
		if err != nil {
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
		return nil, domain.NewInternal(fmt.Sprintf("create employee: %v", err))
	}

	// Fetch back with joined fields
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
	return uc.empRepo.Update(e)
}

func (uc *EmployeeUC) List(tenantID string, filter domain.EmployeeFilter) (*domain.EmployeeListResult, error) {
	// Defaults
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	total, err := uc.empRepo.Count(tenantID, filter)
	if err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("count employees: %v", err))
	}

	employees, err := uc.empRepo.List(tenantID, filter)
	if err != nil {
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
	return uc.empRepo.SoftDelete(id)
}

func (uc *EmployeeUC) ChangeStatus(id, status string) error {
	e, err := uc.empRepo.GetByID(id)
	if err != nil {
		return domain.NewNotFound("employee not found")
	}

	validStatuses := map[string]bool{
		"active": true, "probation": true, "resigned": true,
		"terminated": true, "suspended": true,
	}
	if !validStatuses[status] {
		return domain.NewValidation("invalid employment status")
	}

	_ = e
	return uc.empRepo.UpdateStatus(id, status)
}
