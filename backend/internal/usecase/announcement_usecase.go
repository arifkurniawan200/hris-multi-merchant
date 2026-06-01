package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type AnnouncementUC struct {
	repo         domain.AnnouncementRepository
	empRepo      domain.EmployeeRepository
	notifRepo    domain.NotificationRepository
}

func NewAnnouncementUC(
	repo domain.AnnouncementRepository,
	empRepo domain.EmployeeRepository,
	notifRepo domain.NotificationRepository,
) domain.AnnouncementUseCase {
	return &AnnouncementUC{
		repo:      repo,
		empRepo:   empRepo,
		notifRepo: notifRepo,
	}
}

func (uc *AnnouncementUC) parseUUID(s string) (uuid.UUID, error) {
	parsed, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, domain.NewValidation("invalid uuid: " + s)
	}
	return parsed, nil
}

func (uc *AnnouncementUC) Create(ctx context.Context, tenantID, userID string, req *domain.CreateAnnouncementRequest) (*domain.Announcement, error) {
	now := time.Now()
	a := &domain.Announcement{
		TenantID:     tenantID,
		Title:        req.Title,
		Message:      req.Message,
		DepartmentID: req.DepartmentID,
		IsPinned:     req.IsPinned,
		CreatedBy:    userID,
		PublishedAt:  &now,
	}

	if req.IsPinned {
		a.PinnedAt = &now
	}

	if err := uc.repo.Create(ctx, a); err != nil {
		logger.Error(ctx, "announcement: create failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create announcement: %v", err))
	}

	// Broadcast notification to employees
	if err := uc.broadcastNotification(ctx, tenantID, a); err != nil {
		logger.Error(ctx, "announcement: broadcast notification failed", "announcement_id", a.ID, "error", err)
		// Don't fail the create — notification is best-effort
	}

	return a, nil
}

func (uc *AnnouncementUC) broadcastNotification(ctx context.Context, tenantID string, a *domain.Announcement) error {
	// Get all employees for this tenant to find user IDs to notify
	filter := domain.EmployeeFilter{
		Limit: 10000,
	}
	employees, err := uc.empRepo.List(ctx, tenantID, filter)
	if err != nil {
		return fmt.Errorf("list employees: %v", err)
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return fmt.Errorf("parse tenant id: %v", err)
	}

	for _, emp := range employees {
		if emp.UserID == nil {
			continue
		}
		parsedUserID, err := uuid.Parse(*emp.UserID)
		if err != nil {
			logger.Error(ctx, "announcement: parse user_id failed", "user_id", *emp.UserID, "error", err)
			continue
		}
		notif := &domain.Notification{
			TenantID: tenantUUID,
			UserID:   parsedUserID,
			Type:     domain.NotificationType("announcement"),
			Title:    a.Title,
			Message:  a.Message,
		}
		if err := uc.notifRepo.Create(ctx, notif); err != nil {
			logger.Error(ctx, "announcement: notify user failed", "user_id", emp.UserID, "error", err)
			// Continue — best-effort per user
			continue
		}
	}
	return nil
}

func (uc *AnnouncementUC) GetByID(ctx context.Context, tenantID, id, userID string) (*domain.Announcement, error) {
	a, err := uc.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	// Auto-mark as read when employee views an announcement
	if userID != "" {
		_ = uc.repo.MarkRead(ctx, id, userID) // best-effort
	}
	return a, nil
}

func (uc *AnnouncementUC) List(ctx context.Context, tenantID, userID string, filter domain.AnnouncementFilter) ([]domain.Announcement, int, error) {
	filter.TenantID = tenantID
	filter.UserID = userID
	return uc.repo.List(ctx, filter)
}

func (uc *AnnouncementUC) GetPinned(ctx context.Context, tenantID, userID string) ([]domain.Announcement, error) {
	pinned := true
	filter := domain.AnnouncementFilter{
		TenantID:    tenantID,
		IsPinned:    &pinned,
		UserID:      userID,
	}
	items, _, err := uc.repo.List(ctx, filter)
	return items, err
}

func (uc *AnnouncementUC) Update(ctx context.Context, tenantID, userID, id string, req *domain.CreateAnnouncementRequest) (*domain.Announcement, error) {
	existing, err := uc.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	existing.Title = req.Title
	existing.Message = req.Message
	existing.DepartmentID = req.DepartmentID
	existing.IsPinned = req.IsPinned

	now := time.Now()
	if req.IsPinned && existing.PinnedAt == nil {
		existing.PinnedAt = &now
	} else if !req.IsPinned {
		existing.PinnedAt = nil
	}

	if existing.PublishedAt == nil {
		existing.PublishedAt = &now
	}

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}

	return existing, nil
}

func (uc *AnnouncementUC) Delete(ctx context.Context, tenantID, id string) error {
	return uc.repo.Delete(ctx, tenantID, id)
}

func (uc *AnnouncementUC) MarkRead(ctx context.Context, tenantID, announcementID, userID string) error {
	// Verify announcement exists
	_, err := uc.repo.GetByID(ctx, tenantID, announcementID)
	if err != nil {
		return err
	}
	return uc.repo.MarkRead(ctx, announcementID, userID)
}
