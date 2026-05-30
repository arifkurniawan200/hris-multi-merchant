package repository

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TenantRepo struct {
	db *pgxpool.Pool
}

func NewTenantRepo(db *pgxpool.Pool) domain.TenantRepository {
	return &TenantRepo{db: db}
}

func (r *TenantRepo) Create(tenant *domain.Tenant) error {
	query := `
		INSERT INTO tenants (id, name, slug, plan, max_employees, settings, logo_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`
	_, err := r.db.Exec(context.Background(), query,
		tenant.ID, tenant.Name, tenant.Slug, tenant.Plan,
		tenant.MaxEmployees, tenant.Settings, tenant.LogoURL,
	)
	return err
}

func (r *TenantRepo) GetByID(id string) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, plan, max_employees, settings, logo_url, created_at, updated_at FROM tenants WHERE id = $1`
	row := r.db.QueryRow(context.Background(), query, id)
	return scanTenant(row)
}

func (r *TenantRepo) GetBySlug(slug string) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, plan, max_employees, settings, logo_url, created_at, updated_at FROM tenants WHERE slug = $1`
	row := r.db.QueryRow(context.Background(), query, slug)
	return scanTenant(row)
}

func (r *TenantRepo) Update(tenant *domain.Tenant) error {
	query := `
		UPDATE tenants SET name=$2, slug=$3, plan=$4, max_employees=$5, settings=$6, logo_url=$7, updated_at=NOW()
		WHERE id=$1
	`
	_, err := r.db.Exec(context.Background(), query,
		tenant.ID, tenant.Name, tenant.Slug, tenant.Plan,
		tenant.MaxEmployees, tenant.Settings, tenant.LogoURL,
	)
	return err
}

func (r *TenantRepo) List(limit, offset int) ([]domain.Tenant, error) {
	query := `SELECT id, name, slug, plan, max_employees, settings, logo_url, created_at, updated_at FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := r.db.Query(context.Background(), query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tenants []domain.Tenant
	for rows.Next() {
		t, err := scanTenant(rows)
		if err != nil {
			return nil, err
		}
		tenants = append(tenants, *t)
	}
	return tenants, rows.Err()
}

func scanTenant(scanner pgx.Row) (*domain.Tenant, error) {
	var t domain.Tenant
	err := scanner.Scan(
		&t.ID, &t.Name, &t.Slug, &t.Plan, &t.MaxEmployees,
		&t.Settings, &t.LogoURL, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("tenant not found")
		}
		return nil, err
	}
	return &t, nil
}
