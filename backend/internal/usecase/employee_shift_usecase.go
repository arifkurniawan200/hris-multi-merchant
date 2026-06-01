package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type EmployeeShiftUC struct {
	esRepo   domain.EmployeeShiftRepository
	shiftRepo domain.ShiftRepository
}

func NewEmployeeShiftUC(esRepo domain.EmployeeShiftRepository, shiftRepo domain.ShiftRepository) domain.EmployeeShiftUseCase {
	return &EmployeeShiftUC{esRepo: esRepo, shiftRepo: shiftRepo}
}

// Assign assigns a shift to an employee.
func (uc *EmployeeShiftUC) Assign(ctx context.Context, req *domain.AssignShiftRequest) (*domain.EmployeeShift, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Verify shift exists
	shift, err := uc.shiftRepo.GetByID(ctx, req.ShiftID)
	if err != nil {
		return nil, domain.NewNotFound("shift not found")
	}
	_ = shift // shift exists, used for logging

	es := &domain.EmployeeShift{
		ID:            uuid.New().String(),
		TenantID:      shift.TenantID,
		EmployeeID:    req.EmployeeID,
		ShiftID:       req.ShiftID,
		EffectiveFrom: req.EffectiveFrom,
		EffectiveTo:   req.EffectiveTo,
	}

	if err := uc.esRepo.Create(ctx, es); err != nil {
		logger.Error(ctx, "assign shift failed",
			"employee_id", req.EmployeeID,
			"shift_id", req.ShiftID,
			"error", err)
		return nil, domain.NewInternal(fmt.Sprintf("assign shift: %v", err))
	}

	logger.Info(ctx, "shift assigned",
		"assignment_id", es.ID,
		"employee_id", es.EmployeeID,
		"shift_id", es.ShiftID,
		"effective_from", es.EffectiveFrom)

	return uc.esRepo.GetByID(ctx, es.ID)
}

// Get returns a single assignment by ID.
func (uc *EmployeeShiftUC) Get(ctx context.Context, id string) (*domain.EmployeeShift, error) {
	es, err := uc.esRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("employee shift assignment not found")
	}
	return es, nil
}

// GetActive returns the active shift for an employee on a given date.
func (uc *EmployeeShiftUC) GetActive(ctx context.Context, employeeID, onDate string) (*domain.EmployeeShift, error) {
	es, err := uc.esRepo.GetActive(ctx, employeeID, onDate)
	if err != nil {
		return nil, domain.NewNotFound("no active shift assignment for this date")
	}
	return es, nil
}

// Update updates an existing assignment.
func (uc *EmployeeShiftUC) Update(ctx context.Context, es *domain.EmployeeShift) error {
	if err := uc.esRepo.Update(ctx, es); err != nil {
		logger.Error(ctx, "update employee shift failed", "assignment_id", es.ID, "error", err)
		return domain.NewInternal(fmt.Sprintf("update assignment: %v", err))
	}
	logger.Info(ctx, "employee shift updated", "assignment_id", es.ID)
	return nil
}

// ListByEmployee returns all shift assignments for an employee.
func (uc *EmployeeShiftUC) ListByEmployee(ctx context.Context, employeeID string) ([]domain.EmployeeShift, error) {
	assignments, err := uc.esRepo.ListByEmployee(ctx, employeeID)
	if err != nil {
		logger.Error(ctx, "list employee shifts failed", "employee_id", employeeID, "error", err)
		return nil, domain.NewInternal("failed to list employee shifts")
	}
	return assignments, nil
}

// ListByShift returns all employees assigned to a shift.
func (uc *EmployeeShiftUC) ListByShift(ctx context.Context, shiftID string) ([]domain.EmployeeShift, error) {
	assignments, err := uc.esRepo.ListByShift(ctx, shiftID)
	if err != nil {
		logger.Error(ctx, "list shift employees failed", "shift_id", shiftID, "error", err)
		return nil, domain.NewInternal("failed to list shift employees")
	}
	return assignments, nil
}

// ListAll returns all shift assignments across the tenant with employee info.
func (uc *EmployeeShiftUC) ListAll(ctx context.Context, tenantID string) ([]domain.EmployeeShift, error) {
	assignments, err := uc.esRepo.ListAllByTenant(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "list all shift assignments failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal("failed to list shift assignments")
	}
	return assignments, nil
}

// RemoveAssignment soft-deletes an assignment.
func (uc *EmployeeShiftUC) RemoveAssignment(ctx context.Context, id string) error {
	if err := uc.esRepo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "remove shift assignment failed", "assignment_id", id, "error", err)
		return domain.NewInternal("failed to remove assignment")
	}
	logger.Info(ctx, "shift assignment removed", "assignment_id", id)
	return nil
}

// BulkAssign assigns a shift to multiple employees at once.
func (uc *EmployeeShiftUC) BulkAssign(ctx context.Context, req *domain.BulkAssignShiftRequest) ([]domain.EmployeeShift, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Verify shift exists
	shift, err := uc.shiftRepo.GetByID(ctx, req.ShiftID)
	if err != nil {
		return nil, domain.NewNotFound("shift not found")
	}

	var assignments []domain.EmployeeShift
	for _, empID := range req.EmployeeIDs {
		es := &domain.EmployeeShift{
			ID:            uuid.New().String(),
			TenantID:      shift.TenantID,
			EmployeeID:    empID,
			ShiftID:       req.ShiftID,
			EffectiveFrom: req.EffectiveFrom,
			EffectiveTo:   req.EffectiveTo,
		}
		if err := uc.esRepo.Create(ctx, es); err != nil {
			logger.Error(ctx, "bulk assign shift failed for employee",
				"employee_id", empID,
				"shift_id", req.ShiftID,
				"error", err)
			return assignments, domain.NewInternal(fmt.Sprintf("bulk assign failed for employee %s: %v", empID, err))
		}
		assignments = append(assignments, *es)
	}

	logger.Info(ctx, "bulk shift assignment complete",
		"shift_id", req.ShiftID,
		"count", len(assignments),
		"effective_from", req.EffectiveFrom)

	return assignments, nil
}
