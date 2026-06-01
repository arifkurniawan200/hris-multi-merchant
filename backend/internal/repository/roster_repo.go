package repository

import (
	"context"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
)

type RosterRepo struct {
	db adapter.DBTX
}

func NewRosterRepo(db adapter.DBTX) domain.RosterRepository {
	return &RosterRepo{db: db}
}

func (r *RosterRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *RosterRepo) GetEmployees(ctx context.Context, tenantID string) ([]domain.RosterEmployee, error) {
	query := `
		SELECT e.id, e.employee_code, e.first_name, e.last_name,
			COALESCE(d.name, '')
		FROM employees e
		LEFT JOIN departments d ON d.id = e.department_id AND d.deleted_at IS NULL
		WHERE e.tenant_id = $1 AND e.deleted_at IS NULL
		ORDER BY e.first_name
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	employees := make([]domain.RosterEmployee, 0)
	for rows.Next() {
		var emp domain.RosterEmployee
		if err := rows.Scan(&emp.ID, &emp.EmployeeCode, &emp.FirstName, &emp.LastName, &emp.DepartmentName); err != nil {
			return nil, err
		}
		employees = append(employees, emp)
	}
	return employees, rows.Err()
}

func (r *RosterRepo) GetAssignments(ctx context.Context, tenantID string, dateFrom, dateTo string) ([]domain.RosterAssignment, error) {
	query := `
		SELECT es.id, es.employee_id, es.shift_id,
			COALESCE(s.name, '') as shift_name, COALESCE(s.code, '') as shift_code,
			COALESCE(s.start_time::text, '') as start_time, COALESCE(s.end_time::text, '') as end_time,
			COALESCE(s.color, '') as color,
			es.effective_from::text, es.effective_to::text
		FROM employee_shifts es
		JOIN shifts s ON s.id = es.shift_id AND s.deleted_at IS NULL
		WHERE es.tenant_id = $1 AND es.deleted_at IS NULL
			AND es.effective_from <= $3::date
			AND (es.effective_to IS NULL OR es.effective_to >= $2::date)
		ORDER BY es.effective_from
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	assignments := make([]domain.RosterAssignment, 0)
	for rows.Next() {
		var a domain.RosterAssignment
		if err := rows.Scan(
			&a.ID, &a.EmployeeID, &a.ShiftID,
			&a.ShiftName, &a.ShiftCode,
			&a.StartTime, &a.EndTime, &a.Color,
			&a.EffectiveFrom, &a.EffectiveTo,
		); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}
