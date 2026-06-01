package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type ShiftRepo struct {
	db adapter.DBTX
}

func NewShiftRepo(db adapter.DBTX) domain.ShiftRepository {
	return &ShiftRepo{db: db}
}

func (r *ShiftRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var shiftColumns = `id, tenant_id, name, code, start_time::text, end_time::text,
	grace_minutes, clockin_window_before_minutes, clockout_window_after_minutes,
	is_flexible, color, created_at, updated_at, deleted_at`

func scanShift(row pgx.Row) (*domain.Shift, error) {
	var s domain.Shift
	var deletedAt *time.Time
	err := row.Scan(
		&s.ID, &s.TenantID, &s.Name, &s.Code, &s.StartTime, &s.EndTime,
		&s.GraceMinutes, &s.ClockinWindowBefore, &s.ClockoutWindowAfter,
		&s.IsFlexible, &s.Color,
		&s.CreatedAt, &s.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("shift not found")
		}
		return nil, err
	}
	s.DeletedAt = deletedAt
	return &s, nil
}

func (r *ShiftRepo) Create(ctx context.Context, s *domain.Shift) error {
	query := `
		INSERT INTO shifts (
			id, tenant_id, name, code, start_time, end_time,
			grace_minutes, clockin_window_before_minutes, clockout_window_after_minutes,
			is_flexible, color, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5::time, $6::time,
			$7, $8, $9,
			$10, $11, NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		s.ID, s.TenantID, s.Name, s.Code, s.StartTime, s.EndTime,
		s.GraceMinutes, s.ClockinWindowBefore, s.ClockoutWindowAfter,
		s.IsFlexible, s.Color,
	)
	return err
}

func (r *ShiftRepo) GetByID(ctx context.Context, id string) (*domain.Shift, error) {
	query := `SELECT ` + shiftColumns + ` FROM shifts WHERE id=$1 AND deleted_at IS NULL`
	return scanShift(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *ShiftRepo) GetByCode(ctx context.Context, tenantID, code string) (*domain.Shift, error) {
	query := `SELECT ` + shiftColumns + ` FROM shifts WHERE tenant_id=$1 AND code=$2 AND deleted_at IS NULL`
	return scanShift(r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, code))
}

func (r *ShiftRepo) Update(ctx context.Context, s *domain.Shift) error {
	query := `
		UPDATE shifts
		SET name=$2, code=$3, start_time=$4::time, end_time=$5::time,
			grace_minutes=$6, clockin_window_before_minutes=$7, clockout_window_after_minutes=$8,
			is_flexible=$9, color=$10, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		s.ID, s.Name, s.Code, s.StartTime, s.EndTime,
		s.GraceMinutes, s.ClockinWindowBefore, s.ClockoutWindowAfter,
		s.IsFlexible, s.Color,
	)
	return err
}

func (r *ShiftRepo) List(ctx context.Context, tenantID string) ([]domain.Shift, error) {
	query := `SELECT ` + shiftColumns + ` FROM shifts
		WHERE tenant_id=$1 AND deleted_at IS NULL
		ORDER BY start_time ASC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	shifts := make([]domain.Shift, 0)
	for rows.Next() {
		var s domain.Shift
		var deletedAt *time.Time
		if err := rows.Scan(
			&s.ID, &s.TenantID, &s.Name, &s.Code, &s.StartTime, &s.EndTime,
			&s.GraceMinutes, &s.ClockinWindowBefore, &s.ClockoutWindowAfter,
			&s.IsFlexible, &s.Color,
			&s.CreatedAt, &s.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		s.DeletedAt = deletedAt
		shifts = append(shifts, s)
	}
	return shifts, rows.Err()
}

func (r *ShiftRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE shifts SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}
