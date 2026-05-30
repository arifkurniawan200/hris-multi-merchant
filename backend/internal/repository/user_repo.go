package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	)

type UserRepo struct {
	db adapter.DBTX
}
// dbQuerier returns the active transaction from context if available.
func (r *UserRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}


func NewUserRepo(db adapter.DBTX) domain.UserRepository {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, full_name, phone, avatar_url, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.FullName,
		user.Phone, user.AvatarURL, user.IsActive,
	)
	return err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, avatar_url,
		       is_active, created_at, deleted_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`
	row := r.dbQuerier(ctx).QueryRow(ctx, query, id)
	return scanUser(row)
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, avatar_url,
		       is_active, created_at, deleted_at, updated_at
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
	`
	row := r.dbQuerier(ctx).QueryRow(ctx, query, email)
	return scanUser(row)
}

func (r *UserRepo) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET email=$2, full_name=$3, phone=$4, avatar_url=$5, is_active=$6, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		user.ID, user.Email, user.FullName, user.Phone, user.AvatarURL, user.IsActive,
	)
	return err
}

func scanUser(scanner pgx.Row) (*domain.User, error) {
	var u domain.User
	var deletedAt *time.Time
	err := scanner.Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.FullName,
		&u.Phone, &u.AvatarURL, &u.IsActive, &u.CreatedAt,
		&deletedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	u.DeletedAt = deletedAt
	return &u, nil
}
