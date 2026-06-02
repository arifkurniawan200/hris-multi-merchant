package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
)

type DashboardUC struct {
	repo          domain.DashboardRepository
	employeeRepo  domain.EmployeeRepository
}

func NewDashboardUC(repo domain.DashboardRepository, employeeRepo domain.EmployeeRepository) domain.DashboardUseCase {
	return &DashboardUC{repo: repo, employeeRepo: employeeRepo}
}

func (uc *DashboardUC) GetSummary(ctx context.Context, tenantID string, userID string, role string) (*domain.DashboardSummary, error) {
	isMgmt := role == "super_admin" || role == "tenant_admin" || role == "manager"

	// For manager+, return team-wide stats and pending approvals
	if isMgmt {
		todayStats, err := uc.repo.GetTodayAttendanceStats(ctx, tenantID)
		if err != nil {
			logger.Error(ctx, "dashboard: get today stats failed", "tenant_id", tenantID, "error", err)
			return nil, domain.NewInternal(fmt.Sprintf("today stats: %v", err))
		}

		pendingCounts, err := uc.repo.GetPendingCounts(ctx, tenantID)
		if err != nil {
			logger.Error(ctx, "dashboard: get pending counts failed", "tenant_id", tenantID, "error", err)
			return nil, domain.NewInternal(fmt.Sprintf("pending counts: %v", err))
		}

		recent, err := uc.repo.GetRecentAttendance(ctx, tenantID, 10)
		if err != nil {
			logger.Error(ctx, "dashboard: get recent attendance failed", "tenant_id", tenantID, "error", err)
			return nil, domain.NewInternal(fmt.Sprintf("recent attendance: %v", err))
		}

		return &domain.DashboardSummary{
			TodayStats:       todayStats,
			PendingApprovals: pendingCounts,
			RecentAttendance: recent,
		}, nil
	}

	// For employee, return personal attendance
	employee, err := uc.employeeRepo.GetByUserID(ctx, tenantID, userID)
	if err != nil {
		logger.Error(ctx, "dashboard: get employee by userID failed", "user_id", userID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("employee lookup: %v", err))
	}

	recent, err := uc.repo.GetEmployeeRecentAttendance(ctx, employee.ID, 10)
	if err != nil {
		logger.Error(ctx, "dashboard: get employee recent attendance failed", "employee_id", employee.ID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("recent attendance: %v", err))
	}

	return &domain.DashboardSummary{
		RecentAttendance: recent,
	}, nil
}
