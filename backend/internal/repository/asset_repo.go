package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
)

type AssetCategoryRepo struct {
	db adapter.DBTX
}

func NewAssetCategoryRepo(db adapter.DBTX) domain.AssetCategoryRepository {
	return &AssetCategoryRepo{db: db}
}

func (r *AssetCategoryRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *AssetCategoryRepo) Create(ctx context.Context, tenantID string, cat *domain.AssetCategory) error {
	query := `
		INSERT INTO asset_categories (tenant_id, name, description, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	return r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, cat.Name, cat.Description).
		Scan(&cat.ID, &cat.CreatedAt, &cat.UpdatedAt)
}

func (r *AssetCategoryRepo) GetByID(ctx context.Context, tenantID, id string) (*domain.AssetCategory, error) {
	query := `
		SELECT id, tenant_id, name, description, created_at, updated_at, deleted_at
		FROM asset_categories
		WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
	`
	var cat domain.AssetCategory
	err := r.dbQuerier(ctx).QueryRow(ctx, query, id, tenantID).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description,
		&cat.CreatedAt, &cat.UpdatedAt, &cat.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (r *AssetCategoryRepo) List(ctx context.Context, tenantID string) ([]domain.AssetCategory, error) {
	query := `
		SELECT id, tenant_id, name, description, created_at, updated_at, deleted_at
		FROM asset_categories
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY name ASC
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.AssetCategory, 0)
	for rows.Next() {
		var cat domain.AssetCategory
		if err := rows.Scan(&cat.ID, &cat.TenantID, &cat.Name, &cat.Description,
			&cat.CreatedAt, &cat.UpdatedAt, &cat.DeletedAt); err != nil {
			return nil, err
		}
		items = append(items, cat)
	}
	return items, rows.Err()
}

func (r *AssetCategoryRepo) Update(ctx context.Context, cat *domain.AssetCategory) error {
	query := `
		UPDATE asset_categories SET name = $1, description = $2, updated_at = NOW()
		WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL
	`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query, cat.Name, cat.Description, cat.ID, cat.TenantID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("asset category not found")
	}
	return nil
}

func (r *AssetCategoryRepo) Delete(ctx context.Context, tenantID, id string) error {
	query := `UPDATE asset_categories SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("asset category not found")
	}
	return nil
}

// ── Asset ───────────────────────────────────────────

type AssetRepo struct {
	db adapter.DBTX
}

func NewAssetRepo(db adapter.DBTX) domain.AssetRepository {
	return &AssetRepo{db: db}
}

func (r *AssetRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *AssetRepo) Create(ctx context.Context, a *domain.Asset) error {
	query := `
		INSERT INTO assets (tenant_id, category_id, asset_code, name, brand, model, serial_number,
		                    purchase_date, purchase_price, condition, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	return r.dbQuerier(ctx).QueryRow(ctx, query,
		a.TenantID, a.CategoryID, a.AssetCode, a.Name, a.Brand, a.Model, a.SerialNumber,
		a.PurchaseDate, a.PurchasePrice, a.Condition, a.Status, a.Notes,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
}

func (r *AssetRepo) GetByID(ctx context.Context, tenantID, id string) (*domain.Asset, error) {
	query := `
		SELECT a.id, a.tenant_id, a.category_id, a.asset_code, a.name, a.brand, a.model,
		       a.serial_number, a.purchase_date, a.purchase_price, a.condition, a.status, a.notes,
		       a.created_at, a.updated_at, a.deleted_at,
		       COALESCE(ac.name, '') AS category_name
		FROM assets a
		LEFT JOIN asset_categories ac ON ac.id = a.category_id
		WHERE a.id = $1 AND a.tenant_id = $2 AND a.deleted_at IS NULL
	`
	var a domain.Asset
	err := r.dbQuerier(ctx).QueryRow(ctx, query, id, tenantID).Scan(
		&a.ID, &a.TenantID, &a.CategoryID, &a.AssetCode, &a.Name, &a.Brand, &a.Model,
		&a.SerialNumber, &a.PurchaseDate, &a.PurchasePrice, &a.Condition, &a.Status, &a.Notes,
		&a.CreatedAt, &a.UpdatedAt, &a.DeletedAt, &a.CategoryName,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AssetRepo) GetByCode(ctx context.Context, tenantID, code string) (*domain.Asset, error) {
	query := `
		SELECT a.id, a.tenant_id, a.category_id, a.asset_code, a.name, a.brand, a.model,
		       a.serial_number, a.purchase_date, a.purchase_price, a.condition, a.status, a.notes,
		       a.created_at, a.updated_at, a.deleted_at,
		       COALESCE(ac.name, '') AS category_name
		FROM assets a
		LEFT JOIN asset_categories ac ON ac.id = a.category_id
		WHERE a.asset_code = $1 AND a.tenant_id = $2 AND a.deleted_at IS NULL
	`
	var a domain.Asset
	err := r.dbQuerier(ctx).QueryRow(ctx, query, code, tenantID).Scan(
		&a.ID, &a.TenantID, &a.CategoryID, &a.AssetCode, &a.Name, &a.Brand, &a.Model,
		&a.SerialNumber, &a.PurchaseDate, &a.PurchasePrice, &a.Condition, &a.Status, &a.Notes,
		&a.CreatedAt, &a.UpdatedAt, &a.DeletedAt, &a.CategoryName,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AssetRepo) List(ctx context.Context, filter domain.AssetFilter) ([]domain.Asset, int, error) {
	args := make([]interface{}, 0)
	conds := make([]string, 0)
	argIdx := 1

	conds = append(conds, fmt.Sprintf("a.tenant_id = $%d", argIdx))
	args = append(args, filter.TenantID)
	argIdx++

	conds = append(conds, "a.deleted_at IS NULL")

	if filter.CategoryID != nil && *filter.CategoryID != "" {
		conds = append(conds, fmt.Sprintf("a.category_id = $%d", argIdx))
		args = append(args, *filter.CategoryID)
		argIdx++
	}
	if filter.Status != nil && *filter.Status != "" {
		conds = append(conds, fmt.Sprintf("a.status = $%d", argIdx))
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.Condition != nil && *filter.Condition != "" {
		conds = append(conds, fmt.Sprintf("a.condition = $%d", argIdx))
		args = append(args, *filter.Condition)
		argIdx++
	}
	if filter.Search != "" {
		conds = append(conds, fmt.Sprintf("(a.name ILIKE $%d OR a.asset_code ILIKE $%d OR a.serial_number ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	whereClause := strings.Join(conds, " AND ")

	// Count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM assets a WHERE %s", whereClause)
	var total int
	if err := r.dbQuerier(ctx).QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	dataQuery := fmt.Sprintf(`
		SELECT a.id, a.tenant_id, a.category_id, a.asset_code, a.name, a.brand, a.model,
		       a.serial_number, a.purchase_date, a.purchase_price, a.condition, a.status, a.notes,
		       a.created_at, a.updated_at, a.deleted_at,
		       COALESCE(ac.name, '') AS category_name
		FROM assets a
		LEFT JOIN asset_categories ac ON ac.id = a.category_id
		WHERE %s
		ORDER BY a.created_at DESC
	`, whereClause)

	if filter.Limit > 0 {
		dataQuery += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filter.Limit)
		argIdx++
	}
	if filter.Offset > 0 {
		dataQuery += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, filter.Offset)
		argIdx++
	}

	rows, err := r.dbQuerier(ctx).Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]domain.Asset, 0)
	for rows.Next() {
		var a domain.Asset
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.CategoryID, &a.AssetCode, &a.Name, &a.Brand, &a.Model,
			&a.SerialNumber, &a.PurchaseDate, &a.PurchasePrice, &a.Condition, &a.Status, &a.Notes,
			&a.CreatedAt, &a.UpdatedAt, &a.DeletedAt, &a.CategoryName,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, a)
	}
	return items, total, rows.Err()
}

func (r *AssetRepo) Update(ctx context.Context, a *domain.Asset) error {
	query := `
		UPDATE assets SET category_id = $1, asset_code = $2, name = $3, brand = $4,
		       model = $5, serial_number = $6, purchase_date = $7, purchase_price = $8,
		       condition = $9, status = $10, notes = $11, updated_at = NOW()
		WHERE id = $12 AND tenant_id = $13 AND deleted_at IS NULL
	`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query,
		a.CategoryID, a.AssetCode, a.Name, a.Brand, a.Model, a.SerialNumber,
		a.PurchaseDate, a.PurchasePrice, a.Condition, a.Status, a.Notes,
		a.ID, a.TenantID,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("asset not found")
	}
	return nil
}

func (r *AssetRepo) UpdateStatus(ctx context.Context, id, status string) error {
	query := `UPDATE assets SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`
	_, err := r.dbQuerier(ctx).Exec(ctx, query, status, id)
	return err
}

func (r *AssetRepo) Delete(ctx context.Context, tenantID, id string) error {
	query := `UPDATE assets SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("asset not found")
	}
	return nil
}

// ── Asset Assignment ────────────────────────────────

type AssetAssignmentRepo struct {
	db adapter.DBTX
}

func NewAssetAssignmentRepo(db adapter.DBTX) domain.AssetAssignmentRepository {
	return &AssetAssignmentRepo{db: db}
}

func (r *AssetAssignmentRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *AssetAssignmentRepo) Create(ctx context.Context, a *domain.AssetAssignment) error {
	query := `
		INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, assigned_at,
		                               condition_at_assignment, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	return r.dbQuerier(ctx).QueryRow(ctx, query,
		a.TenantID, a.AssetID, a.EmployeeID, a.AssignedBy, a.AssignedAt,
		a.ConditionAtAssignment, a.Notes,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
}

func (r *AssetAssignmentRepo) GetByID(ctx context.Context, tenantID, id string) (*domain.AssetAssignment, error) {
	query := `
		SELECT aa.id, aa.tenant_id, aa.asset_id, aa.employee_id, aa.assigned_by,
		       aa.assigned_at, aa.returned_at, aa.condition_at_assignment,
		       aa.condition_at_return, aa.notes, aa.created_at, aa.updated_at,
		       a.name AS asset_name, a.asset_code AS asset_code,
		       COALESCE(e.first_name || ' ' || e.last_name, '') AS employee_name
		FROM asset_assignments aa
		JOIN assets a ON a.id = aa.asset_id
		LEFT JOIN employees e ON e.id = aa.employee_id
		WHERE aa.id = $1 AND aa.tenant_id = $2
	`
	var as domain.AssetAssignment
	err := r.dbQuerier(ctx).QueryRow(ctx, query, id, tenantID).Scan(
		&as.ID, &as.TenantID, &as.AssetID, &as.EmployeeID, &as.AssignedBy,
		&as.AssignedAt, &as.ReturnedAt, &as.ConditionAtAssignment,
		&as.ConditionAtReturn, &as.Notes, &as.CreatedAt, &as.UpdatedAt,
		&as.AssetName, &as.AssetCode, &as.EmployeeName,
	)
	if err != nil {
		return nil, err
	}
	return &as, nil
}

func (r *AssetAssignmentRepo) List(ctx context.Context, filter domain.AssignmentFilter) ([]domain.AssetAssignment, int, error) {
	args := make([]interface{}, 0)
	conds := make([]string, 0)
	argIdx := 1

	conds = append(conds, fmt.Sprintf("aa.tenant_id = $%d", argIdx))
	args = append(args, filter.TenantID)
	argIdx++

	if filter.AssetID != nil && *filter.AssetID != "" {
		conds = append(conds, fmt.Sprintf("aa.asset_id = $%d", argIdx))
		args = append(args, *filter.AssetID)
		argIdx++
	}
	if filter.EmployeeID != nil && *filter.EmployeeID != "" {
		conds = append(conds, fmt.Sprintf("aa.employee_id = $%d", argIdx))
		args = append(args, *filter.EmployeeID)
		argIdx++
	}
	if filter.ActiveOnly {
		conds = append(conds, "aa.returned_at IS NULL")
	}

	whereClause := strings.Join(conds, " AND ")

	// Count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM asset_assignments aa WHERE %s", whereClause)
	var total int
	if err := r.dbQuerier(ctx).QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	dataQuery := fmt.Sprintf(`
		SELECT aa.id, aa.tenant_id, aa.asset_id, aa.employee_id, aa.assigned_by,
		       aa.assigned_at, aa.returned_at, aa.condition_at_assignment,
		       aa.condition_at_return, aa.notes, aa.created_at, aa.updated_at,
		       a.name AS asset_name, a.asset_code AS asset_code,
		       COALESCE(e.first_name || ' ' || e.last_name, '') AS employee_name
		FROM asset_assignments aa
		JOIN assets a ON a.id = aa.asset_id
		LEFT JOIN employees e ON e.id = aa.employee_id
		WHERE %s
		ORDER BY aa.created_at DESC
	`, whereClause)

	if filter.Limit > 0 {
		dataQuery += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filter.Limit)
		argIdx++
	}
	if filter.Offset > 0 {
		dataQuery += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, filter.Offset)
		argIdx++
	}

	rows, err := r.dbQuerier(ctx).Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]domain.AssetAssignment, 0)
	for rows.Next() {
		var as domain.AssetAssignment
		if err := rows.Scan(
			&as.ID, &as.TenantID, &as.AssetID, &as.EmployeeID, &as.AssignedBy,
			&as.AssignedAt, &as.ReturnedAt, &as.ConditionAtAssignment,
			&as.ConditionAtReturn, &as.Notes, &as.CreatedAt, &as.UpdatedAt,
			&as.AssetName, &as.AssetCode, &as.EmployeeName,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, as)
	}
	return items, total, rows.Err()
}

func (r *AssetAssignmentRepo) GetActiveByAssetID(ctx context.Context, assetID string) (*domain.AssetAssignment, error) {
	query := `
		SELECT aa.id, aa.tenant_id, aa.asset_id, aa.employee_id, aa.assigned_by,
		       aa.assigned_at, aa.returned_at, aa.condition_at_assignment,
		       aa.condition_at_return, aa.notes, aa.created_at, aa.updated_at
		FROM asset_assignments aa
		WHERE aa.asset_id = $1 AND aa.returned_at IS NULL
		ORDER BY aa.created_at DESC LIMIT 1
	`
	var as domain.AssetAssignment
	err := r.dbQuerier(ctx).QueryRow(ctx, query, assetID).Scan(
		&as.ID, &as.TenantID, &as.AssetID, &as.EmployeeID, &as.AssignedBy,
		&as.AssignedAt, &as.ReturnedAt, &as.ConditionAtAssignment,
		&as.ConditionAtReturn, &as.Notes, &as.CreatedAt, &as.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &as, nil
}

func (r *AssetAssignmentRepo) GetActiveByEmployeeID(ctx context.Context, tenantID, employeeID string) ([]domain.AssetAssignment, error) {
	query := `
		SELECT aa.id, aa.tenant_id, aa.asset_id, aa.employee_id, aa.assigned_by,
		       aa.assigned_at, aa.returned_at, aa.condition_at_assignment,
		       aa.condition_at_return, aa.notes, aa.created_at, aa.updated_at,
		       a.name AS asset_name, a.asset_code AS asset_code,
		       COALESCE(e.first_name || ' ' || e.last_name, '') AS employee_name
		FROM asset_assignments aa
		JOIN assets a ON a.id = aa.asset_id
		LEFT JOIN employees e ON e.id = aa.employee_id
		WHERE aa.employee_id = $1 AND aa.tenant_id = $2 AND aa.returned_at IS NULL
		ORDER BY aa.created_at DESC
	`
	rows, err := r.dbQuerier(ctx).Query(ctx, query, employeeID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.AssetAssignment, 0)
	for rows.Next() {
		var as domain.AssetAssignment
		if err := rows.Scan(
			&as.ID, &as.TenantID, &as.AssetID, &as.EmployeeID, &as.AssignedBy,
			&as.AssignedAt, &as.ReturnedAt, &as.ConditionAtAssignment,
			&as.ConditionAtReturn, &as.Notes, &as.CreatedAt, &as.UpdatedAt,
			&as.AssetName, &as.AssetCode, &as.EmployeeName,
		); err != nil {
			return nil, err
		}
		items = append(items, as)
	}
	return items, rows.Err()
}

func (r *AssetAssignmentRepo) Return(ctx context.Context, id, returnedAt string, conditionAtReturn *string, notes *string) error {
	query := `
		UPDATE asset_assignments
		SET returned_at = $1, condition_at_return = $2, notes = COALESCE($3, notes), updated_at = NOW()
		WHERE id = $4 AND returned_at IS NULL
	`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query, returnedAt, conditionAtReturn, notes, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("assignment not found or already returned")
	}
	return nil
}
