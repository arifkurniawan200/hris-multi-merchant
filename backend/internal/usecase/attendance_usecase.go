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

type AttendanceUC struct {
	attendanceRepo domain.AttendanceRepository
	employeeRepo   domain.EmployeeRepository
	shiftRepo      domain.EmployeeShiftRepository
	txManager      *adapter.TxManager
	attCfg         *config.AttendanceConfig
}

func NewAttendanceUC(
	attendanceRepo domain.AttendanceRepository,
	employeeRepo domain.EmployeeRepository,
	shiftRepo domain.EmployeeShiftRepository,
	txManager *adapter.TxManager,
	attCfg *config.AttendanceConfig,
) domain.AttendanceUseCase {
	return &AttendanceUC{
		attendanceRepo: attendanceRepo,
		employeeRepo:   employeeRepo,
		shiftRepo:      shiftRepo,
		txManager:      txManager,
		attCfg:         attCfg,
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

	now := time.Now()
	today := now.Format("2006-01-02")

	// ── Resolve active shift for today ──────────────────
	shift, err := uc.shiftRepo.GetActiveByEmployee(ctx, emp.ID, today)

	// ── Clock-in window validation ──────────────────────
	if err == nil && shift != nil && !shift.IsFlexible {
		startTime, parseErr := time.Parse("15:04", shift.StartTime)
		if parseErr == nil {
			clockinWindowBefore := shift.ClockinWindowBefore
			if clockinWindowBefore <= 0 {
				clockinWindowBefore = uc.attCfg.DefaultClockinWindowBefore
			}

			// Window starts: start_time - clockin_window_before_minutes
			windowStart := time.Date(now.Year(), now.Month(), now.Day(),
				startTime.Hour(), startTime.Minute(), 0, 0, now.Location()).
				Add(-time.Duration(clockinWindowBefore) * time.Minute)

			if now.Before(windowStart) {
				return nil, domain.NewValidation(
					fmt.Sprintf("clock-in not yet open. Shift %s starts at %s, clock-in available from %s",
						shift.ShiftName, shift.StartTime, windowStart.Format("15:04")))
			}
		}
	}

	// ── Status detection ────────────────────────────────
	status := uc.detectStatus(now, shift)

	var attendance *domain.Attendance

	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Check if already clocked in today with FOR UPDATE lock
		existing, _ := uc.attendanceRepo.GetTodayForUpdate(txCtx, emp.ID)
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

	now := time.Now()
	today := now.Format("2006-01-02")

	// ── Resolve active shift for today ──────────────────
	shift, err := uc.shiftRepo.GetActiveByEmployee(ctx, emp.ID, today)

	// ── Clock-out window validation ─────────────────────
	if err == nil && shift != nil && !shift.IsFlexible {
		endTime, parseErr := time.Parse("15:04", shift.EndTime)
		if parseErr == nil {
			clockoutWindowAfter := shift.ClockoutWindowAfter
			if clockoutWindowAfter <= 0 {
				clockoutWindowAfter = uc.attCfg.DefaultClockoutWindowAfter
			}

			// Window ends: end_time + clockout_window_after_minutes
			windowEnd := time.Date(now.Year(), now.Month(), now.Day(),
				endTime.Hour(), endTime.Minute(), 0, 0, now.Location()).
				Add(time.Duration(clockoutWindowAfter) * time.Minute)

			if now.After(windowEnd) {
				return nil, domain.NewValidation(
					fmt.Sprintf("clock-out window has passed. Shift %s ends at %s, clock-out available until %s",
						shift.ShiftName, shift.EndTime, windowEnd.Format("15:04")))
			}
		}
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

// ── Helper: detect status ───────────────────────────

// detectStatus determines the attendance status based on clock-in time and shift.
// If no shift is assigned, falls back to config-driven defaults.
func (uc *AttendanceUC) detectStatus(clockIn time.Time, shift *domain.EmployeeShift) domain.AttendanceStatus {
	var cutoff time.Time

	if shift != nil && !shift.IsFlexible && shift.StartTime != "" {
		startTime, err := time.Parse("15:04", shift.StartTime)
		if err == nil {
			graceMinutes := shift.GraceMinutes
			if graceMinutes <= 0 {
				graceMinutes = uc.attCfg.DefaultGraceMinutes
			}

			cutoff = time.Date(clockIn.Year(), clockIn.Month(), clockIn.Day(),
				startTime.Hour(), startTime.Minute(), 0, 0, clockIn.Location()).
				Add(time.Duration(graceMinutes) * time.Minute)
		} else {
			// Parse failed, fallback to config
			cutoff = uc.configCutoff(clockIn)
		}
	} else {
		// No shift or flexible shift — use config default cutoff
		cutoff = uc.configCutoff(clockIn)
	}

	if clockIn.After(cutoff) {
		return domain.AttendanceLate
	}
	return domain.AttendancePresent
}

// configCutoff builds a cutoff time from config defaults.
func (uc *AttendanceUC) configCutoff(clockIn time.Time) time.Time {
	cfgCutoff := uc.attCfg.DefaultCutoff
	if cfgCutoff == "" {
		cfgCutoff = "08:00"
	}
	cfgGrace := uc.attCfg.DefaultGraceMinutes
	if cfgGrace <= 0 {
		cfgGrace = 15
	}

	t, err := time.Parse("15:04", cfgCutoff)
	if err != nil {
		t, _ = time.Parse("15:04", "08:00")
	}

	return time.Date(clockIn.Year(), clockIn.Month(), clockIn.Day(),
		t.Hour(), t.Minute(), 0, 0, clockIn.Location()).
		Add(time.Duration(cfgGrace) * time.Minute)
}

// GetHistory returns the attendance history for an employee.
func (uc *AttendanceUC) GetHistory(ctx context.Context, userID string, limit, offset int) ([]domain.Attendance, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Resolve userID → employeeID via tenant from context
	// Try all tenants — get employee linked to this user
	emp, err := uc.employeeRepo.GetByUserID(ctx, "", userID)
	if err != nil || emp == nil {
		// fallback: try using userID as employeeID directly
		logger.Warn(ctx, "attendance history: employee not found by userID, trying direct",
			"user_id", userID,
			"error", err)
		attendances, err := uc.attendanceRepo.ListByEmployee(ctx, userID, limit, offset)
		if err != nil {
			return nil, domain.NewNotFound("employee not found")
		}
		return attendances, nil
	}

	attendances, err := uc.attendanceRepo.ListByEmployee(ctx, emp.ID, limit, offset)
	if err != nil {
		logger.Error(ctx, "get attendance history failed",
			"employee_id", emp.ID,
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
