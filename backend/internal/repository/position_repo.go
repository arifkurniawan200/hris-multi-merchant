package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"

)

type PositionRepo struct {
	db adapter.DBTX
}
// dbQuerier returns the active transaction from context if available.
func (r *PositionRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}


func NewPositionRepo(db adapter.DBTX) domain.PositionRepository {
	return &PositionRepo{db: db}
}

var posColumns = `id, tenant_id, name, code, description, grade, min_salary, max_salary, is_active, created_at, updated_at, deleted_at`

func scanPosition(row pgx.Row) (*domain.Position, error) {
	var p domain.Position
	var deletedAt *time.Time
	err := row.Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Code, &p.Description,
		&p.Grade, &p.MinSalary, &p.MaxSalary, &p.IsActive,
		&p.CreatedAt, &p.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("position not found")
		}
		return nil, err
	}
	p.DeletedAt = deletedAt
	return &p, nil
}

func (r *PositionRepo) Create(ctx context.Context, p *domain.Position) error {
	query := `
		INSERT INTO positions (id, tenant_id, name, code, description, grade, min_salary, max_salary, is_active, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		p.ID, p.TenantID, p.Name, p.Code, p.Description,
		p.Grade, p.MinSalary, p.MaxSalary, p.IsActive,
	)
	return err
}

func (r *PositionRepo) GetByID(ctx context.Context, id string) (*domain.Position, error) {
	query := `SELECT ` + posColumns + ` FROM positions WHERE id=$1 AND deleted_at IS NULL`
	return scanPosition(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *PositionRepo) GetByCode(ctx context.Context, tenantID, code string) (*domain.Position, error) {
	query := `SELECT ` + posColumns + ` FROM positions WHERE tenant_id=$1 AND code=$2 AND deleted_at IS NULL`
	return scanPosition(r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, code))
}

func (r *PositionRepo) Update(ctx context.Context, p *domain.Position) error {
	query := `
		UPDATE positions
		SET name=$2, code=$3, description=$4, grade=$5, min_salary=$6, max_salary=$7, is_active=$8, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		p.ID, p.Name, p.Code, p.Description, p.Grade,
		p.MinSalary, p.MaxSalary, p.IsActive,
	)
	return err
}

func (r *PositionRepo) List(ctx context.Context, tenantID string) ([]domain.Position, error) {
	query := `SELECT ` + posColumns + ` FROM positions WHERE tenant_id=$1 AND deleted_at IS NULL ORDER BY code ASC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	positions := make([]domain.Position, 0)
	for rows.Next() {
		var p domain.Position
		var deletedAt *time.Time
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Code, &p.Description,
			&p.Grade, &p.MinSalary, &p.MaxSalary, &p.IsActive,
			&p.CreatedAt, &p.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		p.DeletedAt = deletedAt
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

func (r *PositionRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE positions SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}
