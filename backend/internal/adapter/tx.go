package adapter

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DBTX is a common interface satisfied by both *pgxpool.Pool and pgx.Tx.
// Repos accept this so they work with the pool (normal) or a transaction object.
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// txKey is the context key for the active transaction.
type txKey struct{}

// TxManager wraps a pgxpool.Pool and provides ExecTx for running
// a function inside a database transaction. The transaction is injected
// into context — repos retrieve it via GetTxDB().
type TxManager struct {
	pool *pgxpool.Pool
}

// NewTxManager creates a new transaction manager.
func NewTxManager(pool *pgxpool.Pool) *TxManager {
	return &TxManager{pool: pool}
}

// ExecTx starts a transaction, injects it into context, executes fn, and commits.
// If fn returns an error or panics, the transaction is rolled back.
// Inside fn, repos should use GetTxDB(ctx) to get the transaction instead of the pool.
func (m *TxManager) ExecTx(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
	}()

	// Inject tx into context so repos can retrieve it.
	txCtx := context.WithValue(ctx, txKey{}, tx)

	if err := fn(txCtx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("rollback after %w: %v", err, rbErr)
		}
		return err
	}

	return tx.Commit(ctx)
}

// GetTxDB retrieves the transaction from context if one exists.
// Repos call this to check: if a tx is active, use it; otherwise fall back to pool.
func GetTxDB(ctx context.Context) DBTX {
	tx, ok := ctx.Value(txKey{}).(pgx.Tx)
	if ok {
		return tx
	}
	return nil
}

// Pool returns the underlying connection pool.
func (m *TxManager) Pool() *pgxpool.Pool {
	return m.pool
}
