package domain

import (
	"context"
	"time"
)

// ── Announcement ──────────────────────────────────────

type Announcement struct {
	ID           string     `json:"id" validate:"required,uuid"`
	TenantID     string     `json:"tenant_id" validate:"required,uuid"`
	Title        string     `json:"title" validate:"required,min=3,max=255"`
	Message      string     `json:"message" validate:"required,min=1"`
	DepartmentID *string    `json:"department_id,omitempty"`
	IsPinned     bool       `json:"is_pinned"`
	PinnedAt     *time.Time `json:"pinned_at,omitempty"`
	CreatedBy    string     `json:"created_by" validate:"required,uuid"`
	PublishedAt  *time.Time `json:"published_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`

	// Extra fields (not in DB)
	CreatorName   string `json:"creator_name,omitempty"`
	DepartmentName string `json:"department_name,omitempty"`
	IsRead        bool   `json:"is_read,omitempty"`
	ReadCount     int    `json:"read_count,omitempty"`
	TargetCount   int    `json:"target_count,omitempty"`
}

type AnnouncementRead struct {
	ID             string    `json:"id"`
	AnnouncementID string    `json:"announcement_id"`
	UserID         string    `json:"user_id"`
	ReadAt         time.Time `json:"read_at"`
}

type CreateAnnouncementRequest struct {
	Title        string  `json:"title" validate:"required,min=3,max=255"`
	Message      string  `json:"message" validate:"required,min=1"`
	DepartmentID *string `json:"department_id,omitempty"`
	IsPinned     bool    `json:"is_pinned"`
	Audience     string  `json:"audience"` // 'all' or 'department'
}

type AnnouncementFilter struct {
	TenantID     string
	DepartmentID *string
	IsPinned     *bool
	Limit        int
	Offset       int
	IncludeRead  bool
	UserID       string // for is_read tracking
}

// ── Announcement Repository ───────────────────────

type AnnouncementRepository interface {
	Create(ctx context.Context, announcement *Announcement) error
	GetByID(ctx context.Context, tenantID, id string) (*Announcement, error)
	List(ctx context.Context, filter AnnouncementFilter) ([]Announcement, int, error)
	Update(ctx context.Context, announcement *Announcement) error
	Delete(ctx context.Context, tenantID, id string) error
	MarkRead(ctx context.Context, announcementID, userID string) error
	GetUnreadCount(ctx context.Context, tenantID, userID string) (int, error)
}

// ── Announcement UseCase ──────────────────────────

type AnnouncementUseCase interface {
	Create(ctx context.Context, tenantID, userID string, req *CreateAnnouncementRequest) (*Announcement, error)
	GetByID(ctx context.Context, tenantID, id, userID string) (*Announcement, error)
	List(ctx context.Context, tenantID, userID string, filter AnnouncementFilter) ([]Announcement, int, error)
	Update(ctx context.Context, tenantID, userID, id string, req *CreateAnnouncementRequest) (*Announcement, error)
	Delete(ctx context.Context, tenantID, id string) error
	MarkRead(ctx context.Context, tenantID, announcementID, userID string) error
	GetPinned(ctx context.Context, tenantID, userID string) ([]Announcement, error)
}
