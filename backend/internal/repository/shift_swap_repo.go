package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type ShiftSwapRepo struct {
	db adapter.DBTX
}

func NewShiftSwapRepo(db adapter.DBTX) domain.ShiftSwapRepository {
	return &ShiftSwapRepo{db: db}
}

func (r *ShiftSwapRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var shiftSwapColumns = `ss.id, ss.tenant_id, ss.requester_employee_id,
	ss.requester_date::text, ss.target_employee_id, ss.target_date::text,
	ss.status, COALESCE(ss.reason, ''), COALESCE(ss.rejection_reason, ''),
	ss.reviewed_by, ss.reviewed_at,
	ss.created_at, ss.updated_at, ss.deleted_at`

var shiftSwapJoinColumns = shiftSwapColumns + `,
	COALESCE(req.first_name || ' ' || COALESCE(req.last_name, ''), ''),
	COALESCE(req.employee_code, ''),
	COALESCE(tgt.first_name || ' ' || COALESCE(tgt.last_name, ''), ''),
	COALESCE(tgt.employee_code, '')`

var shiftSwapJoins = `LEFT JOIN employees req ON req.id = ss.requester_employee_id AND req.deleted_at IS NULL
	LEFT JOIN employees tgt ON tgt.id = ss.target_employee_id AND tgt.deleted_at IS NULL`

func scanShiftSwap(row pgx.Row) (*domain.ShiftSwap, error) {
	var s domain.ShiftSwap
	var reviewedBy *string
	var reviewedAt *time.Time
	var deletedAt *time.Time
	err := row.Scan(
		&s.ID, &s.TenantID, &s.RequesterEmployeeID,
		&s.RequesterDate, &s.TargetEmployeeID, &s.TargetDate,
		&s.Status, &s.Reason, &s.RejectionReason,
		&reviewedBy, &reviewedAt,
		&s.CreatedAt, &s.UpdatedAt, &deletedAt,
		&s.RequesterName, &s.RequesterCode,
		&s.TargetName, &s.TargetCode,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("shift swap not found")
		}
		return nil, err
	}
	s.ReviewedBy = reviewedBy
	s.ReviewedAt = reviewedAt
	s.DeletedAt = deletedAt
	return &s, nil
}

func scanShiftSwapNoJoin(row pgx.Row) (*domain.ShiftSwap, error) {
	var s domain.ShiftSwap
	var reviewedBy *string
	var reviewedAt *time.Time
	var deletedAt *time.Time
	err := row.Scan(
		&s.ID, &s.TenantID, &s.RequesterEmployeeID,
		&s.RequesterDate, &s.TargetEmployeeID, &s.TargetDate,
		&s.Status, &s.Reason, &s.RejectionReason,
		&reviewedBy, &reviewedAt,
		&s.CreatedAt, &s.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("shift swap not found")
		}
		return nil, err
	}
	s.ReviewedBy = reviewedBy
	s.ReviewedAt = reviewedAt
	s.DeletedAt = deletedAt
	return &s, nil
}

func (r *ShiftSwapRepo) Create(ctx context.Context, s *domain.ShiftSwap) error {
	query := `
		INSERT INTO shift_swaps (
			id, tenant_id, requester_employee_id, requester_date,
			target_employee_id, target_date, status, reason,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4::date,
			$5, $6::date, $7, $8,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		s.ID, s.TenantID, s.RequesterEmployeeID, s.RequesterDate,
		s.TargetEmployeeID, s.TargetDate, s.Status, s.Reason,
	)
	return err
}

func (r *ShiftSwapRepo) GetByID(ctx context.Context, id string) (*domain.ShiftSwap, error) {
	query := `SELECT ` + shiftSwapJoinColumns + ` FROM shift_swaps ss ` + shiftSwapJoins +
		` WHERE ss.id=$1 AND ss.deleted_at IS NULL`
	return scanShiftSwap(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *ShiftSwapRepo) ListByTenant(ctx context.Context, tenantID string, status *domain.ShiftSwapStatus) ([]domain.ShiftSwap, error) {
	query := `SELECT ` + shiftSwapJoinColumns + ` FROM shift_swaps ss ` + shiftSwapJoins +
		` WHERE ss.tenant_id=$1 AND ss.deleted_at IS NULL`

	var args []interface{}
	args = append(args, tenantID)

	if status != nil {
		query += ` AND ss.status=$2`
		args = append(args, *status)
	}

	query += ` ORDER BY ss.created_at DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	swaps := make([]domain.ShiftSwap, 0)
	for rows.Next() {
		s, err := scanShiftSwap(rows)
		if err != nil {
			return nil, err
		}
		swaps = append(swaps, *s)
	}
	return swaps, rows.Err()
}

func (r *ShiftSwapRepo) ListByEmployee(ctx context.Context, employeeID string) ([]domain.ShiftSwap, error) {
	query := `SELECT ` + shiftSwapJoinColumns + ` FROM shift_swaps ss ` + shiftSwapJoins +
		` WHERE (ss.requester_employee_id=$1 OR ss.target_employee_id=$1)
		 AND ss.deleted_at IS NULL
		 ORDER BY ss.created_at DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	swaps := make([]domain.ShiftSwap, 0)
	for rows.Next() {
		s, err := scanShiftSwap(rows)
		if err != nil {
			return nil, err
		}
		swaps = append(swaps, *s)
	}
	return swaps, rows.Err()
}

func (r *ShiftSwapRepo) ListPendingForManager(ctx context.Context, tenantID string) ([]domain.ShiftSwap, error) {
	query := `SELECT ` + shiftSwapJoinColumns + ` FROM shift_swaps ss ` + shiftSwapJoins +
		` WHERE ss.tenant_id=$1 AND ss.status='pending' AND ss.deleted_at IS NULL
		 ORDER BY ss.created_at ASC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	swaps := make([]domain.ShiftSwap, 0)
	for rows.Next() {
		s, err := scanShiftSwap(rows)
		if err != nil {
			return nil, err
		}
		swaps = append(swaps, *s)
	}
	return swaps, rows.Err()
}

func (r *ShiftSwapRepo) UpdateStatus(ctx context.Context, id string, status domain.ShiftSwapStatus, reviewedBy, rejectionReason *string) error {
	query := `UPDATE shift_swaps SET status=$2, reviewed_by=$3, reviewed_at=NOW(), rejection_reason=$4, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL`
	_, err := r.dbQuerier(ctx).Exec(ctx, query, id, status, reviewedBy, rejectionReason)
	return err
}

func (r *ShiftSwapRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE shift_swaps SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}
