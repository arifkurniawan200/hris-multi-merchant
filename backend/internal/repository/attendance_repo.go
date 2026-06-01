package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type AttendanceRepo struct {
	db adapter.DBTX
}

func NewAttendanceRepo(db adapter.DBTX) domain.AttendanceRepository {
	return &AttendanceRepo{db: db}
}

// dbQuerier returns the active transaction from context if available.
func (r *AttendanceRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var attColumns = `a.id, a.employee_id, a.tenant_id, a.clock_in, a.clock_out,
	a.clock_date::text, a.status, a.notes,
	a.latitude, a.longitude, a.selfie_url,
	a.created_at, a.updated_at, a.deleted_at`

var attJoinColumns = attColumns + `,
	COALESCE(e.first_name || ' ' || e.last_name, ''), COALESCE(e.employee_code, '')`

var attJoins = `LEFT JOIN employees e ON e.id = a.employee_id AND e.deleted_at IS NULL`

func scanAttendance(row pgx.Row) (*domain.Attendance, error) {
	var a domain.Attendance
	var deletedAt *time.Time
	var clockOut *time.Time

	err := row.Scan(
		&a.ID, &a.EmployeeID, &a.TenantID, &a.ClockIn, &clockOut,
		&a.ClockDate, &a.Status, &a.Notes,
		&a.Latitude, &a.Longitude, &a.SelfieURL,
		&a.CreatedAt, &a.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("attendance not found")
		}
		return nil, err
	}

	a.ClockOut = clockOut
	a.DeletedAt = deletedAt
	return &a, nil
}

func scanAttendanceWithJoin(row pgx.Row) (*domain.Attendance, error) {
	var a domain.Attendance
	var deletedAt *time.Time
	var clockOut *time.Time

	err := row.Scan(
		&a.ID, &a.EmployeeID, &a.TenantID, &a.ClockIn, &clockOut,
		&a.ClockDate, &a.Status, &a.Notes,
		&a.Latitude, &a.Longitude, &a.SelfieURL,
		&a.CreatedAt, &a.UpdatedAt, &deletedAt,
		&a.EmployeeName, &a.EmployeeCode,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("attendance not found")
		}
		return nil, err
	}

	a.ClockOut = clockOut
	a.DeletedAt = deletedAt
	return &a, nil
}

// ── CRUD ────────────────────────────────────────

func (r *AttendanceRepo) Create(ctx context.Context, a *domain.Attendance) error {
	query := `
		INSERT INTO attendances (
			id, employee_id, tenant_id, clock_in, clock_date,
			status, notes, latitude, longitude, selfie_url,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5::date,
			$6, $7, $8, $9, $10,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		a.ID, a.EmployeeID, a.TenantID, a.ClockIn, a.ClockDate,
		a.Status, a.Notes, a.Latitude, a.Longitude, a.SelfieURL,
	)
	return err
}

func (r *AttendanceRepo) GetToday(ctx context.Context, employeeID string) (*domain.Attendance, error) {
	today := time.Now().Format("2006-01-02")
	query := `SELECT ` + attColumns + ` FROM attendances a
		WHERE a.employee_id=$1 AND a.clock_date=$2::date AND a.deleted_at IS NULL`
	return scanAttendance(r.dbQuerier(ctx).QueryRow(ctx, query, employeeID, today))
}

// GetTodayForUpdate is used inside transactions for clock-in dedup (SELECT FOR UPDATE).
func (r *AttendanceRepo) GetTodayForUpdate(ctx context.Context, employeeID string) (*domain.Attendance, error) {
	today := time.Now().Format("2006-01-02")
	query := `SELECT ` + attColumns + ` FROM attendances a
		WHERE a.employee_id=$1 AND a.clock_date=$2::date AND a.deleted_at IS NULL
		FOR UPDATE`
	return scanAttendance(r.dbQuerier(ctx).QueryRow(ctx, query, employeeID, today))
}

func (r *AttendanceRepo) GetByID(ctx context.Context, id string) (*domain.Attendance, error) {
	query := `SELECT ` + attJoinColumns + ` FROM attendances a ` + attJoins +
		` WHERE a.id=$1 AND a.deleted_at IS NULL`
	return scanAttendanceWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *AttendanceRepo) UpdateClockOut(ctx context.Context, id string, clockOut time.Time, notes string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE attendances SET clock_out=$2, notes=$3, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id, clockOut, notes)
	return err
}

func (r *AttendanceRepo) ListByEmployee(ctx context.Context, employeeID string, limit, offset int) ([]domain.Attendance, error) {
	query := `SELECT ` + attColumns + ` FROM attendances a
		WHERE a.employee_id=$1 AND a.deleted_at IS NULL
		ORDER BY a.clock_date DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := make([]domain.Attendance, 0)
	for rows.Next() {
		var a domain.Attendance
		var deletedAt *time.Time
		var clockOut *time.Time

		if err := rows.Scan(
			&a.ID, &a.EmployeeID, &a.TenantID, &a.ClockIn, &clockOut,
			&a.ClockDate, &a.Status, &a.Notes,
			&a.Latitude, &a.Longitude, &a.SelfieURL,
			&a.CreatedAt, &a.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}

		a.ClockOut = clockOut
		a.DeletedAt = deletedAt
		attendances = append(attendances, a)
	}
	return attendances, rows.Err()
}

func (r *AttendanceRepo) ListByTenant(ctx context.Context, tenantID string, clockDate string, limit, offset int) ([]domain.Attendance, error) {
	query := `SELECT ` + attJoinColumns + ` FROM attendances a ` + attJoins +
		` WHERE a.tenant_id=$1 AND a.clock_date=$2::date AND a.deleted_at IS NULL
		ORDER BY e.first_name, e.last_name
		LIMIT $3 OFFSET $4`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, clockDate, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := make([]domain.Attendance, 0)
	for rows.Next() {
		var a domain.Attendance
		var deletedAt *time.Time
		var clockOut *time.Time

		if err := rows.Scan(
			&a.ID, &a.EmployeeID, &a.TenantID, &a.ClockIn, &clockOut,
			&a.ClockDate, &a.Status, &a.Notes,
			&a.Latitude, &a.Longitude, &a.SelfieURL,
			&a.CreatedAt, &a.UpdatedAt, &deletedAt,
			&a.EmployeeName, &a.EmployeeCode,
		); err != nil {
			return nil, err
		}

		a.ClockOut = clockOut
		a.DeletedAt = deletedAt
		attendances = append(attendances, a)
	}
	return attendances, rows.Err()
}

func (r *AttendanceRepo) CountByTenant(ctx context.Context, tenantID string, clockDate string) (int, error) {
	query := `SELECT COUNT(*) FROM attendances a
		WHERE a.tenant_id=$1 AND a.clock_date=$2::date AND a.deleted_at IS NULL`

	var count int
	err := r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, clockDate).Scan(&count)
	return count, err
}

// ListByTenantDateRange returns attendance records within a date range, joined with employee info.
func (r *AttendanceRepo) ListByTenantDateRange(ctx context.Context, tenantID string, dateFrom, dateTo string) ([]domain.Attendance, error) {
	query := `SELECT ` + attJoinColumns + ` FROM attendances a ` + attJoins +
		` WHERE a.tenant_id=$1 AND a.clock_date >= $2::date AND a.clock_date <= $3::date AND a.deleted_at IS NULL
		ORDER BY a.clock_date, e.first_name`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := make([]domain.Attendance, 0)
	for rows.Next() {
		var a domain.Attendance
		var deletedAt *time.Time
		var clockOut *time.Time

		if err := rows.Scan(
			&a.ID, &a.EmployeeID, &a.TenantID, &a.ClockIn, &clockOut,
			&a.ClockDate, &a.Status, &a.Notes,
			&a.Latitude, &a.Longitude, &a.SelfieURL,
			&a.CreatedAt, &a.UpdatedAt, &deletedAt,
			&a.EmployeeName, &a.EmployeeCode,
		); err != nil {
			return nil, err
		}

		a.ClockOut = clockOut
		a.DeletedAt = deletedAt
		attendances = append(attendances, a)
	}
	return attendances, rows.Err()
}

// CountByTenantDateRange returns the number of attendance records within a date range.
func (r *AttendanceRepo) CountByTenantDateRange(ctx context.Context, tenantID string, dateFrom, dateTo string) (int, error) {
	query := `SELECT COUNT(*) FROM attendances a
		WHERE a.tenant_id=$1 AND a.clock_date >= $2::date AND a.clock_date <= $3::date AND a.deleted_at IS NULL`

	var count int
	err := r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, dateFrom, dateTo).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}
