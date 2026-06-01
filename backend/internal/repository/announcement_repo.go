package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jackc/pgx/v5"
)

type AnnouncementRepo struct {
	db adapter.DBTX
}

func NewAnnouncementRepo(db adapter.DBTX) domain.AnnouncementRepository {
	return &AnnouncementRepo{db: db}
}

func (r *AnnouncementRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

func scanAnnouncement(row pgx.Row) (*domain.Announcement, error) {
	var a domain.Announcement
	err := row.Scan(
		&a.ID, &a.TenantID, &a.Title, &a.Message,
		&a.DepartmentID, &a.IsPinned, &a.PinnedAt,
		&a.CreatedBy, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt, &a.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AnnouncementRepo) Create(ctx context.Context, a *domain.Announcement) error {
	query := `
		INSERT INTO announcements (tenant_id, title, message, department_id, is_pinned, pinned_at, created_by, published_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := r.dbQuerier(ctx).QueryRow(ctx, query,
		a.TenantID, a.Title, a.Message, a.DepartmentID, a.IsPinned, a.PinnedAt, a.CreatedBy, a.PublishedAt,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	return err
}

func (r *AnnouncementRepo) GetByID(ctx context.Context, tenantID, id string) (*domain.Announcement, error) {
	query := `
		SELECT id, tenant_id, title, message, department_id, is_pinned, pinned_at,
		       created_by, published_at, created_at, updated_at, deleted_at
		FROM announcements
		WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
	`
	return scanAnnouncement(r.dbQuerier(ctx).QueryRow(ctx, query, id, tenantID))
}

func (r *AnnouncementRepo) List(ctx context.Context, filter domain.AnnouncementFilter) ([]domain.Announcement, int, error) {
	args := make([]interface{}, 0)
	conds := make([]string, 0)
	argIdx := 1

	conds = append(conds, fmt.Sprintf("a.tenant_id = $%d", argIdx))
	args = append(args, filter.TenantID)
	argIdx++

	conds = append(conds, "a.deleted_at IS NULL")

	if filter.DepartmentID != nil && *filter.DepartmentID != "" {
		conds = append(conds, fmt.Sprintf("(a.department_id IS NULL OR a.department_id = $%d)", argIdx))
		args = append(args, *filter.DepartmentID)
		argIdx++
	}

	if filter.IsPinned != nil {
		conds = append(conds, fmt.Sprintf("a.is_pinned = $%d", argIdx))
		args = append(args, *filter.IsPinned)
		argIdx++
	}

	whereClause := strings.Join(conds, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM announcements a WHERE %s", whereClause)
	var total int
	if err := r.dbQuerier(ctx).QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data query with read tracking
	readJoin := ""
	readSelect := ""
	if filter.UserID != "" {
		readJoin = fmt.Sprintf("LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $%d", argIdx)
		readSelect = ", CASE WHEN ar.id IS NOT NULL THEN true ELSE false END AS is_read"
		args = append(args, filter.UserID)
		argIdx++
	}

	dataQuery := fmt.Sprintf(`
		SELECT a.id, a.tenant_id, a.title, a.message, a.department_id,
		       a.is_pinned, a.pinned_at, a.created_by, a.published_at,
		       a.created_at, a.updated_at, a.deleted_at
		       %s
		FROM announcements a
		%s
		WHERE %s
		ORDER BY a.is_pinned DESC, a.pinned_at DESC NULLS LAST, a.created_at DESC
	`, readSelect, readJoin, whereClause)

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

	items := make([]domain.Announcement, 0)
	for rows.Next() {
		var a domain.Announcement
		dest := []interface{}{
			&a.ID, &a.TenantID, &a.Title, &a.Message,
			&a.DepartmentID, &a.IsPinned, &a.PinnedAt,
			&a.CreatedBy, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt, &a.DeletedAt,
		}
		if filter.UserID != "" {
			dest = append(dest, &a.IsRead)
		}
		if err := rows.Scan(dest...); err != nil {
			return nil, 0, err
		}
		items = append(items, a)
	}
	return items, total, rows.Err()
}

func (r *AnnouncementRepo) Update(ctx context.Context, a *domain.Announcement) error {
	query := `
		UPDATE announcements
		SET title = $1, message = $2, department_id = $3, is_pinned = $4,
		    pinned_at = $5, published_at = $6, updated_at = NOW()
		WHERE id = $7 AND tenant_id = $8 AND deleted_at IS NULL
	`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query,
		a.Title, a.Message, a.DepartmentID, a.IsPinned, a.PinnedAt, a.PublishedAt, a.ID, a.TenantID,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("announcement not found")
	}
	return nil
}

func (r *AnnouncementRepo) Delete(ctx context.Context, tenantID, id string) error {
	query := `UPDATE announcements SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	ct, err := r.dbQuerier(ctx).Exec(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.NewNotFound("announcement not found")
	}
	return nil
}

func (r *AnnouncementRepo) MarkRead(ctx context.Context, announcementID, userID string) error {
	query := `
		INSERT INTO announcement_reads (announcement_id, user_id, read_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (announcement_id, user_id) DO NOTHING
	`
	_, err := r.dbQuerier(ctx).Exec(ctx, query, announcementID, userID)
	return err
}

func (r *AnnouncementRepo) GetUnreadCount(ctx context.Context, tenantID, userID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM announcements a
		LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $2
		WHERE a.tenant_id = $1
		  AND a.deleted_at IS NULL
		  AND a.published_at IS NOT NULL
		  AND ar.id IS NULL
	`
	var count int
	err := r.dbQuerier(ctx).QueryRow(ctx, query, tenantID, userID).Scan(&count)
	return count, err
}
