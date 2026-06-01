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

	uts := make([]domain.UserTenant, 0)
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

	uts := make([]domain.UserTenant, 0)
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

func (r *UserTenantRepo) ListAllUsers(ctx context.Context) ([]domain.UserWithTenant, error) {
	query := `
		SELECT u.id, u.email, u.full_name, u.is_active, u.created_at,
		       ut.role, t.name as tenant_name, t.slug as tenant_slug
		FROM users u
		JOIN user_tenants ut ON ut.user_id = u.id AND ut.deleted_at IS NULL
		JOIN tenants t ON t.id = ut.tenant_id
		WHERE u.deleted_at IS NULL
		ORDER BY u.created_at DESC
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]domain.UserWithTenant, 0)
	for rows.Next() {
		var u domain.UserWithTenant
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.IsActive, &u.CreatedAt, &u.Role, &u.TenantName, &u.TenantSlug); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
