package repository

import (
	"context"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
)

type DashboardRepo struct {
	db adapter.DBTX
}

func NewDashboardRepo(db adapter.DBTX) domain.DashboardRepository {
	return &DashboardRepo{db: db}
}

func (r *DashboardRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *DashboardRepo) GetTodayAttendanceStats(ctx context.Context, tenantID string) (*domain.TodayStats, error) {
	query := `
		SELECT
			COALESCE(COUNT(*) FILTER (WHERE status = 'present'), 0) as present_count,
			COALESCE(COUNT(*) FILTER (WHERE status = 'late'), 0) as late_count,
			COALESCE(COUNT(*) FILTER (WHERE status = 'absent'), 0) as absent_count,
			COALESCE(COUNT(*) FILTER (WHERE status = 'half_day'), 0) as half_day_count
		FROM attendances
		WHERE tenant_id = $1 AND clock_date = CURRENT_DATE AND deleted_at IS NULL
	`
	var present, late, absent, halfDay int
	if err := r.dbQuerier(ctx).QueryRow(ctx, query, tenantID).Scan(&present, &late, &absent, &halfDay); err != nil {
		return nil, err
	}

	// Count total employees and on-leave
	totalQuery := `
		SELECT COUNT(*) FROM employees
		WHERE tenant_id = $1 AND deleted_at IS NULL AND employment_status = 'active'
	`
	var total int
	if err := r.dbQuerier(ctx).QueryRow(ctx, totalQuery, tenantID).Scan(&total); err != nil {
		return nil, err
	}

	onLeaveQuery := `
		SELECT COUNT(*) FROM leave_requests
		WHERE tenant_id = $1 AND status = 'approved'
			AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date
			AND deleted_at IS NULL
	`
	var onLeave int
	if err := r.dbQuerier(ctx).QueryRow(ctx, onLeaveQuery, tenantID).Scan(&onLeave); err != nil {
		return nil, err
	}

	return &domain.TodayStats{
		TotalEmployees: total,
		PresentCount:   present,
		LateCount:      late,
		AbsentCount:    absent,
		OnLeaveCount:   onLeave,
	}, nil
}

func (r *DashboardRepo) GetPendingCounts(ctx context.Context, tenantID string) (*domain.PendingCounts, error) {
	query := `
		SELECT
			(SELECT COUNT(*) FROM attendance_corrections WHERE status = 'pending' AND tenant_id = $1 AND deleted_at IS NULL) as corrections,
			(SELECT COUNT(*) FROM leave_requests WHERE status = 'pending' AND tenant_id = $1 AND deleted_at IS NULL) as leaves,
			(SELECT COUNT(*) FROM overtime_requests WHERE status = 'pending' AND tenant_id = $1 AND deleted_at IS NULL) as overtime,
			(SELECT COUNT(*) FROM reimbursements WHERE status = 'pending' AND tenant_id = $1 AND deleted_at IS NULL) as reimbursements,
			(SELECT COUNT(*) FROM shift_swaps WHERE status = 'pending' AND tenant_id = $1 AND deleted_at IS NULL) as shift_swaps
	`
	var counts domain.PendingCounts
	if err := r.dbQuerier(ctx).QueryRow(ctx, query, tenantID).Scan(
		&counts.Corrections,
		&counts.Leaves,
		&counts.Overtime,
		&counts.Reimbursements,
		&counts.ShiftSwaps,
	); err != nil {
		return nil, err
	}
	return &counts, nil
}

func (r *DashboardRepo) GetRecentAttendance(ctx context.Context, tenantID string, limit int) ([]domain.AttendanceRecord, error) {
	query := `
		SELECT a.id, a.employee_id, e.first_name || ' ' || COALESCE(e.last_name, '') as employee_name,
			e.employee_code, a.clock_in, a.clock_out, a.clock_date::text, a.status
		FROM attendances a
		JOIN employees e ON e.id = a.employee_id AND e.deleted_at IS NULL
		WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
		ORDER BY a.clock_in DESC
		LIMIT $2
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var rec domain.AttendanceRecord
		var clockOut *time.Time
		if err := rows.Scan(&rec.ID, &rec.EmployeeID, &rec.EmployeeName, &rec.EmployeeCode,
			&rec.ClockIn, &clockOut, &rec.ClockDate, &rec.Status); err != nil {
			return nil, err
		}
		rec.ClockOut = clockOut
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (r *DashboardRepo) GetEmployeeRecentAttendance(ctx context.Context, employeeID string, limit int) ([]domain.AttendanceRecord, error) {
	query := `
		SELECT id, employee_id, '' as employee_name, '' as employee_code,
			clock_in, clock_out, clock_date::text, status
		FROM attendances
		WHERE employee_id = $1 AND deleted_at IS NULL
		ORDER BY clock_date DESC
		LIMIT $2
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var rec domain.AttendanceRecord
		var clockOut *time.Time
		if err := rows.Scan(&rec.ID, &rec.EmployeeID, &rec.EmployeeName, &rec.EmployeeCode,
			&rec.ClockIn, &clockOut, &rec.ClockDate, &rec.Status); err != nil {
			return nil, err
		}
		rec.ClockOut = clockOut
		records = append(records, rec)
	}
	return records, rows.Err()
}
