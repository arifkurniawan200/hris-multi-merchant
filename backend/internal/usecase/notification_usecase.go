package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type NotificationUC struct {
	notifRepo    domain.NotificationRepository
	employeeRepo domain.EmployeeRepository
}

func NewNotificationUC(
	notifRepo domain.NotificationRepository,
	employeeRepo domain.EmployeeRepository,
) domain.NotificationUseCase {
	return &NotificationUC{
		notifRepo:    notifRepo,
		employeeRepo: employeeRepo,
	}
}

// ── Employee name helper ─────────────────────────

func (uc *NotificationUC) getEmployeeName(ctx context.Context, employeeID uuid.UUID) string {
	emp, err := uc.employeeRepo.GetByID(ctx, employeeID.String())
	if err != nil {
		return "Employee"
	}
	return emp.FirstName + " " + emp.LastName
}

func (uc *NotificationUC) getUserNameByID(ctx context.Context, userID uuid.UUID) string {
	// Try finding by employee → userID reverse lookup
	// We don't have GetByUserID without tenantID, but we can get the employee
	// For reviewer name, we rely on what's passed from the handler
	return ""
}

// ── Manager lookup ────────────────────────────────

// notifyManager finds the employee's manager and sends a notification to the manager's user
func (uc *NotificationUC) notifyManager(ctx context.Context, n *domain.Notification, employeeID uuid.UUID) error {
	emp, err := uc.employeeRepo.GetByID(ctx, employeeID.String())
	if err != nil {
		logger.Warn(ctx, "cannot resolve employee for notification", "employee_id", employeeID, "error", err)
		return nil // skip silently
	}

	if emp.ManagerID == nil || *emp.ManagerID == "" {
		logger.Debug(ctx, "employee has no manager, skipping manager notification",
			"employee_id", employeeID)
		return nil // no manager, skip
	}

	managerID := uuid.MustParse(*emp.ManagerID)
	return uc.notifRepo.CreateForEmployee(ctx, n, managerID)
}

// ── Leave Notifications ──────────────────────────

func (uc *NotificationUC) NotifyLeaveSubmitted(ctx context.Context, leaveReq *domain.LeaveRequest) error {
	empName := uc.getEmployeeName(ctx, leaveReq.EmployeeID)

	title := "New Leave Request"
	message := fmt.Sprintf("%s submitted a leave request (%s)", empName, leaveReq.LeaveTypeName)
	if leaveReq.LeaveTypeName == "" {
		message = fmt.Sprintf("%s submitted a leave request", empName)
	}

	n := &domain.Notification{
		TenantID:      leaveReq.TenantID,
		Type:          domain.NotifLeaveSubmitted,
		Title:         title,
		Message:       message,
		ReferenceType: "leave",
		ReferenceID:   &leaveReq.ID,
	}

	return uc.notifyManager(ctx, n, leaveReq.EmployeeID)
}

func (uc *NotificationUC) NotifyLeaveReviewed(ctx context.Context, leaveReq *domain.LeaveRequest, action string, reviewerName string) error {
	actionLabel := "approved"
	notifType := domain.NotifLeaveApproved
	if action == "rejected" {
		actionLabel = "rejected"
		notifType = domain.NotifLeaveRejected
	}

	title := fmt.Sprintf("Leave Request %s", actionLabel)
	message := fmt.Sprintf("Your leave request (%s → %s) has been %s by %s",
		leaveReq.StartDate, leaveReq.EndDate, actionLabel, reviewerName)

	if action == "rejected" && leaveReq.RejectReason != "" {
		message += fmt.Sprintf(". Reason: %s", leaveReq.RejectReason)
	}

	n := &domain.Notification{
		TenantID:      leaveReq.TenantID,
		Type:          notifType,
		Title:         title,
		Message:       message,
		ReferenceType: "leave",
		ReferenceID:   &leaveReq.ID,
	}

	return uc.notifRepo.CreateForEmployee(ctx, n, leaveReq.EmployeeID)
}

// ── Overtime Notifications ───────────────────────

func (uc *NotificationUC) NotifyOvertimeSubmitted(ctx context.Context, otReq *domain.OvertimeRequest) error {
	empName := uc.getEmployeeName(ctx, otReq.EmployeeID)

	title := "New Overtime Request"
	message := fmt.Sprintf("%s submitted an overtime request (%.1f hours on %s)",
		empName, otReq.TotalHours, otReq.Date)

	n := &domain.Notification{
		TenantID:      otReq.TenantID,
		Type:          domain.NotifOvertimeSubmitted,
		Title:         title,
		Message:       message,
		ReferenceType: "overtime",
		ReferenceID:   &otReq.ID,
	}

	return uc.notifyManager(ctx, n, otReq.EmployeeID)
}

func (uc *NotificationUC) NotifyOvertimeReviewed(ctx context.Context, otReq *domain.OvertimeRequest, action string, reviewerName string) error {
	actionLabel := "approved"
	notifType := domain.NotifOvertimeApproved
	if action == "rejected" {
		actionLabel = "rejected"
		notifType = domain.NotifOvertimeRejected
	}

	title := fmt.Sprintf("Overtime Request %s", actionLabel)
	message := fmt.Sprintf("Your overtime request (%.1f hours on %s) has been %s by %s",
		otReq.TotalHours, otReq.Date, actionLabel, reviewerName)

	if action == "rejected" && otReq.RejectReason != "" {
		message += fmt.Sprintf(". Reason: %s", otReq.RejectReason)
	}

	n := &domain.Notification{
		TenantID:      otReq.TenantID,
		Type:          notifType,
		Title:         title,
		Message:       message,
		ReferenceType: "overtime",
		ReferenceID:   &otReq.ID,
	}

	return uc.notifRepo.CreateForEmployee(ctx, n, otReq.EmployeeID)
}

// ── Read operations ──────────────────────────────

func (uc *NotificationUC) ListMyNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Notification, error) {
	return uc.notifRepo.ListByUser(ctx, userID, limit, offset)
}

func (uc *NotificationUC) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	return uc.notifRepo.CountUnread(ctx, userID)
}

func (uc *NotificationUC) MarkRead(ctx context.Context, notifID uuid.UUID, userID uuid.UUID) error {
	return uc.notifRepo.MarkRead(ctx, notifID, userID)
}

func (uc *NotificationUC) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return uc.notifRepo.MarkAllRead(ctx, userID)
}
