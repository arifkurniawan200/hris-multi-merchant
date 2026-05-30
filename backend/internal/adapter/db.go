package adapter

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPgxPool creates a pgx connection pool from the DB_DSN env var.
func NewPgxPool() (*pgxpool.Pool, error) {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		return nil, fmt.Errorf("environment variable DB_DSN is required")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgx pool: %w", err)
	}
	if err = pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("cannot ping database: %w", err)
	}
	return pool, nil
}
