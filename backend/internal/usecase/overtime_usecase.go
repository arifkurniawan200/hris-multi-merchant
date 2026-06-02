package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type OvertimeUC struct {
	overtimeRepo      domain.OvertimeRepository
	employeeRepo      domain.EmployeeRepository
	notificationUC    domain.NotificationUseCase
}

func NewOvertimeUC(
	overtimeRepo domain.OvertimeRepository,
	employeeRepo domain.EmployeeRepository,
	notificationUC domain.NotificationUseCase,
) domain.OvertimeUseCase {
	return &OvertimeUC{
		overtimeRepo:      overtimeRepo,
		employeeRepo:      employeeRepo,
		notificationUC:    notificationUC,
	}
}

// ── Submit ─────────────────────────────────────────

func (uc *OvertimeUC) Submit(ctx context.Context, req *domain.SubmitOvertimeRequest) (*domain.OvertimeRequest, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	tenantID := uuid.MustParse(req.TenantID)

	// Resolve employee from user
	emp, err := uc.employeeRepo.GetByUserID(ctx, tenantID.String(), req.UserID)
	if err != nil {
		logger.Error(ctx, "find employee for overtime submit", "user_id", req.UserID, "error", err)
		return nil, domain.NewNotFound("employee not found for this user")
	}

	ot := &domain.OvertimeRequest{
		ID:         uuid.New(),
		TenantID:   tenantID,
		EmployeeID: uuid.MustParse(emp.ID),
		Date:       req.Date,
		StartTime:  req.StartTime,
		EndTime:    req.EndTime,
		TotalHours: req.TotalHours,
		Reason:     req.Reason,
		Status:     domain.OvertimePending,
	}

	if err := uc.overtimeRepo.Create(ctx, ot); err != nil {
		logger.Error(ctx, "create overtime failed", "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create overtime: %v", err))
	}

	logger.Info(ctx, "overtime submitted",
		"overtime_id", ot.ID,
		"employee_id", emp.ID,
		"tenant_id", tenantID,
		"total_hours", ot.TotalHours)

	// Send notification to manager
	freshCtx := context.Background()
	_ = uc.notificationUC.NotifyOvertimeSubmitted(freshCtx, ot)

	return ot, nil
}

// ── ListMyOvertime ─────────────────────────────────

func (uc *OvertimeUC) ListMyOvertime(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, limit, offset int) ([]domain.OvertimeRequest, error) {
	emp, err := uc.employeeRepo.GetByUserID(ctx, tenantID.String(), userID.String())
	if err != nil {
		return nil, domain.NewNotFound("employee not found")
	}

	ots, err := uc.overtimeRepo.ListByEmployee(ctx, uuid.MustParse(emp.ID), limit, offset)
	if err != nil {
		logger.Error(ctx, "list my overtime failed", "employee_id", emp.ID, "error", err)
		return nil, domain.NewInternal("failed to list overtime")
	}
	return ots, nil
}

// ── ListPending ────────────────────────────────────

func (uc *OvertimeUC) ListPending(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.OvertimeRequest, error) {
	ots, err := uc.overtimeRepo.ListPending(ctx, tenantID, limit, offset)
	if err != nil {
		logger.Error(ctx, "list pending overtime failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal("failed to list pending overtime")
	}
	return ots, nil
}

// ── Approve ─────────────────────────────────────────

func (uc *OvertimeUC) Approve(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	ot, err := uc.overtimeRepo.GetByID(ctx, id)
	if err != nil {
		return domain.NewNotFound("overtime request not found")
	}
	if ot.Status != domain.OvertimePending {
		return domain.NewValidation("can only approve pending requests")
	}

	if err := uc.overtimeRepo.UpdateStatus(ctx, id, domain.OvertimeApproved, userID, ""); err != nil {
		logger.Error(ctx, "approve overtime failed", "overtime_id", id, "error", err)
		return domain.NewInternal("approve overtime failed")
	}

	logger.Info(ctx, "overtime approved", "overtime_id", id, "reviewed_by", userID)

	// Resolve reviewer name
	reviewerName := "Manager"
	if revEmp, err := uc.employeeRepo.GetByUserID(ctx, ot.TenantID.String(), userID.String()); err == nil {
		reviewerName = strings.TrimSpace(revEmp.FirstName + " " + revEmp.LastName)
		if reviewerName == "" {
			reviewerName = "Manager"
		}
	}

	// Send notification to employee
	freshCtx := context.Background()
	_ = uc.notificationUC.NotifyOvertimeReviewed(freshCtx, ot, "approved", reviewerName)
	return nil
}

// ── Reject ──────────────────────────────────────────

func (uc *OvertimeUC) Reject(ctx context.Context, id uuid.UUID, userID uuid.UUID, reason string) error {
	ot, err := uc.overtimeRepo.GetByID(ctx, id)
	if err != nil {
		return domain.NewNotFound("overtime request not found")
	}
	if ot.Status != domain.OvertimePending {
		return domain.NewValidation("can only reject pending requests")
	}

	if err := uc.overtimeRepo.UpdateStatus(ctx, id, domain.OvertimeRejected, userID, reason); err != nil {
		logger.Error(ctx, "reject overtime failed", "overtime_id", id, "error", err)
		return domain.NewInternal("reject overtime failed")
	}

	logger.Info(ctx, "overtime rejected", "overtime_id", id, "reviewed_by", userID)

	// Resolve reviewer name
	reviewerName := "Manager"
	if revEmp, err := uc.employeeRepo.GetByUserID(ctx, ot.TenantID.String(), userID.String()); err == nil {
		reviewerName = strings.TrimSpace(revEmp.FirstName + " " + revEmp.LastName)
		if reviewerName == "" {
			reviewerName = "Manager"
		}
	}

	// Send notification to employee
	freshCtx := context.Background()
	_ = uc.notificationUC.NotifyOvertimeReviewed(freshCtx, ot, "rejected", reviewerName)
	return nil
}

// ── Cancel ─────────────────────────────────────────

func (uc *OvertimeUC) Cancel(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	ot, err := uc.overtimeRepo.GetByID(ctx, id)
	if err != nil {
		return domain.NewNotFound("overtime request not found")
	}
	if ot.Status != domain.OvertimePending {
		return domain.NewValidation("can only cancel pending requests")
	}

	if err := uc.overtimeRepo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "cancel overtime failed", "overtime_id", id, "error", err)
		return domain.NewInternal("cancel overtime failed")
	}

	logger.Info(ctx, "overtime cancelled", "overtime_id", id)
	return nil
}
