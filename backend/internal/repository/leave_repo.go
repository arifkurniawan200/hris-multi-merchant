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

// ── LeaveTypeRepo ────────────────────────────────

type LeaveTypeRepo struct {
	db adapter.DBTX
}

func NewLeaveTypeRepo(db adapter.DBTX) domain.LeaveTypeRepository {
	return &LeaveTypeRepo{db: db}
}

func (r *LeaveTypeRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var ltColumns = `id, tenant_id, name, code, default_days_per_year,
	max_consecutive_days, is_paid, color,
	description, created_at, updated_at, deleted_at`

func scanLeaveType(row pgx.Row) (*domain.LeaveType, error) {
	var lt domain.LeaveType
	var deletedAt *time.Time
	err := row.Scan(
		&lt.ID, &lt.TenantID, &lt.Name, &lt.Code,
		&lt.DefaultDaysPerYear, &lt.MaxConsecutiveDays,
		&lt.IsPaid, &lt.Color,
		&lt.Description,
		&lt.CreatedAt, &lt.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("leave type not found")
		}
		return nil, err
	}
	lt.DeletedAt = deletedAt
	return &lt, nil
}

func (r *LeaveTypeRepo) Create(ctx context.Context, lt *domain.LeaveType) error {
	query := `
		INSERT INTO leave_types (
			id, tenant_id, name, code, default_days_per_year,
			max_consecutive_days, is_paid, color, description,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		lt.ID, lt.TenantID, lt.Name, lt.Code, lt.DefaultDaysPerYear,
		lt.MaxConsecutiveDays, lt.IsPaid, lt.Color, lt.Description,
	)
	return err
}

func (r *LeaveTypeRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.LeaveType, error) {
	query := `SELECT ` + ltColumns + ` FROM leave_types WHERE id=$1 AND deleted_at IS NULL`
	return scanLeaveType(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *LeaveTypeRepo) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.LeaveType, error) {
	query := `SELECT ` + ltColumns + ` FROM leave_types WHERE tenant_id=$1 AND code=$2 AND deleted_at IS NULL`
	return scanLeaveType(r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, code))
}

func (r *LeaveTypeRepo) List(ctx context.Context, tenantID uuid.UUID) ([]domain.LeaveType, error) {
	query := `SELECT ` + ltColumns + ` FROM leave_types
		WHERE tenant_id=$1 AND deleted_at IS NULL
		ORDER BY name ASC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	types := make([]domain.LeaveType, 0)
	for rows.Next() {
		var lt domain.LeaveType
		var deletedAt *time.Time
		if err := rows.Scan(
			&lt.ID, &lt.TenantID, &lt.Name, &lt.Code,
			&lt.DefaultDaysPerYear, &lt.MaxConsecutiveDays,
			&lt.IsPaid, &lt.Color,
			&lt.Description,
			&lt.CreatedAt, &lt.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		lt.DeletedAt = deletedAt
		types = append(types, lt)
	}
	return types, rows.Err()
}

func (r *LeaveTypeRepo) Update(ctx context.Context, lt *domain.LeaveType) error {
	query := `
		UPDATE leave_types
		SET name=$2, code=$3, default_days_per_year=$4,
			max_consecutive_days=$5, is_paid=$6, color=$7,
			description=$8, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		lt.ID, lt.Name, lt.Code, lt.DefaultDaysPerYear,
		lt.MaxConsecutiveDays, lt.IsPaid, lt.Color, lt.Description,
	)
	return err
}

func (r *LeaveTypeRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE leave_types SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

// ── LeaveRequestRepo ─────────────────────────────

type LeaveRequestRepo struct {
	db adapter.DBTX
}

func NewLeaveRequestRepo(db adapter.DBTX) domain.LeaveRequestRepository {
	return &LeaveRequestRepo{db: db}
}

func (r *LeaveRequestRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var lrColumns = `lr.id, lr.tenant_id, lr.employee_id, lr.leave_type_id,
	lr.start_date::text, lr.end_date::text, lr.total_days,
	lr.reason, lr.status,
	lr.reviewed_by, lr.reviewed_at, COALESCE(lr.reject_reason, ''),
	lr.cancelled_at,
	lr.created_at, lr.updated_at, lr.deleted_at`

var lrJoinColumns = lrColumns + `,
	COALESCE(e.first_name || ' ' || e.last_name, ''), COALESCE(e.employee_code, ''),
	COALESCE(lt.name, ''), COALESCE(lt.code, ''),
	COALESCE(rev.first_name || ' ' || rev.last_name, '')`

var lrJoins = `
	LEFT JOIN employees e ON e.id = lr.employee_id AND e.deleted_at IS NULL
	LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.deleted_at IS NULL
	LEFT JOIN employees rev ON rev.id = lr.reviewed_by AND rev.deleted_at IS NULL`

func scanLeaveRequest(row pgx.Row) (*domain.LeaveRequest, error) {
	var lr domain.LeaveRequest
	var deletedAt, reviewedAt, cancelledAt *time.Time

	err := row.Scan(
		&lr.ID, &lr.TenantID, &lr.EmployeeID, &lr.LeaveTypeID,
		&lr.StartDate, &lr.EndDate, &lr.TotalDays,
		&lr.Reason, &lr.Status,
		&lr.ReviewedBy, &reviewedAt, &lr.RejectReason,
		&cancelledAt,
		&lr.CreatedAt, &lr.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("leave request not found")
		}
		return nil, err
	}
	lr.DeletedAt = deletedAt
	lr.ReviewedAt = reviewedAt
	lr.CancelledAt = cancelledAt
	return &lr, nil
}

func scanLeaveRequestWithJoin(row pgx.Row) (*domain.LeaveRequest, error) {
	var lr domain.LeaveRequest
	var deletedAt, reviewedAt, cancelledAt *time.Time

	err := row.Scan(
		&lr.ID, &lr.TenantID, &lr.EmployeeID, &lr.LeaveTypeID,
		&lr.StartDate, &lr.EndDate, &lr.TotalDays,
		&lr.Reason, &lr.Status,
		&lr.ReviewedBy, &reviewedAt, &lr.RejectReason,
		&cancelledAt,
		&lr.CreatedAt, &lr.UpdatedAt, &deletedAt,
		&lr.EmployeeName, &lr.EmployeeCode,
		&lr.LeaveTypeName, &lr.LeaveTypeCode,
		&lr.ReviewerName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("leave request not found")
		}
		return nil, err
	}
	lr.DeletedAt = deletedAt
	lr.ReviewedAt = reviewedAt
	lr.CancelledAt = cancelledAt
	return &lr, nil
}

func (r *LeaveRequestRepo) Create(ctx context.Context, lr *domain.LeaveRequest) error {
	query := `
		INSERT INTO leave_requests (
			id, tenant_id, employee_id, leave_type_id,
			start_date, end_date, total_days,
			reason, status,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5::date, $6::date, $7,
			$8, $9,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		lr.ID, lr.TenantID, lr.EmployeeID, lr.LeaveTypeID,
		lr.StartDate, lr.EndDate, lr.TotalDays,
		lr.Reason, lr.Status,
	)
	return err
}

func (r *LeaveRequestRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.LeaveRequest, error) {
	query := `SELECT ` + lrJoinColumns + ` FROM leave_requests lr` + lrJoins +
		` WHERE lr.id=$1 AND lr.deleted_at IS NULL`
	return scanLeaveRequestWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *LeaveRequestRepo) ListByEmployee(ctx context.Context, employeeID uuid.UUID, limit, offset int) ([]domain.LeaveRequest, error) {
	query := `SELECT ` + lrJoinColumns + ` FROM leave_requests lr` + lrJoins +
		` WHERE lr.employee_id=$1 AND lr.deleted_at IS NULL
		ORDER BY lr.start_date DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]domain.LeaveRequest, 0)
	for rows.Next() {
		var lr domain.LeaveRequest
		var deletedAt, reviewedAt, cancelledAt *time.Time
		if err := rows.Scan(
			&lr.ID, &lr.TenantID, &lr.EmployeeID, &lr.LeaveTypeID,
			&lr.StartDate, &lr.EndDate, &lr.TotalDays,
			&lr.Reason, &lr.Status,
			&lr.ReviewedBy, &reviewedAt, &lr.RejectReason,
			&cancelledAt,
			&lr.CreatedAt, &lr.UpdatedAt, &deletedAt,
			&lr.EmployeeName, &lr.EmployeeCode,
			&lr.LeaveTypeName, &lr.LeaveTypeCode,
			&lr.ReviewerName,
		); err != nil {
			return nil, err
		}
		lr.DeletedAt = deletedAt
		lr.ReviewedAt = reviewedAt
		lr.CancelledAt = cancelledAt
		requests = append(requests, lr)
	}
	return requests, rows.Err()
}

func (r *LeaveRequestRepo) ListPending(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.LeaveRequest, error) {
	query := `SELECT ` + lrJoinColumns + ` FROM leave_requests lr` + lrJoins +
		` WHERE lr.tenant_id=$1 AND lr.status='pending' AND lr.deleted_at IS NULL
		ORDER BY lr.start_date ASC
		LIMIT $2 OFFSET $3`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]domain.LeaveRequest, 0)
	for rows.Next() {
		var lr domain.LeaveRequest
		var deletedAt, reviewedAt, cancelledAt *time.Time
		if err := rows.Scan(
			&lr.ID, &lr.TenantID, &lr.EmployeeID, &lr.LeaveTypeID,
			&lr.StartDate, &lr.EndDate, &lr.TotalDays,
			&lr.Reason, &lr.Status,
			&lr.ReviewedBy, &reviewedAt, &lr.RejectReason,
			&cancelledAt,
			&lr.CreatedAt, &lr.UpdatedAt, &deletedAt,
			&lr.EmployeeName, &lr.EmployeeCode,
			&lr.LeaveTypeName, &lr.LeaveTypeCode,
			&lr.ReviewerName,
		); err != nil {
			return nil, err
		}
		lr.DeletedAt = deletedAt
		lr.ReviewedAt = reviewedAt
		lr.CancelledAt = cancelledAt
		requests = append(requests, lr)
	}
	return requests, rows.Err()
}

func (r *LeaveRequestRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, filter domain.LeaveFilter, limit, offset int) ([]domain.LeaveRequest, error) {
	query := `SELECT ` + lrJoinColumns + ` FROM leave_requests lr` + lrJoins +
		` WHERE lr.tenant_id=$1 AND lr.deleted_at IS NULL`
	args := []interface{}{tenantID}
	argIdx := 2

	if filter.Status != "" {
		query += fmt.Sprintf(` AND lr.status=$%d`, argIdx)
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.EmployeeID != "" {
		query += fmt.Sprintf(` AND lr.employee_id=$%d`, argIdx)
		args = append(args, filter.EmployeeID)
		argIdx++
	}
	if filter.DateFrom != "" {
		query += fmt.Sprintf(` AND lr.start_date >= $%d::date`, argIdx)
		args = append(args, filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != "" {
		query += fmt.Sprintf(` AND lr.end_date <= $%d::date`, argIdx)
		args = append(args, filter.DateTo)
		argIdx++
	}

	query += ` ORDER BY lr.start_date DESC`
	query += fmt.Sprintf(` LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.dbQuerier(ctx).Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]domain.LeaveRequest, 0)
	for rows.Next() {
		var lr domain.LeaveRequest
		var deletedAt, reviewedAt, cancelledAt *time.Time
		if err := rows.Scan(
			&lr.ID, &lr.TenantID, &lr.EmployeeID, &lr.LeaveTypeID,
			&lr.StartDate, &lr.EndDate, &lr.TotalDays,
			&lr.Reason, &lr.Status,
			&lr.ReviewedBy, &reviewedAt, &lr.RejectReason,
			&cancelledAt,
			&lr.CreatedAt, &lr.UpdatedAt, &deletedAt,
			&lr.EmployeeName, &lr.EmployeeCode,
			&lr.LeaveTypeName, &lr.LeaveTypeCode,
			&lr.ReviewerName,
		); err != nil {
			return nil, err
		}
		lr.DeletedAt = deletedAt
		lr.ReviewedAt = reviewedAt
		lr.CancelledAt = cancelledAt
		requests = append(requests, lr)
	}
	return requests, rows.Err()
}

func (r *LeaveRequestRepo) CountByTenant(ctx context.Context, tenantID uuid.UUID, filter domain.LeaveFilter) (int, error) {
	query := `SELECT COUNT(*) FROM leave_requests lr
		WHERE lr.tenant_id=$1 AND lr.deleted_at IS NULL`
	args := []interface{}{tenantID}
	argIdx := 2

	if filter.Status != "" {
		query += fmt.Sprintf(` AND lr.status=$%d`, argIdx)
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.EmployeeID != "" {
		query += fmt.Sprintf(` AND lr.employee_id=$%d`, argIdx)
		args = append(args, filter.EmployeeID)
		argIdx++
	}
	if filter.DateFrom != "" {
		query += fmt.Sprintf(` AND lr.start_date >= $%d::date`, argIdx)
		args = append(args, filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != "" {
		query += fmt.Sprintf(` AND lr.end_date <= $%d::date`, argIdx)
		args = append(args, filter.DateTo)
		argIdx++
	}

	var count int
	err := r.dbQuerier(ctx).QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}

func (r *LeaveRequestRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewedBy uuid.UUID, rejectReason string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE leave_requests
		SET status=$2, reviewed_by=$3, reviewed_at=NOW(), reject_reason=$4, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL`,
		id, status, reviewedBy, rejectReason)
	return err
}

func (r *LeaveRequestRepo) Cancel(ctx context.Context, id uuid.UUID) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE leave_requests
		SET status='cancelled', cancelled_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

func (r *LeaveRequestRepo) HasOverlap(ctx context.Context, employeeID uuid.UUID, startDate, endDate string, excludeID *uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(
		SELECT 1 FROM leave_requests 
		WHERE employee_id=$1 
		  AND deleted_at IS NULL 
		  AND status NOT IN ('rejected','cancelled')
		  AND start_date <= $3::date 
		  AND end_date >= $2::date
		  AND ($4::uuid IS NULL OR id != $4)
	)`
	var exists bool
	err := r.dbQuerier(ctx).QueryRow(ctx, query, employeeID, startDate, endDate, excludeID).Scan(&exists)
	return exists, err
}

func (r *LeaveRequestRepo) GetUsedDays(ctx context.Context, employeeID, leaveTypeID uuid.UUID, year int) (int, error) {
	query := `SELECT COALESCE(SUM(total_days), 0)::int
		FROM leave_requests 
		WHERE employee_id=$1 
		  AND leave_type_id=$2 
		  AND deleted_at IS NULL 
		  AND status NOT IN ('rejected','cancelled')
		  AND EXTRACT(YEAR FROM start_date) = $3`

	var used int
	err := r.dbQuerier(ctx).QueryRow(ctx, query, employeeID, leaveTypeID, year).Scan(&used)
	return used, err
}

func (r *LeaveRequestRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE leave_requests SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}
