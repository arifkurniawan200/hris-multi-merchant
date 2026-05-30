package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type AttendanceUC struct {
	attendanceRepo domain.AttendanceRepository
	employeeRepo   domain.EmployeeRepository
	txManager      *adapter.TxManager
}

func NewAttendanceUC(
	attendanceRepo domain.AttendanceRepository,
	employeeRepo domain.EmployeeRepository,
	txManager *adapter.TxManager,
) domain.AttendanceUseCase {
	return &AttendanceUC{
		attendanceRepo: attendanceRepo,
		employeeRepo:   employeeRepo,
		txManager:      txManager,
	}
}

// ClockIn performs a clock-in for an employee inside a transaction.
func (uc *AttendanceUC) ClockIn(ctx context.Context, req *domain.ClockInRequest) (*domain.Attendance, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Resolve employee from JWT user_id (employee.user_id = auth user_id)
	emp, err := uc.employeeRepo.GetByUserID(ctx, req.TenantID, req.UserID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}
	if emp.EmploymentStatus != "active" && emp.EmploymentStatus != "probation" {
		return nil, domain.NewValidation("employee is not active")
	}

	today := time.Now().Format("2006-01-02")
	now := time.Now()

	// Determine status based on time: after 08:00 = "late"
	status := domain.AttendancePresent
	if now.Hour() > 8 || (now.Hour() == 8 && now.Minute() > 0) {
		status = domain.AttendanceLate
	}

	var attendance *domain.Attendance

	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Check if already clocked in today with FOR UPDATE lock
		existing, _ := uc.attendanceRepo.GetTodayForUpdate(txCtx, req.EmployeeID)
		if existing != nil {
			return domain.NewConflict("already clocked in today")
		}

		a := &domain.Attendance{
			ID:         uuid.New().String(),
			EmployeeID: emp.ID,
			TenantID:   req.TenantID,
			ClockIn:    now,
			ClockDate:  today,
			Status:     status,
			Notes:      req.Notes,
			Latitude:   req.Latitude,
			Longitude:  req.Longitude,
			SelfieURL:  req.SelfieURL,
		}

		if err := uc.attendanceRepo.Create(txCtx, a); err != nil {
			return domain.NewInternal(fmt.Sprintf("create attendance: %v", err))
		}

		attendance = a
		return nil
	})
	if err != nil {
		logger.Error(ctx, "clock-in failed",
			"employee_id", emp.ID,
			"tenant_id", req.TenantID,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "employee clocked in",
		"attendance_id", attendance.ID,
		"employee_id", emp.ID,
		"clock_date", today,
		"status", attendance.Status)

	return uc.attendanceRepo.GetByID(ctx, attendance.ID)
}

// ClockOut performs a clock-out for an employee inside a transaction.
func (uc *AttendanceUC) ClockOut(ctx context.Context, req *domain.ClockOutRequest) (*domain.Attendance, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Resolve employee from JWT user_id
	emp, err := uc.employeeRepo.GetByUserID(ctx, req.TenantID, req.UserID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}

	var attendance *domain.Attendance

	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Get today's attendance with FOR UPDATE
		existing, _ := uc.attendanceRepo.GetTodayForUpdate(txCtx, emp.ID)
		if existing == nil {
			return domain.NewNotFound("no clock-in record found for today")
		}
		if existing.ClockOut != nil {
			return domain.NewConflict("already clocked out today")
		}

		now := time.Now()
		if err := uc.attendanceRepo.UpdateClockOut(txCtx, existing.ID, now, req.Notes); err != nil {
			return domain.NewInternal(fmt.Sprintf("update clock-out: %v", err))
		}

		existing.ClockOut = &now
		attendance = existing
		return nil
	})
	if err != nil {
		logger.Error(ctx, "clock-out failed",
			"employee_id", emp.ID,
			"tenant_id", req.TenantID,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "employee clocked out",
		"attendance_id", attendance.ID,
		"employee_id", emp.ID,
		"clock_date", attendance.ClockDate)

	return uc.attendanceRepo.GetByID(ctx, attendance.ID)
}

// GetHistory returns the attendance history for an employee.
func (uc *AttendanceUC) GetHistory(ctx context.Context, employeeID string, limit, offset int) ([]domain.Attendance, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	attendances, err := uc.attendanceRepo.ListByEmployee(ctx, employeeID, limit, offset)
	if err != nil {
		logger.Error(ctx, "get attendance history failed",
			"employee_id", employeeID,
			"error", err)
		return nil, domain.NewInternal("failed to get attendance history")
	}

	return attendances, nil
}

// GetReport returns an attendance report for a tenant on a given date.
func (uc *AttendanceUC) GetReport(ctx context.Context, tenantID string, clockDate string, limit, offset int) (*domain.AttendanceReport, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	total, err := uc.attendanceRepo.CountByTenant(ctx, tenantID, clockDate)
	if err != nil {
		logger.Error(ctx, "count attendance report failed",
			"tenant_id", tenantID,
			"clock_date", clockDate,
			"error", err)
		return nil, domain.NewInternal("failed to get attendance report")
	}

	attendances, err := uc.attendanceRepo.ListByTenant(ctx, tenantID, clockDate, limit, offset)
	if err != nil {
		logger.Error(ctx, "list attendance report failed",
			"tenant_id", tenantID,
			"clock_date", clockDate,
			"error", err)
		return nil, domain.NewInternal("failed to get attendance report")
	}

	return &domain.AttendanceReport{
		Date:   clockDate,
		Total:  total,
		Data:   attendances,
		Limit:  limit,
		Offset: offset,
	}, nil
}
