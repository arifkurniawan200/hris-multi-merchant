package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/config"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type LeaveUC struct {
	leaveTypeRepo    domain.LeaveTypeRepository
	leaveRequestRepo domain.LeaveRequestRepository
	employeeRepo     domain.EmployeeRepository
	txManager        *adapter.TxManager
	leaveCfg         *config.LeaveConfig
}

func NewLeaveUC(
	leaveTypeRepo domain.LeaveTypeRepository,
	leaveRequestRepo domain.LeaveRequestRepository,
	employeeRepo domain.EmployeeRepository,
	txManager *adapter.TxManager,
	leaveCfg *config.LeaveConfig,
) domain.LeaveUseCase {
	return &LeaveUC{
		leaveTypeRepo:    leaveTypeRepo,
		leaveRequestRepo: leaveRequestRepo,
		employeeRepo:     employeeRepo,
		txManager:        txManager,
		leaveCfg:         leaveCfg,
	}
}

// ── CreateLeaveType ──────────────────────────────

func (uc *LeaveUC) CreateLeaveType(ctx context.Context, req *domain.CreateLeaveTypeRequest) (*domain.LeaveType, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	tenantID := uuid.MustParse(req.TenantID)

	// Check uniqueness
	existing, _ := uc.leaveTypeRepo.GetByCode(ctx, tenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("leave type code already exists")
	}

	lt := &domain.LeaveType{
		ID:                 uuid.New(),
		TenantID:           tenantID,
		Name:               req.Name,
		Code:               req.Code,
		DefaultDaysPerYear: req.DefaultDaysPerYear,
		MaxConsecutiveDays: req.MaxConsecutiveDays,
		IsPaid:             req.IsPaid,
		Color:              req.Color,
		Description:        req.Description,
	}

	if lt.DefaultDaysPerYear <= 0 {
		lt.DefaultDaysPerYear = uc.leaveCfg.DefaultAnnualDays
	}

	if err := uc.leaveTypeRepo.Create(ctx, lt); err != nil {
		logger.Error(ctx, "create leave type failed", "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create leave type: %v", err))
	}

	logger.Info(ctx, "leave type created",
		"leave_type_id", lt.ID,
		"code", lt.Code,
		"tenant_id", tenantID)

	return lt, nil
}

// ── ListLeaveTypes ───────────────────────────────

func (uc *LeaveUC) ListLeaveTypes(ctx context.Context, tenantID uuid.UUID) ([]domain.LeaveType, error) {
	types, err := uc.leaveTypeRepo.List(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "list leave types failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal("failed to list leave types")
	}
	return types, nil
}

// ── UpdateLeaveType ──────────────────────────────

func (uc *LeaveUC) UpdateLeaveType(ctx context.Context, req *domain.LeaveType) error {
	existing, err := uc.leaveTypeRepo.GetByID(ctx, req.ID)
	if err != nil {
		return domain.NewNotFound("leave type not found")
	}

	// If code changed, check uniqueness
	if existing.Code != req.Code {
		dup, _ := uc.leaveTypeRepo.GetByCode(ctx, req.TenantID, req.Code)
		if dup != nil {
			return domain.NewConflict("leave type code already exists")
		}
	}

	if err := uc.leaveTypeRepo.Update(ctx, req); err != nil {
		logger.Error(ctx, "update leave type failed",
			"leave_type_id", req.ID,
			"error", err)
		return domain.NewInternal(fmt.Sprintf("update leave type: %v", err))
	}

	logger.Info(ctx, "leave type updated", "leave_type_id", req.ID)
	return nil
}

// ── Submit ───────────────────────────────────────

func (uc *LeaveUC) Submit(ctx context.Context, req *domain.CreateLeaveRequest) (*domain.LeaveRequest, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	tenantID := uuid.MustParse(req.TenantID)

	// Resolve employee from JWT user_id
	emp, err := uc.employeeRepo.GetByUserID(ctx, req.TenantID, req.UserID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}
	employeeID := uuid.MustParse(emp.ID)

	// Validate leave type exists and belongs to same tenant
	leaveTypeUUID := uuid.MustParse(req.LeaveTypeID)
	leaveType, err := uc.leaveTypeRepo.GetByID(ctx, leaveTypeUUID)
	if err != nil {
		return nil, domain.NewNotFound("leave type not found")
	}
	if leaveType.TenantID != tenantID {
		return nil, domain.NewForbidden("leave type does not belong to this tenant")
	}

	// Date validation
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, domain.NewValidation("invalid start_date format, use YYYY-MM-DD")
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, domain.NewValidation("invalid end_date format, use YYYY-MM-DD")
	}
	if endDate.Before(startDate) {
		return nil, domain.NewValidation("end_date must be after or equal to start_date")
	}

	// Check max consecutive days
	if leaveType.MaxConsecutiveDays > 0 {
		days := int(endDate.Sub(startDate).Hours()/24) + 1
		if days > leaveType.MaxConsecutiveDays {
			return nil, domain.NewValidation(
				fmt.Sprintf("max consecutive days for %s is %d", leaveType.Name, leaveType.MaxConsecutiveDays))
		}
	}

	// Conflict check
	overlap, err := uc.leaveRequestRepo.HasOverlap(ctx, employeeID, req.StartDate, req.EndDate, nil)
	if err != nil {
		logger.Error(ctx, "overlap check failed", "employee_id", employeeID, "error", err)
		return nil, domain.NewInternal("failed to check leave conflicts")
	}
	if overlap {
		return nil, domain.NewConflict("you already have a leave request for this date range")
	}

	var leaveRequest *domain.LeaveRequest

	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		lr := &domain.LeaveRequest{
			ID:          uuid.New(),
			TenantID:    tenantID,
			EmployeeID:  employeeID,
			LeaveTypeID: leaveTypeUUID,
			StartDate:   req.StartDate,
			EndDate:     req.EndDate,
			TotalDays:   req.TotalDays,
			Reason:      req.Reason,
			Status:      "pending",
		}

		if err := uc.leaveRequestRepo.Create(txCtx, lr); err != nil {
			return domain.NewInternal(fmt.Sprintf("create leave request: %v", err))
		}

		leaveRequest = lr
		return nil
	})
	if err != nil {
		logger.Error(ctx, "submit leave failed",
			"employee_id", employeeID,
			"tenant_id", tenantID,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "leave request submitted",
		"leave_id", leaveRequest.ID,
		"employee_id", employeeID,
		"start_date", req.StartDate,
		"end_date", req.EndDate)

	return uc.leaveRequestRepo.GetByID(ctx, leaveRequest.ID)
}

// ── GetByID ──────────────────────────────────────

func (uc *LeaveUC) GetByID(ctx context.Context, id uuid.UUID) (*domain.LeaveRequest, error) {
	lr, err := uc.leaveRequestRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("leave request not found")
	}
	return lr, nil
}

// ── ListMyLeaves ─────────────────────────────────

func (uc *LeaveUC) ListMyLeaves(ctx context.Context, tenantID, userID uuid.UUID, limit, offset int) ([]domain.LeaveRequest, error) {
	// Resolve employee from JWT user_id
	emp, err := uc.employeeRepo.GetByUserID(ctx, tenantID.String(), userID.String())
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}
	employeeID := uuid.MustParse(emp.ID)

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	requests, err := uc.leaveRequestRepo.ListByEmployee(ctx, employeeID, limit, offset)
	if err != nil {
		logger.Error(ctx, "list my leaves failed",
			"employee_id", employeeID,
			"error", err)
		return nil, domain.NewInternal("failed to list leave requests")
	}

	return requests, nil
}

// ── ListPending ──────────────────────────────────

func (uc *LeaveUC) ListPending(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.LeaveRequest, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	requests, err := uc.leaveRequestRepo.ListPending(ctx, tenantID, limit, offset)
	if err != nil {
		logger.Error(ctx, "list pending leaves failed",
			"tenant_id", tenantID,
			"error", err)
		return nil, domain.NewInternal("failed to list pending leaves")
	}

	return requests, nil
}

// ── ListAll ──────────────────────────────────────

func (uc *LeaveUC) ListAll(ctx context.Context, tenantID uuid.UUID, filter domain.LeaveFilter, limit, offset int) ([]domain.LeaveRequest, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	total, err := uc.leaveRequestRepo.CountByTenant(ctx, tenantID, filter)
	if err != nil {
		logger.Error(ctx, "count leaves failed",
			"tenant_id", tenantID,
			"error", err)
		return nil, 0, domain.NewInternal("failed to count leaves")
	}

	requests, err := uc.leaveRequestRepo.ListByTenant(ctx, tenantID, filter, limit, offset)
	if err != nil {
		logger.Error(ctx, "list all leaves failed",
			"tenant_id", tenantID,
			"error", err)
		return nil, 0, domain.NewInternal("failed to list leaves")
	}

	return requests, total, nil
}

// ── Approve ──────────────────────────────────────

func (uc *LeaveUC) Approve(ctx context.Context, leaveID uuid.UUID, userID uuid.UUID) error {
	lr, err := uc.leaveRequestRepo.GetByID(ctx, leaveID)
	if err != nil {
		return domain.NewNotFound("leave request not found")
	}

	if lr.Status != "pending" {
		return domain.NewValidation("only pending leaves can be approved")
	}

	// Resolve reviewer employee from userID
	emp, err := uc.employeeRepo.GetByUserID(ctx, lr.TenantID.String(), userID.String())
	if err != nil {
		return domain.NewNotFound("reviewer employee not found")
	}
	reviewerEmployeeID := uuid.MustParse(emp.ID)

	if err := uc.leaveRequestRepo.UpdateStatus(ctx, leaveID, "approved", reviewerEmployeeID, ""); err != nil {
		logger.Error(ctx, "approve leave failed",
			"leave_id", leaveID,
			"error", err)
		return domain.NewInternal(fmt.Sprintf("approve leave: %v", err))
	}

	logger.Info(ctx, "leave approved",
		"leave_id", leaveID,
		"reviewer", reviewerEmployeeID)

	return nil
}

// ── Reject ───────────────────────────────────────

func (uc *LeaveUC) Reject(ctx context.Context, leaveID uuid.UUID, userID uuid.UUID, reason string) error {
	lr, err := uc.leaveRequestRepo.GetByID(ctx, leaveID)
	if err != nil {
		return domain.NewNotFound("leave request not found")
	}

	if lr.Status != "pending" {
		return domain.NewValidation("only pending leaves can be rejected")
	}

	// Resolve reviewer employee from userID
	emp, err := uc.employeeRepo.GetByUserID(ctx, lr.TenantID.String(), userID.String())
	if err != nil {
		return domain.NewNotFound("reviewer employee not found")
	}
	reviewerEmployeeID := uuid.MustParse(emp.ID)

	if err := uc.leaveRequestRepo.UpdateStatus(ctx, leaveID, "rejected", reviewerEmployeeID, reason); err != nil {
		logger.Error(ctx, "reject leave failed",
			"leave_id", leaveID,
			"error", err)
		return domain.NewInternal(fmt.Sprintf("reject leave: %v", err))
	}

	logger.Info(ctx, "leave rejected",
		"leave_id", leaveID,
		"reviewer", reviewerEmployeeID,
		"reason", reason)

	return nil
}

// ── Cancel ───────────────────────────────────────

func (uc *LeaveUC) Cancel(ctx context.Context, leaveID uuid.UUID, userID uuid.UUID) error {
	lr, err := uc.leaveRequestRepo.GetByID(ctx, leaveID)
	if err != nil {
		return domain.NewNotFound("leave request not found")
	}

	// Resolve employee from userID
	emp, err := uc.employeeRepo.GetByUserID(ctx, lr.TenantID.String(), userID.String())
	if err != nil {
		return domain.NewNotFound("employee not found for this user")
	}
	employeeID := uuid.MustParse(emp.ID)

	// Only owner can cancel
	if lr.EmployeeID != employeeID {
		return domain.NewForbidden("you can only cancel your own leave requests")
	}

	// Can cancel if pending, or approved but before start date
	if lr.Status == "pending" {
		// OK
	} else if lr.Status == "approved" {
		// Check if start date hasn't passed
		startDate, err := time.Parse("2006-01-02", lr.StartDate)
		if err != nil {
			return domain.NewInternal("invalid start date on leave request")
		}
		today := time.Now().Truncate(24 * time.Hour)
		if startDate.Before(today) || startDate.Equal(today) {
			return domain.NewValidation("cannot cancel approved leave on or after start date")
		}
	} else {
		return domain.NewValidation(fmt.Sprintf("cannot cancel leave with status %s", lr.Status))
	}

	if err := uc.leaveRequestRepo.Cancel(ctx, leaveID); err != nil {
		logger.Error(ctx, "cancel leave failed",
			"leave_id", leaveID,
			"error", err)
		return domain.NewInternal(fmt.Sprintf("cancel leave: %v", err))
	}

	logger.Info(ctx, "leave cancelled",
		"leave_id", leaveID,
		"employee_id", employeeID)

	return nil
}

// ── GetBalance ───────────────────────────────────

func (uc *LeaveUC) GetBalance(ctx context.Context, userID uuid.UUID, year int) ([]domain.LeaveBalance, error) {
	// Resolve the employee to get tenant — try without tenant filter first
	emp, err := uc.employeeRepo.GetByUserID(ctx, "", userID.String())
	if err != nil {
		// Try resolving by employee ID directly - maybe the caller passed employee UUID
		emp, err = uc.employeeRepo.GetByID(ctx, userID.String())
		if err != nil {
			return nil, domain.NewNotFound("employee not found")
		}
	}
	employeeID := uuid.MustParse(emp.ID)
	tenantID := uuid.MustParse(emp.TenantID)

	// Get all leave types for this tenant
	leaveTypes, err := uc.leaveTypeRepo.List(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "list leave types for balance failed",
			"tenant_id", tenantID,
			"error", err)
		return nil, domain.NewInternal("failed to get leave balance")
	}

	balances := make([]domain.LeaveBalance, 0, len(leaveTypes))
	for _, lt := range leaveTypes {
		used, err := uc.leaveRequestRepo.GetUsedDays(ctx, employeeID, lt.ID, year)
		if err != nil {
			logger.Error(ctx, "get used days failed",
				"employee_id", employeeID,
				"leave_type_id", lt.ID,
				"error", err)
			used = 0
		}

		allocated := lt.DefaultDaysPerYear
		remaining := allocated - used
		if remaining < 0 && !uc.leaveCfg.AllowNegativeBalance {
			remaining = 0
		}

		balances = append(balances, domain.LeaveBalance{
			LeaveTypeID:   lt.ID,
			LeaveTypeName: lt.Name,
			LeaveTypeCode: lt.Code,
			TotalAllocated: allocated,
			Used:          used,
			Remaining:     remaining,
		})
	}

	return balances, nil
}
