package repository

import (
	"context"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"

)

type UserTenantRepo struct {
	db adapter.DBTX
}
// dbQuerier returns the active transaction from context if available.
func (r *UserTenantRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}


func NewUserTenantRepo(db adapter.DBTX) domain.UserTenantRepository {
	return &UserTenantRepo{db: db}
}

func (r *UserTenantRepo) Add(ctx context.Context, ut *domain.UserTenant) error {
	query := `
		INSERT INTO user_tenants (user_id, tenant_id, role, is_active, joined_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id, tenant_id) DO UPDATE
		SET role = EXCLUDED.role,
		    is_active = EXCLUDED.is_active,
		    joined_at = NOW(),
		    deleted_at = NULL,
		    updated_at = NOW()
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		ut.UserID, ut.TenantID, ut.Role, ut.IsActive,
	)
	return err
}

func (r *UserTenantRepo) GetUserTenants(ctx context.Context, userID string) ([]domain.UserTenant, error) {
	query := `
		SELECT user_id, tenant_id, role, is_active, joined_at, deleted_at
		FROM user_tenants
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY joined_at DESC
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var uts []domain.UserTenant
	for rows.Next() {
		var ut domain.UserTenant
		var deletedAt *time.Time
		err := rows.Scan(&ut.UserID, &ut.TenantID, &ut.Role, &ut.IsActive, &ut.JoinedAt, &deletedAt)
		if err != nil {
			return nil, err
		}
		ut.DeletedAt = deletedAt
		uts = append(uts, ut)
	}
	return uts, rows.Err()
}

func (r *UserTenantRepo) GetTenantUsers(ctx context.Context, tenantID string, limit, offset int) ([]domain.UserTenant, error) {
	query := `
		SELECT user_id, tenant_id, role, is_active, joined_at, deleted_at
		FROM user_tenants
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY joined_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var uts []domain.UserTenant
	for rows.Next() {
		var ut domain.UserTenant
		var deletedAt *time.Time
		err := rows.Scan(&ut.UserID, &ut.TenantID, &ut.Role, &ut.IsActive, &ut.JoinedAt, &deletedAt)
		if err != nil {
			return nil, err
		}
		ut.DeletedAt = deletedAt
		uts = append(uts, ut)
	}
	return uts, rows.Err()
}

func (r *UserTenantRepo) UpdateRole(ctx context.Context, userID, tenantID string, role domain.UserTenantRole) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE user_tenants SET role=$3 WHERE user_id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
		userID, tenantID, role)
	return err
}

func (r *UserTenantRepo) Remove(ctx context.Context, userID, tenantID string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE user_tenants SET deleted_at=NOW() WHERE user_id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
		userID, tenantID)
	return err
}
