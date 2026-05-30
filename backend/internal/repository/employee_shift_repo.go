package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type EmployeeShiftRepo struct {
	db adapter.DBTX
}

func NewEmployeeShiftRepo(db adapter.DBTX) domain.EmployeeShiftRepository {
	return &EmployeeShiftRepo{db: db}
}

func (r *EmployeeShiftRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var empShiftColumns = `es.id, es.tenant_id, es.employee_id, es.shift_id,
	es.effective_from::text, es.effective_to::text,
	es.created_at, es.updated_at, es.deleted_at`

var empShiftJoinColumns = empShiftColumns + `,
	COALESCE(s.name, ''), COALESCE(s.code, ''),
	COALESCE(s.start_time::text, ''), COALESCE(s.end_time::text, ''),
	COALESCE(s.grace_minutes, 0), COALESCE(s.clockin_window_before_minutes, 0),
	COALESCE(s.clockout_window_after_minutes, 0), COALESCE(s.is_flexible, false)`

var empShiftJoins = `LEFT JOIN shifts s ON s.id = es.shift_id AND s.deleted_at IS NULL`

func scanEmployeeShift(row pgx.Row) (*domain.EmployeeShift, error) {
	var es domain.EmployeeShift
	var effectiveTo *string
	var deletedAt *time.Time
	err := row.Scan(
		&es.ID, &es.TenantID, &es.EmployeeID, &es.ShiftID,
		&es.EffectiveFrom, &effectiveTo,
		&es.CreatedAt, &es.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("employee shift assignment not found")
		}
		return nil, err
	}
	es.EffectiveTo = effectiveTo
	es.DeletedAt = deletedAt
	return &es, nil
}

func scanEmployeeShiftWithJoin(row pgx.Row) (*domain.EmployeeShift, error) {
	var es domain.EmployeeShift
	var effectiveTo *string
	var deletedAt *time.Time
	err := row.Scan(
		&es.ID, &es.TenantID, &es.EmployeeID, &es.ShiftID,
		&es.EffectiveFrom, &effectiveTo,
		&es.CreatedAt, &es.UpdatedAt, &deletedAt,
		&es.ShiftName, &es.ShiftCode, &es.StartTime, &es.EndTime,
		&es.GraceMinutes, &es.ClockinWindowBefore, &es.ClockoutWindowAfter,
		&es.IsFlexible,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("employee shift assignment not found")
		}
		return nil, err
	}
	es.EffectiveTo = effectiveTo
	es.DeletedAt = deletedAt
	return &es, nil
}

func (r *EmployeeShiftRepo) Create(ctx context.Context, es *domain.EmployeeShift) error {
	query := `
		INSERT INTO employee_shifts (
			id, tenant_id, employee_id, shift_id,
			effective_from, effective_to,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5::date, $6::date,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		es.ID, es.TenantID, es.EmployeeID, es.ShiftID,
		es.EffectiveFrom, es.EffectiveTo,
	)
	return err
}

func (r *EmployeeShiftRepo) GetByID(ctx context.Context, id string) (*domain.EmployeeShift, error) {
	query := `SELECT ` + empShiftJoinColumns + ` FROM employee_shifts es ` + empShiftJoins +
		` WHERE es.id=$1 AND es.deleted_at IS NULL`
	return scanEmployeeShiftWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

// GetActive returns the active shift assignment for an employee on a given date.
// Matches: effective_from <= onDate AND (effective_to IS NULL OR effective_to >= onDate)
func (r *EmployeeShiftRepo) GetActive(ctx context.Context, employeeID, onDate string) (*domain.EmployeeShift, error) {
	query := `SELECT ` + empShiftJoinColumns + ` FROM employee_shifts es ` + empShiftJoins +
		` WHERE es.employee_id=$1 AND es.effective_from <= $2::date
		 AND (es.effective_to IS NULL OR es.effective_to >= $2::date)
		 AND es.deleted_at IS NULL
		 ORDER BY es.effective_from DESC
		 LIMIT 1`
	return scanEmployeeShiftWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, employeeID, onDate))
}

// GetActiveByEmployee is an alias for GetActive — used by attendance usecase.
func (r *EmployeeShiftRepo) GetActiveByEmployee(ctx context.Context, employeeID, onDate string) (*domain.EmployeeShift, error) {
	return r.GetActive(ctx, employeeID, onDate)
}

func (r *EmployeeShiftRepo) ListByEmployee(ctx context.Context, employeeID string) ([]domain.EmployeeShift, error) {
	query := `SELECT ` + empShiftJoinColumns + ` FROM employee_shifts es ` + empShiftJoins +
		` WHERE es.employee_id=$1 AND es.deleted_at IS NULL
		 ORDER BY es.effective_from DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []domain.EmployeeShift
	for rows.Next() {
		var es domain.EmployeeShift
		var effectiveTo *string
		var deletedAt *time.Time
		if err := rows.Scan(
			&es.ID, &es.TenantID, &es.EmployeeID, &es.ShiftID,
			&es.EffectiveFrom, &effectiveTo,
			&es.CreatedAt, &es.UpdatedAt, &deletedAt,
			&es.ShiftName, &es.ShiftCode, &es.StartTime, &es.EndTime,
			&es.GraceMinutes, &es.ClockinWindowBefore, &es.ClockoutWindowAfter,
			&es.IsFlexible,
		); err != nil {
			return nil, err
		}
		es.EffectiveTo = effectiveTo
		es.DeletedAt = deletedAt
		assignments = append(assignments, es)
	}
	return assignments, rows.Err()
}

func (r *EmployeeShiftRepo) ListByShift(ctx context.Context, shiftID string) ([]domain.EmployeeShift, error) {
	query := `SELECT ` + empShiftJoinColumns + ` FROM employee_shifts es ` + empShiftJoins +
		` WHERE es.shift_id=$1 AND es.deleted_at IS NULL
		 ORDER BY es.effective_from DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, shiftID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []domain.EmployeeShift
	for rows.Next() {
		var es domain.EmployeeShift
		var effectiveTo *string
		var deletedAt *time.Time
		if err := rows.Scan(
			&es.ID, &es.TenantID, &es.EmployeeID, &es.ShiftID,
			&es.EffectiveFrom, &effectiveTo,
			&es.CreatedAt, &es.UpdatedAt, &deletedAt,
			&es.ShiftName, &es.ShiftCode, &es.StartTime, &es.EndTime,
			&es.GraceMinutes, &es.ClockinWindowBefore, &es.ClockoutWindowAfter,
			&es.IsFlexible,
		); err != nil {
			return nil, err
		}
		es.EffectiveTo = effectiveTo
		es.DeletedAt = deletedAt
		assignments = append(assignments, es)
	}
	return assignments, rows.Err()
}

func (r *EmployeeShiftRepo) Update(ctx context.Context, es *domain.EmployeeShift) error {
	query := `
		UPDATE employee_shifts
		SET shift_id=$2, effective_from=$3::date, effective_to=$4::date, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		es.ID, es.ShiftID, es.EffectiveFrom, es.EffectiveTo,
	)
	return err
}

func (r *EmployeeShiftRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE employee_shifts SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}
