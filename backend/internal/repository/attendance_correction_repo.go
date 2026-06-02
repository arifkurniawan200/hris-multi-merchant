package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type AttendanceCorrectionRepo struct {
	db adapter.DBTX
}

func NewAttendanceCorrectionRepo(db adapter.DBTX) domain.AttendanceCorrectionRepository {
	return &AttendanceCorrectionRepo{db: db}
}

func (r *AttendanceCorrectionRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var attCorrColumns = `ac.id, ac.tenant_id, ac.employee_id, ac.attendance_id, ac.type,
	ac.clock_date::text, ac.current_clock_in, ac.requested_clock_in,
	ac.current_clock_out, ac.requested_clock_out, ac.reason, ac.status,
	ac.approved_by, ac.approved_at, ac.reject_reason,
	ac.created_at, ac.updated_at, ac.deleted_at`

var attCorrJoinColumns = attCorrColumns + `,
	COALESCE(e.first_name || ' ' || e.last_name, ''), COALESCE(e.employee_code, '')`

var attCorrJoins = `LEFT JOIN employees e ON e.id = ac.employee_id AND e.deleted_at IS NULL`

func scanCorrection(row pgx.Row) (*domain.AttendanceCorrection, error) {
	var c domain.AttendanceCorrection
	var deletedAt *time.Time
	var approvedBy *string
	var approvedAt *time.Time
	var rejectReason *string
	var currentClockIn *time.Time
	var requestedClockIn *time.Time
	var currentClockOut *time.Time
	var requestedClockOut *time.Time
	var clockDate string

	err := row.Scan(
		&c.ID, &c.TenantID, &c.EmployeeID, &c.AttendanceID, &c.Type,
		&clockDate, &currentClockIn, &requestedClockIn,
		&currentClockOut, &requestedClockOut, &c.Reason, &c.Status,
		&approvedBy, &approvedAt, &rejectReason,
		&c.CreatedAt, &c.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.NewNotFound("attendance correction not found")
		}
		return nil, domain.NewInternal(fmt.Sprintf("scan correction: %v", err))
	}

	c.ClockDate = clockDate
	c.CurrentClockIn = currentClockIn
	c.RequestedClockIn = requestedClockIn
	c.CurrentClockOut = currentClockOut
	c.RequestedClockOut = requestedClockOut
	c.ApprovedBy = approvedBy
	c.ApprovedAt = approvedAt
	c.RejectReason = rejectReason
	c.DeletedAt = deletedAt
	return &c, nil
}

func scanCorrectionWithJoin(row pgx.Row) (*domain.AttendanceCorrection, error) {
	var c domain.AttendanceCorrection
	var deletedAt *time.Time
	var approvedBy *string
	var approvedAt *time.Time
	var rejectReason *string
	var currentClockIn *time.Time
	var requestedClockIn *time.Time
	var currentClockOut *time.Time
	var requestedClockOut *time.Time
	var clockDate string

	err := row.Scan(
		&c.ID, &c.TenantID, &c.EmployeeID, &c.AttendanceID, &c.Type,
		&clockDate, &currentClockIn, &requestedClockIn,
		&currentClockOut, &requestedClockOut, &c.Reason, &c.Status,
		&approvedBy, &approvedAt, &rejectReason,
		&c.CreatedAt, &c.UpdatedAt, &deletedAt,
		&c.EmployeeName, &c.EmployeeCode,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.NewNotFound("attendance correction not found")
		}
		return nil, domain.NewInternal(fmt.Sprintf("scan correction: %v", err))
	}

	c.ClockDate = clockDate
	c.CurrentClockIn = currentClockIn
	c.RequestedClockIn = requestedClockIn
	c.CurrentClockOut = currentClockOut
	c.RequestedClockOut = requestedClockOut
	c.ApprovedBy = approvedBy
	c.ApprovedAt = approvedAt
	c.RejectReason = rejectReason
	c.DeletedAt = deletedAt
	return &c, nil
}

// ── CRUD ────────────────────────────────────────

func (r *AttendanceCorrectionRepo) Create(ctx context.Context, c *domain.AttendanceCorrection) error {
	query := `
		INSERT INTO attendance_corrections (
			id, tenant_id, employee_id, attendance_id, type, clock_date,
			current_clock_in, requested_clock_in, current_clock_out, requested_clock_out,
			reason, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6::date,
			$7, $8, $9, $10,
			$11, $12, NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		c.ID, c.TenantID, c.EmployeeID, c.AttendanceID, c.Type, c.ClockDate,
		c.CurrentClockIn, c.RequestedClockIn, c.CurrentClockOut, c.RequestedClockOut,
		c.Reason, c.Status,
	)
	if err != nil {
		return domain.NewInternal(fmt.Sprintf("create attendance correction: %v", err))
	}
	return nil
}

func (r *AttendanceCorrectionRepo) GetByID(ctx context.Context, id string) (*domain.AttendanceCorrection, error) {
	query := `SELECT ` + attCorrJoinColumns + ` FROM attendance_corrections ac ` + attCorrJoins +
		` WHERE ac.id = $1 AND ac.deleted_at IS NULL`
	return scanCorrectionWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *AttendanceCorrectionRepo) ListByTenant(ctx context.Context, tenantID, status string, limit, offset int) ([]domain.AttendanceCorrection, int, error) {
	// Count query
	countQuery := `SELECT COUNT(*) FROM attendance_corrections ac
		WHERE ac.tenant_id = $1 AND ac.status = $2 AND ac.deleted_at IS NULL`
	var total int
	err := r.dbQuerier(ctx).QueryRow(ctx, countQuery, tenantID, status).Scan(&total)
	if err != nil {
		return nil, 0, domain.NewInternal(fmt.Sprintf("count corrections: %v", err))
	}

	// Data query
	query := `SELECT ` + attCorrJoinColumns + ` FROM attendance_corrections ac ` + attCorrJoins +
		` WHERE ac.tenant_id = $1 AND ac.status = $2 AND ac.deleted_at IS NULL
		ORDER BY ac.created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, status, limit, offset)
	if err != nil {
		return nil, 0, domain.NewInternal(fmt.Sprintf("list corrections: %v", err))
	}
	defer rows.Close()

	corrections := make([]domain.AttendanceCorrection, 0)
	for rows.Next() {
		c, err := scanCorrectionWithJoin(rows)
		if err != nil {
			return nil, 0, err
		}
		corrections = append(corrections, *c)
	}
	if rows.Err() != nil {
		return nil, 0, domain.NewInternal(fmt.Sprintf("iterate corrections: %v", rows.Err()))
	}

	return corrections, total, nil
}

func (r *AttendanceCorrectionRepo) ListByEmployee(ctx context.Context, employeeID string, limit, offset int) ([]domain.AttendanceCorrection, error) {
	query := `SELECT ` + attCorrJoinColumns + ` FROM attendance_corrections ac ` + attCorrJoins +
		` WHERE ac.employee_id = $1 AND ac.deleted_at IS NULL
		ORDER BY ac.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, limit, offset)
	if err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("list employee corrections: %v", err))
	}
	defer rows.Close()

	corrections := make([]domain.AttendanceCorrection, 0)
	for rows.Next() {
		c, err := scanCorrectionWithJoin(rows)
		if err != nil {
			return nil, err
		}
		corrections = append(corrections, *c)
	}
	if rows.Err() != nil {
		return nil, domain.NewInternal(fmt.Sprintf("iterate employee corrections: %v", rows.Err()))
	}

	return corrections, nil
}

func (r *AttendanceCorrectionRepo) UpdateStatus(ctx context.Context, id string, status domain.CorrectionStatus, approvedBy string, rejectReason string) error {
	var query string
	var args []interface{}

	if status == domain.CorrectionApproved {
		query = `UPDATE attendance_corrections SET status=$1, approved_by=$2, approved_at=NOW(), updated_at=NOW() WHERE id=$3 AND deleted_at IS NULL`
		args = []interface{}{status, approvedBy, id}
	} else {
		query = `UPDATE attendance_corrections SET status=$1, approved_by=$2, reject_reason=$3, updated_at=NOW() WHERE id=$4 AND deleted_at IS NULL`
		args = []interface{}{status, approvedBy, rejectReason, id}
	}

	res, err := r.dbQuerier(ctx).Exec(ctx, query, args...)
	if err != nil {
		return domain.NewInternal(fmt.Sprintf("update correction status: %v", err))
	}
	if res.RowsAffected() == 0 {
		return domain.NewNotFound("attendance correction not found")
	}
	return nil
}

func (r *AttendanceCorrectionRepo) GetByAttendanceID(ctx context.Context, attendanceID string) ([]domain.AttendanceCorrection, error) {
	query := `SELECT ` + attCorrColumns + ` FROM attendance_corrections ac
		WHERE ac.attendance_id = $1 AND ac.deleted_at IS NULL
		ORDER BY ac.created_at DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, attendanceID)
	if err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("get corrections by attendance: %v", err))
	}
	defer rows.Close()

	corrections := make([]domain.AttendanceCorrection, 0)
	for rows.Next() {
		c, err := scanCorrection(rows)
		if err != nil {
			return nil, err
		}
		corrections = append(corrections, *c)
	}
	if rows.Err() != nil {
		return nil, domain.NewInternal(fmt.Sprintf("iterate corrections by attendance: %v", rows.Err()))
	}

	return corrections, nil
}
