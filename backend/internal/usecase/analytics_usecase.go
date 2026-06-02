package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
)

type AnalyticsUC struct {
	repo domain.AnalyticsRepository
	// empRepo is kept for potential future use (e.g., employee count checks)
	empRepo domain.EmployeeRepository
}

func NewAnalyticsUC(repo domain.AnalyticsRepository, empRepo domain.EmployeeRepository) domain.AnalyticsUseCase {
	return &AnalyticsUC{repo: repo, empRepo: empRepo}
}

func (uc *AnalyticsUC) GetSummary(ctx context.Context, tenantID string) (*domain.AnalyticsSummary, error) {
	sinceDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02")

	deptDist, err := uc.repo.GetDepartmentDistribution(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "analytics: get department distribution failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("department distribution: %v", err))
	}

	empTypeDist, err := uc.repo.GetEmploymentTypeDistribution(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "analytics: get employment type distribution failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("employment type distribution: %v", err))
	}

	genderDist, err := uc.repo.GetGenderDistribution(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "analytics: get gender distribution failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("gender distribution: %v", err))
	}

	attendanceTrend, err := uc.repo.GetAttendanceTrend(ctx, tenantID, sinceDate)
	if err != nil {
		logger.Error(ctx, "analytics: get attendance trend failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("attendance trend: %v", err))
	}

	total, err := uc.repo.GetTotalEmployees(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "analytics: get total employees failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("total employees: %v", err))
	}

	return &domain.AnalyticsSummary{
		TotalEmployees:              total,
		DepartmentDistribution:     deptDist,
		EmploymentTypeDistribution: empTypeDist,
		GenderDistribution:         genderDist,
		AttendanceTrend:            attendanceTrend,
	}, nil
}
