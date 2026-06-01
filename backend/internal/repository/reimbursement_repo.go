package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

// ── ReimbursementTypeRepo ─────────────────────────

type ReimbursementTypeRepo struct {
	db adapter.DBTX
}

func NewReimbursementTypeRepo(db adapter.DBTX) domain.ReimbursementTypeRepository {
	return &ReimbursementTypeRepo{db: db}
}

func (r *ReimbursementTypeRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var rtColumns = `id, tenant_id, name, code, description, max_amount, created_at, updated_at, deleted_at`

func scanReimbursementType(row pgx.Row) (*domain.ReimbursementType, error) {
	var rt domain.ReimbursementType
	var deletedAt *time.Time
	var maxAmount *int64
	err := row.Scan(
		&rt.ID, &rt.TenantID, &rt.Name, &rt.Code,
		&rt.Description, &maxAmount,
		&rt.CreatedAt, &rt.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("reimbursement type not found")
		}
		return nil, err
	}
	rt.DeletedAt = deletedAt
	rt.MaxAmount = maxAmount
	return &rt, nil
}

func (r *ReimbursementTypeRepo) Create(ctx context.Context, rt *domain.ReimbursementType) error {
	query := `
		INSERT INTO reimbursement_types (
			id, tenant_id, name, code, description, max_amount,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		rt.ID, rt.TenantID, rt.Name, rt.Code, rt.Description, rt.MaxAmount,
	)
	return err
}

func (r *ReimbursementTypeRepo) GetByID(ctx context.Context, id string) (*domain.ReimbursementType, error) {
	query := `SELECT ` + rtColumns + ` FROM reimbursement_types WHERE id=$1 AND deleted_at IS NULL`
	return scanReimbursementType(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *ReimbursementTypeRepo) GetByCode(ctx context.Context, tenantID, code string) (*domain.ReimbursementType, error) {
	query := `SELECT ` + rtColumns + ` FROM reimbursement_types WHERE tenant_id=$1 AND code=$2 AND deleted_at IS NULL`
	return scanReimbursementType(r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, code))
}

func (r *ReimbursementTypeRepo) List(ctx context.Context, tenantID string) ([]domain.ReimbursementType, error) {
	query := `SELECT ` + rtColumns + ` FROM reimbursement_types
		WHERE tenant_id=$1 AND deleted_at IS NULL
		ORDER BY name ASC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var types []domain.ReimbursementType
	for rows.Next() {
		var rt domain.ReimbursementType
		var deletedAt *time.Time
		var maxAmount *int64
		if err := rows.Scan(
			&rt.ID, &rt.TenantID, &rt.Name, &rt.Code,
			&rt.Description, &maxAmount,
			&rt.CreatedAt, &rt.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		rt.DeletedAt = deletedAt
		rt.MaxAmount = maxAmount
		types = append(types, rt)
	}
	return types, rows.Err()
}

func (r *ReimbursementTypeRepo) Update(ctx context.Context, rt *domain.ReimbursementType) error {
	query := `
		UPDATE reimbursement_types
		SET name=$2, code=$3, description=$4, max_amount=$5, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		rt.ID, rt.Name, rt.Code, rt.Description, rt.MaxAmount,
	)
	return err
}

func (r *ReimbursementTypeRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE reimbursement_types SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

// ── ReimbursementRepo ─────────────────────────────

type ReimbursementRepo struct {
	db adapter.DBTX
}

func NewReimbursementRepo(db adapter.DBTX) domain.ReimbursementRepository {
	return &ReimbursementRepo{db: db}
}

func (r *ReimbursementRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var reimbColumns = `rb.id, rb.tenant_id, rb.employee_id, rb.type_id,
	rb.amount, rb.description, COALESCE(rb.receipt_url, ''),
	rb.status,
	rb.approved_by, rb.approved_at, COALESCE(rb.reject_reason, ''),
	rb.created_at, rb.updated_at, rb.deleted_at`

var reimbJoinColumns = reimbColumns + `,
	COALESCE(e.first_name || ' ' || e.last_name, ''), COALESCE(e.employee_code, ''),
	COALESCE(rt.name, '')`

var reimbJoins = `
	LEFT JOIN employees e ON e.id = rb.employee_id AND e.deleted_at IS NULL
	LEFT JOIN reimbursement_types rt ON rt.id = rb.type_id AND rt.deleted_at IS NULL`

func scanReimbursement(row pgx.Row) (*domain.Reimbursement, error) {
	var rb domain.Reimbursement
	var deletedAt, approvedAt *time.Time

	err := row.Scan(
		&rb.ID, &rb.TenantID, &rb.EmployeeID, &rb.TypeID,
		&rb.Amount, &rb.Description, &rb.ReceiptURL,
		&rb.Status,
		&rb.ApprovedBy, &approvedAt, &rb.RejectReason,
		&rb.CreatedAt, &rb.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("reimbursement not found")
		}
		return nil, err
	}
	rb.DeletedAt = deletedAt
	rb.ApprovedAt = approvedAt
	return &rb, nil
}

func scanReimbursementWithJoin(row pgx.Row) (*domain.Reimbursement, error) {
	var rb domain.Reimbursement
	var deletedAt, approvedAt *time.Time

	err := row.Scan(
		&rb.ID, &rb.TenantID, &rb.EmployeeID, &rb.TypeID,
		&rb.Amount, &rb.Description, &rb.ReceiptURL,
		&rb.Status,
		&rb.ApprovedBy, &approvedAt, &rb.RejectReason,
		&rb.CreatedAt, &rb.UpdatedAt, &deletedAt,
		&rb.EmployeeName, &rb.EmployeeCode,
		&rb.ReimbursementTypeName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("reimbursement not found")
		}
		return nil, err
	}
	rb.DeletedAt = deletedAt
	rb.ApprovedAt = approvedAt
	return &rb, nil
}

func (r *ReimbursementRepo) Create(ctx context.Context, rb *domain.Reimbursement) error {
	query := `
		INSERT INTO reimbursements (
			id, tenant_id, employee_id, type_id,
			amount, description, receipt_url, status,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		rb.ID, rb.TenantID, rb.EmployeeID, rb.TypeID,
		rb.Amount, rb.Description, rb.ReceiptURL, rb.Status,
	)
	return err
}

func (r *ReimbursementRepo) GetByID(ctx context.Context, id string) (*domain.Reimbursement, error) {
	query := `SELECT ` + reimbJoinColumns + ` FROM reimbursements rb` + reimbJoins +
		` WHERE rb.id=$1 AND rb.deleted_at IS NULL`
	return scanReimbursementWithJoin(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *ReimbursementRepo) ListByEmployee(ctx context.Context, employeeID string, limit, offset int) ([]domain.Reimbursement, error) {
	query := `SELECT ` + reimbJoinColumns + ` FROM reimbursements rb` + reimbJoins +
		` WHERE rb.employee_id=$1 AND rb.deleted_at IS NULL
		ORDER BY rb.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reimbursements []domain.Reimbursement
	for rows.Next() {
		var rb domain.Reimbursement
		var deletedAt, approvedAt *time.Time
		if err := rows.Scan(
			&rb.ID, &rb.TenantID, &rb.EmployeeID, &rb.TypeID,
			&rb.Amount, &rb.Description, &rb.ReceiptURL,
			&rb.Status,
			&rb.ApprovedBy, &approvedAt, &rb.RejectReason,
			&rb.CreatedAt, &rb.UpdatedAt, &deletedAt,
			&rb.EmployeeName, &rb.EmployeeCode,
			&rb.ReimbursementTypeName,
		); err != nil {
			return nil, err
		}
		rb.DeletedAt = deletedAt
		rb.ApprovedAt = approvedAt
		reimbursements = append(reimbursements, rb)
	}
	return reimbursements, rows.Err()
}

func (r *ReimbursementRepo) ListByTenant(ctx context.Context, tenantID, status string, limit, offset int) ([]domain.Reimbursement, int, error) {
	// Count first
	countQuery := `SELECT COUNT(*) FROM reimbursements rb
		WHERE rb.tenant_id=$1 AND rb.deleted_at IS NULL`
	args := []interface{}{tenantID}
	argIdx := 2

	if status != "" {
		countQuery += fmt.Sprintf(` AND rb.status=$%d`, argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int
	err := r.dbQuerier(ctx).QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Data query
	dataQuery := `SELECT ` + reimbJoinColumns + ` FROM reimbursements rb` + reimbJoins +
		` WHERE rb.tenant_id=$1 AND rb.deleted_at IS NULL`
	args2 := []interface{}{tenantID}
	argIdx2 := 2

	if status != "" {
		dataQuery += fmt.Sprintf(` AND rb.status=$%d`, argIdx2)
		args2 = append(args2, status)
		argIdx2++
	}

	dataQuery += ` ORDER BY rb.created_at DESC`
	dataQuery += fmt.Sprintf(` LIMIT $%d OFFSET $%d`, argIdx2, argIdx2+1)
	args2 = append(args2, limit, offset)

	rows, err := r.dbQuerier(ctx).Query(ctx, dataQuery, args2...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reimbursements []domain.Reimbursement
	for rows.Next() {
		var rb domain.Reimbursement
		var deletedAt, approvedAt *time.Time
		if err := rows.Scan(
			&rb.ID, &rb.TenantID, &rb.EmployeeID, &rb.TypeID,
			&rb.Amount, &rb.Description, &rb.ReceiptURL,
			&rb.Status,
			&rb.ApprovedBy, &approvedAt, &rb.RejectReason,
			&rb.CreatedAt, &rb.UpdatedAt, &deletedAt,
			&rb.EmployeeName, &rb.EmployeeCode,
			&rb.ReimbursementTypeName,
		); err != nil {
			return nil, 0, err
		}
		rb.DeletedAt = deletedAt
		rb.ApprovedAt = approvedAt
		reimbursements = append(reimbursements, rb)
	}
	return reimbursements, total, rows.Err()
}

func (r *ReimbursementRepo) UpdateStatus(ctx context.Context, id string, status domain.ReimbursementStatus, approvedBy, rejectReason string) error {
	var approvedByArg *string
	if approvedBy != "" {
		approvedByArg = &approvedBy
	}

	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE reimbursements
		SET status=$2, approved_by=$3, approved_at=NOW(), reject_reason=$4, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL`,
		id, string(status), approvedByArg, rejectReason)
	return err
}
