package repository

import (
	"context"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
)

type AnalyticsRepo struct {
	db adapter.DBTX
}

func NewAnalyticsRepo(db adapter.DBTX) domain.AnalyticsRepository {
	return &AnalyticsRepo{db: db}
}

func (r *AnalyticsRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *AnalyticsRepo) GetDepartmentDistribution(ctx context.Context, tenantID string) ([]domain.DepartmentDistribution, error) {
	query := `
		SELECT d.name, COUNT(e.id)
		FROM departments d
		LEFT JOIN employees e ON e.department_id = d.id AND e.deleted_at IS NULL AND e.tenant_id = $1
		WHERE d.deleted_at IS NULL AND d.tenant_id = $1
		GROUP BY d.name
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.DepartmentDistribution
	for rows.Next() {
		var item domain.DepartmentDistribution
		if err := rows.Scan(&item.DepartmentName, &item.EmployeeCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepo) GetEmploymentTypeDistribution(ctx context.Context, tenantID string) ([]domain.EmploymentTypeDistribution, error) {
	query := `
		SELECT employment_type, COUNT(*)
		FROM employees
		WHERE deleted_at IS NULL AND tenant_id = $1
		GROUP BY employment_type
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.EmploymentTypeDistribution
	for rows.Next() {
		var item domain.EmploymentTypeDistribution
		if err := rows.Scan(&item.Type, &item.Count); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepo) GetGenderDistribution(ctx context.Context, tenantID string) ([]domain.GenderDistribution, error) {
	query := `
		SELECT gender, COUNT(*)
		FROM employees
		WHERE deleted_at IS NULL AND tenant_id = $1
		GROUP BY gender
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.GenderDistribution
	for rows.Next() {
		var item domain.GenderDistribution
		if err := rows.Scan(&item.Gender, &item.Count); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepo) GetAttendanceTrend(ctx context.Context, tenantID string, sinceDate string) ([]domain.AttendanceTrendItem, error) {
	query := `
		SELECT clock_date::text,
			COUNT(*) FILTER (WHERE status = 'present') as present,
			COUNT(*) FILTER (WHERE status = 'late') as late,
			COUNT(*) FILTER (WHERE status = 'absent') as absent,
			COUNT(*) FILTER (WHERE status = 'half_day') as half_day
		FROM attendances
		WHERE tenant_id = $1 AND clock_date >= $2::date
		GROUP BY clock_date
		ORDER BY clock_date
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, sinceDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.AttendanceTrendItem
	for rows.Next() {
		var item domain.AttendanceTrendItem
		if err := rows.Scan(&item.Date, &item.Present, &item.Late, &item.Absent, &item.HalfDay); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
