package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"

)

type TenantRepo struct {
	db adapter.DBTX
}

// dbQuerier returns the active transaction from context if available.
func (r *TenantRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}


func NewTenantRepo(db adapter.DBTX) domain.TenantRepository {
	return &TenantRepo{db: db}
}

// ── CRUD ────────────────────────────────────────

func (r *TenantRepo) Create(ctx context.Context, tenant *domain.Tenant) error {
	query := `
		INSERT INTO tenants (id, name, slug, plan, plan_price_per_employee, subscription_expires_at, is_active, max_employees, settings, logo_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		tenant.ID, tenant.Name, tenant.Slug, tenant.Plan,
		tenant.PlanPricePerEmployee, tenant.SubscriptionExpiresAt, tenant.IsActive,
		tenant.MaxEmployees, tenant.Settings, tenant.LogoURL,
	)
	return err
}

func (r *TenantRepo) GetByID(ctx context.Context, id string) (*domain.Tenant, error) {
	query := `
		SELECT id, name, slug, plan, plan_price_per_employee, subscription_expires_at,
		       is_active, max_employees, settings, logo_url, created_at, deleted_at, updated_at
		FROM tenants
		WHERE id = $1 AND deleted_at IS NULL
	`
	row := r.dbQuerier(ctx).QueryRow(ctx, query, id)
	return scanTenant(row)
}

func (r *TenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	query := `
		SELECT id, name, slug, plan, plan_price_per_employee, subscription_expires_at,
		       is_active, max_employees, settings, logo_url, created_at, deleted_at, updated_at
		FROM tenants
		WHERE slug = $1 AND deleted_at IS NULL
	`
	row := r.dbQuerier(ctx).QueryRow(ctx, query, slug)
	return scanTenant(row)
}

func (r *TenantRepo) Update(ctx context.Context, tenant *domain.Tenant) error {
	query := `
		UPDATE tenants
		SET name=$2, slug=$3, plan=$4, plan_price_per_employee=$5,
		    subscription_expires_at=$6, is_active=$7, max_employees=$8,
		    settings=$9, logo_url=$10, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		tenant.ID, tenant.Name, tenant.Slug, tenant.Plan,
		tenant.PlanPricePerEmployee, tenant.SubscriptionExpiresAt, tenant.IsActive,
		tenant.MaxEmployees, tenant.Settings, tenant.LogoURL,
	)
	return err
}

func (r *TenantRepo) List(ctx context.Context, limit, offset int) ([]domain.Tenant, error) {
	query := `
		SELECT id, name, slug, plan, plan_price_per_employee, subscription_expires_at,
		       is_active, max_employees, settings, logo_url, created_at, deleted_at, updated_at
		FROM tenants
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, limit, offset)
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

// ── Subscription / lifecycle ────────────────────

func (r *TenantRepo) Activate(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET is_active=true, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

func (r *TenantRepo) Deactivate(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET is_active=false, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

func (r *TenantRepo) Extend(ctx context.Context, id string, months int) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET subscription_expires_at = COALESCE(subscription_expires_at, NOW()) + ($2::int * INTERVAL '1 month'), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id, months)
	return err
}

func (r *TenantRepo) ChangePlan(ctx context.Context, id, plan string, pricePerEmployee int64) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET plan=$2, plan_price_per_employee=$3, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id, plan, pricePerEmployee)
	return err
}

func (r *TenantRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

// ── Scanner ─────────────────────────────────────

func scanTenant(scanner pgx.Row) (*domain.Tenant, error) {
	var t domain.Tenant
	var expiresAt *time.Time
	var deletedAt *time.Time
	err := scanner.Scan(
		&t.ID, &t.Name, &t.Slug, &t.Plan, &t.PlanPricePerEmployee,
		&expiresAt, &t.IsActive, &t.MaxEmployees, &t.Settings,
		&t.LogoURL, &t.CreatedAt, &deletedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("tenant not found")
		}
		return nil, err
	}
	t.SubscriptionExpiresAt = expiresAt
	t.DeletedAt = deletedAt
	return &t, nil
}
