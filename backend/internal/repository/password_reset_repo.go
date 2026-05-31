package repository

import (
	"context"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
)

type PasswordResetTokenRepo struct {
	db adapter.DBTX
}

func NewPasswordResetTokenRepo(db adapter.DBTX) domain.PasswordResetTokenRepository {
	return &PasswordResetTokenRepo{db: db}
}

func (r *PasswordResetTokenRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *PasswordResetTokenRepo) Create(ctx context.Context, token *domain.PasswordResetToken) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, NOW())`,
		token.ID, token.UserID, token.TokenHash, token.ExpiresAt,
	)
	return err
}

func (r *PasswordResetTokenRepo) GetValidByTokenHash(ctx context.Context, tokenHash string) (*domain.PasswordResetToken, error) {
	row := r.dbQuerier(ctx).QueryRow(ctx,
		`SELECT id, user_id, token, expires_at, used_at, created_at FROM password_reset_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > NOW() AND deleted_at IS NULL`,
		tokenHash,
	)
	var t domain.PasswordResetToken
	err := row.Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.UsedAt, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PasswordResetTokenRepo) MarkUsed(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`,
		id,
	)
	return err
}

func (r *PasswordResetTokenRepo) DeleteUnusedByUser(ctx context.Context, userID string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE password_reset_tokens SET deleted_at = NOW() WHERE user_id = $1 AND used_at IS NULL AND deleted_at IS NULL`,
		userID,
	)
	return err
}
