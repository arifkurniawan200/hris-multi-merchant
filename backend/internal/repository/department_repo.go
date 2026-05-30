package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DepartmentRepo struct {
	db *pgxpool.Pool
}

func NewDepartmentRepo(db *pgxpool.Pool) domain.DepartmentRepository {
	return &DepartmentRepo{db: db}
}

var deptColumns = `id, tenant_id, parent_id, name, code, description, manager_id, level, is_active, created_at, updated_at, deleted_at`

func scanDepartment(row pgx.Row) (*domain.Department, error) {
	var d domain.Department
	var deletedAt *time.Time
	err := row.Scan(
		&d.ID, &d.TenantID, &d.ParentID, &d.Name, &d.Code,
		&d.Description, &d.ManagerID, &d.Level, &d.IsActive,
		&d.CreatedAt, &d.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("department not found")
		}
		return nil, err
	}
	d.DeletedAt = deletedAt
	return &d, nil
}

func (r *DepartmentRepo) Create(d *domain.Department) error {
	query := `
		INSERT INTO departments (id, tenant_id, parent_id, name, code, description, manager_id, level, is_active, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
	`
	_, err := r.db.Exec(context.Background(), query,
		d.ID, d.TenantID, d.ParentID, d.Name, d.Code,
		d.Description, d.ManagerID, d.Level, d.IsActive,
	)
	return err
}

func (r *DepartmentRepo) GetByID(id string) (*domain.Department, error) {
	query := `SELECT ` + deptColumns + ` FROM departments WHERE id=$1 AND deleted_at IS NULL`
	return scanDepartment(r.db.QueryRow(context.Background(), query, id))
}

func (r *DepartmentRepo) GetByCode(tenantID, code string) (*domain.Department, error) {
	query := `SELECT ` + deptColumns + ` FROM departments WHERE tenant_id=$1 AND code=$2 AND deleted_at IS NULL`
	return scanDepartment(r.db.QueryRow(context.Background(), query, tenantID, code))
}

func (r *DepartmentRepo) Update(d *domain.Department) error {
	query := `
		UPDATE departments
		SET name=$2, code=$3, description=$4, manager_id=$5, parent_id=$6, is_active=$7, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(context.Background(), query,
		d.ID, d.Name, d.Code, d.Description, d.ManagerID, d.ParentID, d.IsActive,
	)
	return err
}

func (r *DepartmentRepo) List(tenantID string, parentID *string) ([]domain.Department, error) {
	query := `SELECT ` + deptColumns + ` FROM departments WHERE tenant_id=$1 AND deleted_at IS NULL`
	args := []interface{}{tenantID}

	if parentID != nil {
		query += ` AND parent_id=$2`
		args = append(args, *parentID)
	} else {
		query += ` AND parent_id IS NULL`
	}
	query += ` ORDER BY level ASC, name ASC`

	rows, err := r.db.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var depts []domain.Department
	for rows.Next() {
		var d domain.Department
		var deletedAt *time.Time
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.ParentID, &d.Name, &d.Code,
			&d.Description, &d.ManagerID, &d.Level, &d.IsActive,
			&d.CreatedAt, &d.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		d.DeletedAt = deletedAt
		depts = append(depts, d)
	}
	return depts, rows.Err()
}

func (r *DepartmentRepo) SoftDelete(id string) error {
	_, err := r.db.Exec(context.Background(),
		`UPDATE departments SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}
