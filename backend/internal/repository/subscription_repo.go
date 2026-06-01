package repository

import (
	"context"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
)

// SubscriptionRepo handles tenant plan/subscription management.
type SubscriptionRepo struct {
	db adapter.DBTX
}
// dbQuerier returns the active transaction from context if available.
func (r *SubscriptionRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}


func NewSubscriptionRepo(db adapter.DBTX) *SubscriptionRepo {
	return &SubscriptionRepo{db: db}
}

// Activate enables a tenant (sets is_active=true).
func (r *SubscriptionRepo) Activate(ctx context.Context, tenantID string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET is_active=true, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		tenantID)
	return err
}

// Deactivate disables a tenant (sets is_active=false).
func (r *SubscriptionRepo) Deactivate(ctx context.Context, tenantID string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET is_active=false, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		tenantID)
	return err
}

// Extend extends subscription_expire_at by the given duration.
func (r *SubscriptionRepo) Extend(ctx context.Context, tenantID string, duration time.Duration) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET subscription_expire_at = COALESCE(subscription_expire_at, NOW()) + $2::interval, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		tenantID, duration)
	return err
}

// ChangePlan updates the plan and price.
func (r *SubscriptionRepo) ChangePlan(ctx context.Context, tenantID, plan string, pricePerEmployee int64) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET plan=$2, plan_price_per_employee=$3, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		tenantID, plan, pricePerEmployee)
	return err
}

// SoftDelete sets deleted_at (soft delete).
func (r *SubscriptionRepo) SoftDelete(ctx context.Context, tenantID string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE tenants SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		tenantID)
	return err
}

// HardDelete permanently removes.
func (r *SubscriptionRepo) HardDelete(ctx context.Context, tenantID string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`DELETE FROM tenants WHERE id=$1`, tenantID)
	return err
}

// GetUserTenantsWithExpiry returns tenants for user with expiry info.
func (r *SubscriptionRepo) GetUserTenantsWithExpiry(ctx context.Context, userID string) ([]domain.Tenant, error) {
	rows, err := r.dbQuerier(ctx).Query(ctx, `
		SELECT t.id, t.name, t.slug, t.plan, t.plan_price_per_employee, t.max_employees, t.settings, t.logo_url, t.is_active, t.subscription_expires_at, t.created_at, t.updated_at
		FROM tenants t
		JOIN user_tenants ut ON ut.tenant_id = t.id
		WHERE ut.user_id = $1 AND t.deleted_at IS NULL AND ut.deleted_at IS NULL
		ORDER BY t.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tenants := make([]domain.Tenant, 0)
	for rows.Next() {
		var t domain.Tenant
		var expiresAt *time.Time
		err := rows.Scan(
			&t.ID, &t.Name, &t.Slug, &t.Plan, &t.PlanPricePerEmployee, &t.MaxEmployees,
			&t.Settings, &t.LogoURL, &t.IsActive, &expiresAt, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		t.SubscriptionExpiresAt = expiresAt
		tenants = append(tenants, t)
	}
	return tenants, rows.Err()
}
