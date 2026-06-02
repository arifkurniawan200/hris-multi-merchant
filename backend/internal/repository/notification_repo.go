package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type NotificationRepo struct {
	db adapter.DBTX
}

func NewNotificationRepo(db adapter.DBTX) domain.NotificationRepository {
	return &NotificationRepo{db: db}
}

func (r *NotificationRepo) dbQuerier(ctx context.Context) adapter.DBTX {
	if tx := adapter.GetTxDB(ctx); tx != nil {
		return tx
	}
	return r.db
}

var notifColumns = `id, tenant_id, user_id, type, title, message, reference_type, reference_id, is_read, created_at, deleted_at`

func scanNotification(row pgx.Row) (*domain.Notification, error) {
	var n domain.Notification
	var deletedAt *time.Time
	err := row.Scan(
		&n.ID, &n.TenantID, &n.UserID, &n.Type, &n.Title, &n.Message,
		&n.ReferenceType, &n.ReferenceID, &n.IsRead, &n.CreatedAt, &deletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("notification not found")
		}
		return nil, err
	}
	n.DeletedAt = deletedAt
	return &n, nil
}

func scanNotifications(rows pgx.Rows) ([]domain.Notification, error) {
	items := make([]domain.Notification, 0)
	for rows.Next() {
		var n domain.Notification
		var deletedAt *time.Time
		if err := rows.Scan(
			&n.ID, &n.TenantID, &n.UserID, &n.Type, &n.Title, &n.Message,
			&n.ReferenceType, &n.ReferenceID, &n.IsRead, &n.CreatedAt, &deletedAt,
		); err != nil {
			return nil, err
		}
		n.DeletedAt = deletedAt
		items = append(items, n)
	}
	return items, nil
}

func (r *NotificationRepo) Create(ctx context.Context, n *domain.Notification) error {
	q := r.dbQuerier(ctx)
	n.ID = uuid.New()
	_, err := q.Exec(ctx,
		`INSERT INTO notifications (id, tenant_id, user_id, type, title, message, reference_type, reference_id, is_read)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
		n.ID, n.TenantID, n.UserID, n.Type, n.Title, n.Message, n.ReferenceType, n.ReferenceID)
	return err
}

func (r *NotificationRepo) CreateForEmployee(ctx context.Context, n *domain.Notification, employeeID uuid.UUID) error {
	q := r.dbQuerier(ctx)

	// Resolve UserID from Employee
	var userID uuid.UUID
	err := q.QueryRow(ctx, `SELECT user_id FROM employees WHERE id = $1 AND deleted_at IS NULL`, employeeID).Scan(&userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("employee not found or has no user account")
		}
		return err
	}
	if userID == uuid.Nil {
		return nil // employee not linked to any user, skip notification silently
	}

	n.ID = uuid.New()
	n.UserID = userID
	_, err = q.Exec(ctx,
		`INSERT INTO notifications (id, tenant_id, user_id, type, title, message, reference_type, reference_id, is_read)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
		n.ID, n.TenantID, userID, n.Type, n.Title, n.Message, n.ReferenceType, n.ReferenceID)
	return err
}

func (r *NotificationRepo) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	q := r.dbQuerier(ctx)
	rows, err := q.Query(ctx,
		`SELECT `+notifColumns+` FROM notifications
		 WHERE user_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanNotifications(rows)
}

func (r *NotificationRepo) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	q := r.dbQuerier(ctx)
	var count int
	err := q.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL`,
		userID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *NotificationRepo) MarkRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	q := r.dbQuerier(ctx)
	_, err := q.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		id, userID)
	return err
}

func (r *NotificationRepo) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	q := r.dbQuerier(ctx)
	_, err := q.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL`,
		userID)
	return err
}
