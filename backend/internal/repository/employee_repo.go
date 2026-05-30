package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EmployeeRepo struct {
	db *pgxpool.Pool
}

func NewEmployeeRepo(db *pgxpool.Pool) domain.EmployeeRepository {
	return &EmployeeRepo{db: db}
}

var empColumns = `e.id, e.tenant_id, e.user_id, e.employee_code, e.first_name, e.last_name,
	e.gender, e.birth_date::text, e.birth_place, e.email, e.phone, e.address,
	e.department_id, e.position_id, e.manager_id,
	e.employment_status, e.employment_type, e.join_date::text,
	e.resign_date::text, e.contract_start::text, e.contract_end::text,
	e.national_id, e.tax_id, e.bpjs_health, e.bpjs_labor,
	e.base_salary, e.bank_name, e.bank_account,
	e.custom_fields, e.notes,
	e.created_at, e.updated_at, e.deleted_at,
	COALESCE(d.name, ''), COALESCE(p.name, ''), COALESCE(m.first_name || ' ' || m.last_name, '')`

var empJoins = `LEFT JOIN departments d ON d.id = e.department_id AND d.deleted_at IS NULL
	LEFT JOIN positions   p ON p.id = e.position_id   AND p.deleted_at IS NULL
	LEFT JOIN employees   m ON m.id = e.manager_id     AND m.deleted_at IS NULL`

func scanEmployee(row pgx.Row) (*domain.Employee, error) {
	var e domain.Employee
	var deletedAt *time.Time
	var birthDate, joinDate *string
	var resignDate, contractStart, contractEnd *string
	var customFields domain.JSONB

	err := row.Scan(
		&e.ID, &e.TenantID, &e.UserID, &e.EmployeeCode, &e.FirstName, &e.LastName,
		&e.Gender, &birthDate, &e.BirthPlace, &e.Email, &e.Phone, &e.Address,
		&e.DepartmentID, &e.PositionID, &e.ManagerID,
		&e.EmploymentStatus, &e.EmploymentType, &joinDate,
		&resignDate, &contractStart, &contractEnd,
		&e.NationalID, &e.TaxID, &e.BPJSHealth, &e.BPJSLabor,
		&e.BaseSalary, &e.BankName, &e.BankAccount,
		&customFields, &e.Notes,
		&e.CreatedAt, &e.UpdatedAt, &deletedAt,
		&e.DepartmentName, &e.PositionName, &e.ManagerName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("employee not found")
		}
		return nil, err
	}

	e.DeletedAt = deletedAt
	e.BirthDate = birthDate
	e.JoinDate = ptrToStr(joinDate)
	e.ResignDate = ptrToStr(resignDate)
	e.ContractStart = ptrToStr(contractStart)
	e.ContractEnd = ptrToStr(contractEnd)
	if customFields == nil {
		e.CustomFields = domain.JSONB{}
	} else {
		e.CustomFields = customFields
	}

	return &e, nil
}

func ptrToStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func infoPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ── CRUD ────────────────────────────────────────

func (r *EmployeeRepo) Create(ctx context.Context, e *domain.Employee) error {
	query := `
		INSERT INTO employees (
			id, tenant_id, user_id, employee_code, first_name, last_name,
			gender, birth_date::date, birth_place, email, phone, address,
			department_id, position_id, manager_id,
			employment_status, employment_type, join_date::date,
			resign_date::date, contract_start::date, contract_end::date,
			national_id, tax_id, bpjs_health, bpjs_labor,
			base_salary, bank_name, bank_account,
			custom_fields, notes,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,
			NULLIF($7,''), NULLIF($8,'')::date, $9, $10, $11, $12,
			$13, $14, $15,
			$16, $17, $18::date,
			NULLIF($19,'')::date, NULLIF($20,'')::date, NULLIF($21,'')::date,
			$22, $23, $24, $25,
			$26, $27, $28,
			COALESCE($29, '{}'::jsonb), $30,
			NOW(), NOW()
		)
	`
	_, err := r.db.Exec(ctx, query,
		e.ID, e.TenantID, e.UserID, e.EmployeeCode, e.FirstName, e.LastName,
		e.Gender, e.BirthDate, e.BirthPlace, e.Email, e.Phone, e.Address,
		e.DepartmentID, e.PositionID, e.ManagerID,
		e.EmploymentStatus, e.EmploymentType, e.JoinDate,
		e.ResignDate, e.ContractStart, e.ContractEnd,
		e.NationalID, e.TaxID, e.BPJSHealth, e.BPJSLabor,
		e.BaseSalary, e.BankName, e.BankAccount,
		e.CustomFields, e.Notes,
	)
	return err
}

func (r *EmployeeRepo) GetByID(ctx context.Context, id string) (*domain.Employee, error) {
	query := `SELECT ` + empColumns + ` FROM employees e ` + empJoins + ` WHERE e.id=$1 AND e.deleted_at IS NULL`
	return scanEmployee(r.db.QueryRow(ctx, query, id))
}

func (r *EmployeeRepo) GetByCode(ctx context.Context, tenantID, code string) (*domain.Employee, error) {
	query := `SELECT ` + empColumns + ` FROM employees e ` + empJoins + ` WHERE e.tenant_id=$1 AND e.employee_code=$2 AND e.deleted_at IS NULL`
	return scanEmployee(r.db.QueryRow(ctx, query, tenantID, code))
}

func (r *EmployeeRepo) Update(ctx context.Context, e *domain.Employee) error {
	query := `
		UPDATE employees SET
			first_name=$2, last_name=$3, gender=NULLIF($4,''),
			birth_date=NULLIF($5,'')::date, birth_place=$6,
			email=$7, phone=$8, address=$9,
			department_id=$10, position_id=$11, manager_id=$12,
			employee_code=$13,
			employment_status=$14, employment_type=$15,
			join_date=$16::date,
			resign_date=NULLIF($17,'')::date,
			contract_start=NULLIF($18,'')::date, contract_end=NULLIF($19,'')::date,
			national_id=$20, tax_id=$21, bpjs_health=$22, bpjs_labor=$23,
			base_salary=$24, bank_name=$25, bank_account=$26,
			custom_fields=COALESCE($27, '{}'::jsonb), notes=$28,
			updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query,
		e.ID, e.FirstName, e.LastName, e.Gender,
		e.BirthDate, e.BirthPlace,
		e.Email, e.Phone, e.Address,
		e.DepartmentID, e.PositionID, e.ManagerID, e.EmployeeCode,
		e.EmploymentStatus, e.EmploymentType, e.JoinDate,
		e.ResignDate, e.ContractStart, e.ContractEnd,
		e.NationalID, e.TaxID, e.BPJSHealth, e.BPJSLabor,
		e.BaseSalary, e.BankName, e.BankAccount,
		e.CustomFields, e.Notes,
	)
	return err
}

func (r *EmployeeRepo) List(ctx context.Context, tenantID string, filter domain.EmployeeFilter) ([]domain.Employee, error) {
	query := `SELECT ` + empColumns + ` FROM employees e ` + empJoins
	var conditions []string
	args := []interface{}{tenantID}

	conditions = append(conditions, `e.tenant_id=$1`)
	conditions = append(conditions, `e.deleted_at IS NULL`)

	argIdx := 2
	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf(`e.employment_status=$%d`, argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.DepartmentID != "" {
		conditions = append(conditions, fmt.Sprintf(`e.department_id=$%d`, argIdx))
		args = append(args, filter.DepartmentID)
		argIdx++
	}
	if filter.PositionID != "" {
		conditions = append(conditions, fmt.Sprintf(`e.position_id=$%d`, argIdx))
		args = append(args, filter.PositionID)
		argIdx++
	}
	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			`(e.first_name ILIKE $%d OR e.last_name ILIKE $%d OR e.employee_code ILIKE $%d OR e.email ILIKE $%d)`,
			argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	query += ` WHERE ` + strings.Join(conditions, ` AND `)
	query += ` ORDER BY e.join_date DESC`
	query += fmt.Sprintf(` LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var employees []domain.Employee
	for rows.Next() {
		var e domain.Employee
		var deletedAt *time.Time
		var birthDate, joinDate *string
		var resignDate, contractStart, contractEnd *string
		var customFields domain.JSONB

		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.UserID, &e.EmployeeCode, &e.FirstName, &e.LastName,
			&e.Gender, &birthDate, &e.BirthPlace, &e.Email, &e.Phone, &e.Address,
			&e.DepartmentID, &e.PositionID, &e.ManagerID,
			&e.EmploymentStatus, &e.EmploymentType, &joinDate,
			&resignDate, &contractStart, &contractEnd,
			&e.NationalID, &e.TaxID, &e.BPJSHealth, &e.BPJSLabor,
			&e.BaseSalary, &e.BankName, &e.BankAccount,
			&customFields, &e.Notes,
			&e.CreatedAt, &e.UpdatedAt, &deletedAt,
			&e.DepartmentName, &e.PositionName, &e.ManagerName,
		); err != nil {
			return nil, err
		}

		e.DeletedAt = deletedAt
		e.BirthDate = birthDate
		e.JoinDate = ptrToStr(joinDate)
		e.ResignDate = ptrToStr(resignDate)
		e.ContractStart = ptrToStr(contractStart)
		e.ContractEnd = ptrToStr(contractEnd)
		if customFields == nil {
			e.CustomFields = domain.JSONB{}
		} else {
			e.CustomFields = customFields
		}
		employees = append(employees, e)
	}
	return employees, rows.Err()
}

func (r *EmployeeRepo) Count(ctx context.Context, tenantID string, filter domain.EmployeeFilter) (int, error) {
	query := `SELECT COUNT(*) FROM employees e`
	var conditions []string
	args := []interface{}{tenantID}

	conditions = append(conditions, `e.tenant_id=$1`)
	conditions = append(conditions, `e.deleted_at IS NULL`)

	argIdx := 2
	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf(`e.employment_status=$%d`, argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.DepartmentID != "" {
		conditions = append(conditions, fmt.Sprintf(`e.department_id=$%d`, argIdx))
		args = append(args, filter.DepartmentID)
		argIdx++
	}
	if filter.PositionID != "" {
		conditions = append(conditions, fmt.Sprintf(`e.position_id=$%d`, argIdx))
		args = append(args, filter.PositionID)
		argIdx++
	}
	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			`(e.first_name ILIKE $%d OR e.last_name ILIKE $%d OR e.employee_code ILIKE $%d OR e.email ILIKE $%d)`,
			argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
	}

	query += ` WHERE ` + strings.Join(conditions, ` AND `)

	var count int
	err := r.db.QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}

func (r *EmployeeRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE employees SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

func (r *EmployeeRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE employees SET employment_status=$2, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id, status)
	return err
}
