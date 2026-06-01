package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type ShiftUC struct {
	repo domain.ShiftRepository
}

func NewShiftUC(repo domain.ShiftRepository) domain.ShiftUseCase {
	return &ShiftUC{repo: repo}
}

func (uc *ShiftUC) Create(ctx context.Context, req *domain.CreateShiftRequest) (*domain.Shift, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Check uniqueness per tenant
	existing, _ := uc.repo.GetByCode(ctx, req.TenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("shift code already exists in this tenant")
	}

	// Apply config defaults for zero values
	grace := req.GraceMinutes
	if grace <= 0 {
		grace = 15
	}
	clockinBefore := req.ClockinWindowBefore
	if clockinBefore <= 0 {
		clockinBefore = 60
	}
	clockoutAfter := req.ClockoutWindowAfter
	if clockoutAfter <= 0 {
		clockoutAfter = 60
	}

	s := &domain.Shift{
		ID:                  uuid.New().String(),
		TenantID:            req.TenantID,
		Name:                req.Name,
		Code:                req.Code,
		StartTime:           req.StartTime,
		EndTime:             req.EndTime,
		GraceMinutes:        grace,
		ClockinWindowBefore: clockinBefore,
		ClockoutWindowAfter: clockoutAfter,
		IsFlexible:          req.IsFlexible,
		Color:               req.Color,
	}

	if err := uc.repo.Create(ctx, s); err != nil {
		logger.Error(ctx, "create shift failed", "tenant_id", req.TenantID, "code", req.Code, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create shift: %v", err))
	}

	logger.Info(ctx, "shift created", "shift_id", s.ID, "code", s.Code, "tenant_id", s.TenantID)
	return s, nil
}

func (uc *ShiftUC) Get(ctx context.Context, id string) (*domain.Shift, error) {
	s, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("shift not found")
	}
	return s, nil
}

func (uc *ShiftUC) Update(ctx context.Context, s *domain.Shift) error {
	if err := uc.repo.Update(ctx, s); err != nil {
		logger.Error(ctx, "update shift failed", "shift_id", s.ID, "error", err)
		return domain.NewInternal(fmt.Sprintf("update shift: %v", err))
	}
	logger.Info(ctx, "shift updated", "shift_id", s.ID)
	return nil
}

func (uc *ShiftUC) List(ctx context.Context, tenantID string) ([]domain.Shift, error) {
	shifts, err := uc.repo.List(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "list shifts failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("list shifts: %v", err))
	}
	return shifts, nil
}

func (uc *ShiftUC) SoftDelete(ctx context.Context, id string) error {
	if err := uc.repo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete shift failed", "shift_id", id, "error", err)
		return domain.NewInternal("failed to delete shift")
	}
	logger.Info(ctx, "shift soft deleted", "shift_id", id)
	return nil
}
