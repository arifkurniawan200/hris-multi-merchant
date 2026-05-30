package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Querier interface {
	Exec(ctx context.Context, sql string, args ...interface{}) (interface{}, error)
}

type SetConfigFunc func(ctx context.Context, key string, value string) error

func NewSetConfigFunc(db *pgxpool.Pool) SetConfigFunc {
	return func(ctx context.Context, key string, value string) error {
		_, err := db.Exec(ctx, "SELECT set_config($1, $2, true)", key, value)
		return err
	}
}
