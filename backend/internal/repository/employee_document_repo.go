package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type EmployeeDocumentRepo struct {
	db adapter.DBTX
}

func (r *EmployeeDocumentRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func NewEmployeeDocumentRepo(db adapter.DBTX) domain.EmployeeDocumentRepository {
	return &EmployeeDocumentRepo{db: db}
}

var empDocColumns = `id, employee_id, tenant_id, document_type, document_name,
	file_name, file_size, mime_type, file_path,
	COALESCE(notes, ''), uploaded_by,
	is_verified, verified_by, verified_at, expires_at::text,
	created_at, updated_at, deleted_at`

func scanEmployeeDocument(row pgx.Row) (*domain.EmployeeDocument, error) {
	var d domain.EmployeeDocument
	var deletedAt *time.Time
	var verifiedAt *time.Time
	var verifiedBy *string
	var expiresAt *string

	err := row.Scan(
		&d.ID, &d.EmployeeID, &d.TenantID, &d.DocumentType, &d.DocumentName,
		&d.FileName, &d.FileSize, &d.MimeType, &d.FilePath,
		&d.Notes, &d.UploadedBy,
		&d.IsVerified, &verifiedBy, &verifiedAt, &expiresAt,
		&d.CreatedAt, &d.UpdatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("employee document not found")
		}
		return nil, err
	}

	d.DeletedAt = deletedAt
	d.VerifiedAt = verifiedAt
	d.VerifiedBy = verifiedBy
	d.ExpiresAt = expiresAt
	return &d, nil
}

// ── CRUD ────────────────────────────────────────

func (r *EmployeeDocumentRepo) Create(ctx context.Context, doc *domain.EmployeeDocument) error {
	query := `
		INSERT INTO employee_documents (
			id, employee_id, tenant_id, document_type, document_name,
			file_name, file_size, mime_type, file_path,
			notes, uploaded_by,
			is_verified, expires_at,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			NULLIF($10, ''), $11,
			false, NULLIF($12, '')::date,
			NOW(), NOW()
		)
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query,
		doc.ID, doc.EmployeeID, doc.TenantID, doc.DocumentType, doc.DocumentName,
		doc.FileName, doc.FileSize, doc.MimeType, doc.FilePath,
		doc.Notes, doc.UploadedBy,
		doc.ExpiresAt,
	)
	return err
}

func (r *EmployeeDocumentRepo) GetByID(ctx context.Context, id string) (*domain.EmployeeDocument, error) {
	query := `SELECT ` + empDocColumns + ` FROM employee_documents WHERE id=$1 AND deleted_at IS NULL`
	return scanEmployeeDocument(r.dbQuerier(ctx).QueryRow(ctx, query, id))
}

func (r *EmployeeDocumentRepo) ListByEmployee(ctx context.Context, tenantID, employeeID string) ([]domain.EmployeeDocument, error) {
	query := `SELECT ` + empDocColumns + ` FROM employee_documents
		WHERE tenant_id=$1 AND employee_id=$2 AND deleted_at IS NULL
		ORDER BY created_at DESC`

	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]domain.EmployeeDocument, 0)
	for rows.Next() {
		var d domain.EmployeeDocument
		var deletedAt *time.Time
		var verifiedAt *time.Time
		var verifiedBy *string
		var expiresAt *string

		if err := rows.Scan(
			&d.ID, &d.EmployeeID, &d.TenantID, &d.DocumentType, &d.DocumentName,
			&d.FileName, &d.FileSize, &d.MimeType, &d.FilePath,
			&d.Notes, &d.UploadedBy,
			&d.IsVerified, &verifiedBy, &verifiedAt, &expiresAt,
			&d.CreatedAt, &d.UpdatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}

		d.DeletedAt = deletedAt
		d.VerifiedAt = verifiedAt
		d.VerifiedBy = verifiedBy
		d.ExpiresAt = expiresAt
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

func (r *EmployeeDocumentRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE employee_documents SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id)
	return err
}

func (r *EmployeeDocumentRepo) Verify(ctx context.Context, id, verifiedBy string) error {
	_, err := r.dbQuerier(ctx).Exec(ctx,
		`UPDATE employee_documents SET is_verified=true, verified_by=$2, verified_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id, verifiedBy)
	return err
}
