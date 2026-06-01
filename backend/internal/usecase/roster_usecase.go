package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
)

type RosterUC struct {
	rosterRepo domain.RosterRepository
	empRepo    domain.EmployeeRepository
	shiftRepo  domain.ShiftRepository
}

func NewRosterUC(rosterRepo domain.RosterRepository, empRepo domain.EmployeeRepository, shiftRepo domain.ShiftRepository) domain.RosterUseCase {
	return &RosterUC{
		rosterRepo: rosterRepo,
		empRepo:    empRepo,
		shiftRepo:  shiftRepo,
	}
}

func (uc *RosterUC) GetRoster(ctx context.Context, tenantID string, dateFrom, dateTo string) (*domain.RosterResponse, error) {
	employees, err := uc.rosterRepo.GetEmployees(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "roster: get employees failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("get employees: %v", err))
	}

	assignments, err := uc.rosterRepo.GetAssignments(ctx, tenantID, dateFrom, dateTo)
	if err != nil {
		logger.Error(ctx, "roster: get assignments failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("get assignments: %v", err))
	}

	return &domain.RosterResponse{
		Employees:   employees,
		Assignments: assignments,
	}, nil
}
