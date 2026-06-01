package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

// ── PayrollConfigRepo ─────────────────────────────

type PayrollConfigRepo struct {
	db adapter.DBTX
}

func NewPayrollConfigRepo(db adapter.DBTX) domain.PayrollConfigRepository {
	return &PayrollConfigRepo{db: db}
}

func (r *PayrollConfigRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var pcColumns = `id, tenant_id, daily_salary_ratio, late_penalty_amount, absent_penalty_amount, overtime_rate, created_at, updated_at`

func scanPayrollConfig(row pgx.Row) (*domain.PayrollConfig, error) {
	var c domain.PayrollConfig
	err := row.Scan(
		&c.ID, &c.TenantID,
		&c.DailySalaryRatio, &c.LatePenaltyAmount, &c.AbsentPenalty,
		&c.OvertimeRate,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("payroll config not found")
		}
		return nil, err
	}
	return &c, nil
}

func (r *PayrollConfigRepo) Get(ctx context.Context, tenantID string) (*domain.PayrollConfig, error) {
	query := `SELECT ` + pcColumns + ` FROM payroll_configs WHERE tenant_id=$1`
	return scanPayrollConfig(r.dbQuerier(ctx).QueryRow(ctx, query, tenantID))
}

func (r *PayrollConfigRepo) Upsert(ctx context.Context, cfg *domain.PayrollConfig) error {
	query := `
		INSERT INTO payroll_configs (id, tenant_id, daily_salary_ratio, late_penalty_amount, absent_penalty_amount, overtime_rate, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (tenant_id) DO UPDATE SET
			daily_salary_ratio = EXCLUDED.daily_salary_ratio,
			late_penalty_amount = EXCLUDED.late_penalty_amount,
			absent_penalty_amount = EXCLUDED.absent_penalty_amount,
			overtime_rate = EXCLUDED.overtime_rate,
			updated_at = NOW()
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		cfg.ID, cfg.TenantID,
		cfg.DailySalaryRatio, cfg.LatePenaltyAmount, cfg.AbsentPenalty,
		cfg.OvertimeRate,
	)
	return err
}

// ── PayrollRepo ──────────────────────────────────

type PayrollRepo struct {
	db adapter.DBTX
}

func NewPayrollRepo(db adapter.DBTX) domain.PayrollRepository {
	return &PayrollRepo{db: db}
}

func (r *PayrollRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var prColumns = `p.id, p.tenant_id, p.employee_id, p.period_year, p.period_month,
	p.base_salary, p.overtime_pay, p.late_deduction, p.absent_deduction,
	p.leave_deduction, p.reimbursement, p.net_salary, p.status,
	COALESCE(p.notes, ''),
	p.approved_by, p.approved_at, p.paid_at,
	p.created_at, p.updated_at, p.deleted_at`

var prJoinColumns = prColumns + `,
	COALESCE(e.first_name || ' ' || e.last_name, ''),
	COALESCE(e.employee_code, ''),
	COALESCE(d.name, ''),
	COALESCE(pos.name, '')`

var prJoins = `LEFT JOIN employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
	LEFT JOIN departments d ON d.id = e.department_id AND d.deleted_at IS NULL
	LEFT JOIN positions pos ON pos.id = e.position_id AND pos.deleted_at IS NULL`

func scanPayroll(row pgx.Row) (*domain.Payroll, error) {
	var p domain.Payroll
	var deletedAt, approvedAt, paidAt *time.Time
	var notes string

	err := row.Scan(
		&p.ID, &p.TenantID, &p.EmployeeID, &p.PeriodYear, &p.PeriodMonth,
		&p.BaseSalary, &p.OvertimePay, &p.LateDeduction, &p.AbsentDeduction,
		&p.LeaveDeduction, &p.Reimbursement, &p.NetSalary, &p.Status,
		&notes,
		&p.ApprovedBy, &approvedAt, &paidAt,
		&p.CreatedAt, &p.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("payroll not found")
		}
		return nil, err
	}
	p.Notes = notes
	p.DeletedAt = deletedAt
	p.ApprovedAt = approvedAt
	p.PaidAt = paidAt
	return &p, nil
}

func scanPayrollWithJoin(row pgx.Row) (*domain.Payroll, error) {
	var p domain.Payroll
	var deletedAt, approvedAt, paidAt *time.Time
	var notes string

	err := row.Scan(
		&p.ID, &p.TenantID, &p.EmployeeID, &p.PeriodYear, &p.PeriodMonth,
		&p.BaseSalary, &p.OvertimePay, &p.LateDeduction, &p.AbsentDeduction,
		&p.LeaveDeduction, &p.Reimbursement, &p.NetSalary, &p.Status,
		&notes,
		&p.ApprovedBy, &approvedAt, &paidAt,
		&p.CreatedAt, &p.UpdatedAt, &deletedAt,
		&p.EmployeeName, &p.EmployeeCode,
		&p.DepartmentName, &p.PositionName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("payroll not found")
		}
		return nil, err
	}
	p.Notes = notes
	p.DeletedAt = deletedAt
	p.ApprovedAt = approvedAt
	p.PaidAt = paidAt
	return &p, nil
}

func scanPayrolls(rows pgx.Rows) ([]domain.Payroll, error) {
	result := make([]domain.Payroll, 0)
	for rows.Next() {
		var p domain.Payroll
		var deletedAt, approvedAt, paidAt *time.Time
		var notes string

		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.EmployeeID, &p.PeriodYear, &p.PeriodMonth,
			&p.BaseSalary, &p.OvertimePay, &p.LateDeduction, &p.AbsentDeduction,
			&p.LeaveDeduction, &p.Reimbursement, &p.NetSalary, &p.Status,
			&notes,
			&p.ApprovedBy, &approvedAt, &paidAt,
			&p.CreatedAt, &p.UpdatedAt, &deletedAt,
			&p.EmployeeName, &p.EmployeeCode,
			&p.DepartmentName, &p.PositionName,
		); err != nil {
			return nil, err
		}
		p.Notes = notes
		p.DeletedAt = deletedAt
		p.ApprovedAt = approvedAt
		p.PaidAt = paidAt
		result = append(result, p)
	}
	return result, rows.Err()
}

func (r *PayrollRepo) Create(ctx context.Context, p *domain.Payroll) error {
	query := `
		INSERT INTO payrolls (
			id, tenant_id, employee_id, period_year, period_month,
			base_salary, overtime_pay, late_deduction, absent_deduction,
			leave_deduction, reimbursement, net_salary, status,
			notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		p.ID, p.TenantID, p.EmployeeID, p.PeriodYear, p.PeriodMonth,
		p.BaseSalary, p.OvertimePay, p.LateDeduction, p.AbsentDeduction,
		p.LeaveDeduction, p.Reimbursement, p.NetSalary, p.Status,
		p.Notes,
	)
	return err
}

func (r *PayrollRepo) GetByID(ctx context.Context, id string) (*domain.Payroll, error) {
	query := `SELECT ` + prJoinColumns + ` FROM payrolls p ` + prJoins +
		` WHERE p.id=$1 AND p.deleted_at IS NULL`
	return scanPayrollWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *PayrollRepo) ListByPeriod(ctx context.Context, tenantID string, year, month int, limit, offset int) ([]domain.Payroll, int, error) {
	// Count
	countQuery := `SELECT COUNT(*) FROM payrolls p
		WHERE p.tenant_id=$1 AND p.period_year=$2 AND p.period_month=$3 AND p.deleted_at IS NULL`
	var total int
	err := r.dbQuerier(ctx).QueryRow(ctx, countQuery, tenantID, year, month).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Data
	dataQuery := `SELECT ` + prJoinColumns + ` FROM payrolls p ` + prJoins +
		` WHERE p.tenant_id=$1 AND p.period_year=$2 AND p.period_month=$3 AND p.deleted_at IS NULL
		ORDER BY e.first_name, e.last_name
		LIMIT $4 OFFSET $5`

	rows, err := r.dbQuerier(ctx).Query(ctx, dataQuery, tenantID, year, month, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	payrolls, err := scanPayrolls(rows)
	if err != nil {
		return nil, 0, err
	}
	return payrolls, total, nil
}

func (r *PayrollRepo) ListByEmployeePeriod(ctx context.Context, employeeID string, year, month int) ([]domain.Payroll, error) {
	query := `SELECT ` + prJoinColumns + ` FROM payrolls p ` + prJoins +
		` WHERE p.employee_id=$1 AND p.period_year=$2 AND p.period_month=$3 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, year, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanPayrolls(rows)
}

func (r *PayrollRepo) GetByEmployeePeriod(ctx context.Context, employeeID string, year, month int) (*domain.Payroll, error) {
	query := `SELECT ` + prColumns + ` FROM payrolls p
		WHERE p.employee_id=$1 AND p.period_year=$2 AND p.period_month=$3 AND p.deleted_at IS NULL`
	return scanPayroll(r.dbQuerier(ctx).QueryRow(ctx, query, employeeID, year, month))
}

func (r *PayrollRepo) UpdateStatus(ctx context.Context, id string, status domain.PayrollStatus, byUser string, paidAt *time.Time) error {
	query := `UPDATE payrolls SET status=$1, updated_at=NOW()`
	args := []interface{}{status}
	argIdx := 2

	if status == domain.PayrollApproved {
		query += fmt.Sprintf(`, approved_by=$%d, approved_at=NOW()`, argIdx)
		args = append(args, byUser)
		argIdx++
	}
	if status == domain.PayrollPaid {
		query += fmt.Sprintf(`, paid_at=$%d`, argIdx)
		args = append(args, paidAt)
		argIdx++
	}

	query += fmt.Sprintf(` WHERE id=$%d AND deleted_at IS NULL`, argIdx)
	args = append(args, id)

	res, err := r.dbQuerier(ctx).Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
