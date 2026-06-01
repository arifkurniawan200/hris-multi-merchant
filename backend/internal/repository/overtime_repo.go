package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type OvertimeRepo struct {
	db adapter.DBTX
}

func NewOvertimeRepo(db adapter.DBTX) domain.OvertimeRepository {
	return &OvertimeRepo{db: db}
}

func (r *OvertimeRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var overtimeCols = `ot.id, ot.tenant_id, ot.employee_id, ot.date::text, ot.start_time::text, ot.end_time::text,
	ot.total_hours, ot.reason, ot.status, ot.reviewed_by, ot.reviewed_at,
	ot.reject_reason, ot.cancelled_at, ot.created_at, ot.updated_at, ot.deleted_at,
	COALESCE(e.first_name || ' ' || e.last_name, ''), COALESCE(e.employee_code, '')`

var overtimeJoins = `LEFT JOIN employees e ON e.id = ot.employee_id AND e.deleted_at IS NULL`

func scanOvertime(row pgx.Row) (*domain.OvertimeRequest, error) {
	var ot domain.OvertimeRequest
	var createdAt, updatedAt time.Time
	var reviewedAt, cancelledAt, deletedAt *time.Time
	var date, startTime, endTime string

	err := row.Scan(
		&ot.ID, &ot.TenantID, &ot.EmployeeID, &date, &startTime, &endTime,
		&ot.TotalHours, &ot.Reason, &ot.Status, &ot.ReviewedBy, &reviewedAt,
		&ot.RejectReason, &cancelledAt, &createdAt, &updatedAt, &deletedAt,
		&ot.EmployeeName, &ot.EmployeeCode,
	)
	if err != nil {
		return nil, fmt.Errorf("scan overtime: %w", err)
	}

	ot.Date = date
	ot.StartTime = startTime
	ot.EndTime = endTime
	ot.CreatedAt = createdAt
	ot.UpdatedAt = updatedAt
	ot.ReviewedAt = reviewedAt
	ot.CancelledAt = cancelledAt
	ot.DeletedAt = deletedAt
	return &ot, nil
}

func scanOvertimes(rows pgx.Rows) ([]domain.OvertimeRequest, error) {
	result := make([]domain.OvertimeRequest, 0)
	for rows.Next() {
		ot, err := scanOvertime(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *ot)
	}
	return result, nil
}

func (r *OvertimeRepo) Create(ctx context.Context, ot *domain.OvertimeRequest) error {
	q := `INSERT INTO overtime_requests (id, tenant_id, employee_id, date, start_time, end_time, total_hours, reason, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`
	_, err := r.dbQuerier(ctx).Exec(ctx, q,
		ot.ID, ot.TenantID, ot.EmployeeID, ot.Date, ot.StartTime, ot.EndTime,
		ot.TotalHours, ot.Reason, ot.Status,
	)
	if err != nil {
		return fmt.Errorf("create overtime: %w", err)
	}
	return nil
}

func (r *OvertimeRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.OvertimeRequest, error) {
	q := `SELECT ` + overtimeCols + ` FROM overtime_requests ot ` + overtimeJoins + ` WHERE ot.id = $1 AND ot.deleted_at IS NULL`
	row := r.dbQuerier(ctx).QueryRow(ctx, q, id)
	return scanOvertime(row)
}

func (r *OvertimeRepo) ListByEmployee(ctx context.Context, employeeID uuid.UUID, limit, offset int) ([]domain.OvertimeRequest, error) {
	q := `SELECT ` + overtimeCols + ` FROM overtime_requests ot ` + overtimeJoins +
		` WHERE ot.employee_id = $1 AND ot.deleted_at IS NULL ORDER BY ot.created_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.dbQuerier(ctx).Query(ctx, q, employeeID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list my overtime: %w", err)
	}
	defer rows.Close()
	return scanOvertimes(rows)
}

func (r *OvertimeRepo) ListPending(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.OvertimeRequest, error) {
	q := `SELECT ` + overtimeCols + ` FROM overtime_requests ot ` + overtimeJoins +
		` WHERE ot.tenant_id = $1 AND ot.status = 'pending' AND ot.deleted_at IS NULL ORDER BY ot.created_at ASC LIMIT $2 OFFSET $3`
	rows, err := r.dbQuerier(ctx).Query(ctx, q, tenantID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list pending overtime: %w", err)
	}
	defer rows.Close()
	return scanOvertimes(rows)
}

func (r *OvertimeRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.OvertimeStatus, reviewedBy uuid.UUID, rejectReason string) error {
	q := `UPDATE overtime_requests SET status=$1, reviewed_by=$2, reviewed_at=NOW(), reject_reason=$3, updated_at=NOW() WHERE id=$4 AND deleted_at IS NULL`
	res, err := r.dbQuerier(ctx).Exec(ctx, q, status, reviewedBy, rejectReason, id)
	if err != nil {
		return fmt.Errorf("update overtime status: %w", err)
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *OvertimeRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	q := `UPDATE overtime_requests SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`
	res, err := r.dbQuerier(ctx).Exec(ctx, q, id)
	if err != nil {
		return fmt.Errorf("soft delete overtime: %w", err)
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
