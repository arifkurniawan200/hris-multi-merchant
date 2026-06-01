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

type AttendanceCorrectionUC struct {
	correctionRepo domain.AttendanceCorrectionRepository
	attendanceRepo domain.AttendanceRepository
	employeeRepo   domain.EmployeeRepository
	txManager      *adapter.TxManager
}

func NewAttendanceCorrectionUC(
	correctionRepo domain.AttendanceCorrectionRepository,
	attendanceRepo domain.AttendanceRepository,
	employeeRepo domain.EmployeeRepository,
	txManager *adapter.TxManager,
) domain.AttendanceCorrectionUseCase {
	return &AttendanceCorrectionUC{
		correctionRepo: correctionRepo,
		attendanceRepo: attendanceRepo,
		employeeRepo:   employeeRepo,
		txManager:      txManager,
	}
}

// Request creates a new attendance correction request with status "pending".
func (uc *AttendanceCorrectionUC) Request(ctx context.Context, req *domain.AttendanceCorrectionRequest) (*domain.AttendanceCorrection, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Resolve employee from JWT user_id
	emp, err := uc.employeeRepo.GetByUserID(ctx, req.TenantID, req.UserID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}

	// Check attendance exists
	attendance, err := uc.attendanceRepo.GetByID(ctx, req.AttendanceID)
	if err != nil {
		return nil, domain.NewNotFound("attendance record not found")
	}

	// Validate attendance belongs to the same tenant
	if attendance.TenantID != req.TenantID {
		return nil, domain.NewNotFound("attendance record not found")
	}

	// Validate attendance belongs to the same employee
	if attendance.EmployeeID != emp.ID {
		return nil, domain.NewValidation("attendance record does not belong to this employee")
	}

	// Validate requested times based on type
	corrType := domain.CorrectionType(req.Type)
	switch corrType {
	case domain.CorrectionClockIn:
		if req.RequestedClockIn == nil {
			return nil, domain.NewValidation("requested_clock_in is required for clock_in correction")
		}
	case domain.CorrectionClockOut:
		if req.RequestedClockOut == nil {
			return nil, domain.NewValidation("requested_clock_out is required for clock_out correction")
		}
		if attendance.ClockOut == nil {
			return nil, domain.NewValidation("employee has not clocked out yet")
		}
	case domain.CorrectionBoth:
		if req.RequestedClockIn == nil {
			return nil, domain.NewValidation("requested_clock_in is required for both correction")
		}
		if req.RequestedClockOut == nil {
			return nil, domain.NewValidation("requested_clock_out is required for both correction")
		}
		if attendance.ClockOut == nil {
			return nil, domain.NewValidation("employee has not clocked out yet")
		}
	default:
		return nil, domain.NewValidation(fmt.Sprintf("invalid correction type: %s", req.Type))
	}

	now := time.Now()

	corr := &domain.AttendanceCorrection{
		ID:                uuid.New().String(),
		TenantID:          req.TenantID,
		EmployeeID:        emp.ID,
		AttendanceID:      req.AttendanceID,
		Type:              corrType,
		ClockDate:         attendance.ClockDate,
		CurrentClockIn:    &attendance.ClockIn,
		RequestedClockIn:  req.RequestedClockIn,
		CurrentClockOut:   attendance.ClockOut,
		RequestedClockOut: req.RequestedClockOut,
		Reason:            req.Reason,
		Status:            domain.CorrectionPending,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := uc.correctionRepo.Create(ctx, corr); err != nil {
		logger.Error(ctx, "create attendance correction failed",
			"employee_id", emp.ID,
			"attendance_id", req.AttendanceID,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "attendance correction requested",
		"correction_id", corr.ID,
		"employee_id", emp.ID,
		"attendance_id", req.AttendanceID,
		"type", corr.Type)

	return uc.correctionRepo.GetByID(ctx, corr.ID)
}

// Approve approves a pending correction and updates the actual attendance record.
func (uc *AttendanceCorrectionUC) Approve(ctx context.Context, id, approvedBy string) (*domain.AttendanceCorrection, error) {
	// Fetch the correction record
	corr, err := uc.correctionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if corr.Status != domain.CorrectionPending {
		return nil, domain.NewValidation("correction is not in pending status")
	}

	// Use a transaction to update both the correction and the attendance record
	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Update correction status
		if err := uc.correctionRepo.UpdateStatus(txCtx, id, domain.CorrectionApproved, approvedBy, ""); err != nil {
			return err
		}

		// Update the actual attendance record with the requested values
		attendance, err := uc.attendanceRepo.GetByID(txCtx, corr.AttendanceID)
		if err != nil {
			return domain.NewNotFound("attendance record not found")
		}

		// Build update based on correction type
		switch corr.Type {
		case domain.CorrectionClockIn:
			if corr.RequestedClockIn != nil {
				// We need to update the attendance clock_in and clock_date
				// Since the repo only has UpdateClockOut, we use raw SQL via tx
				query := `UPDATE attendances SET clock_in=$1, clock_date=$2::date, updated_at=NOW() WHERE id=$3 AND deleted_at IS NULL`
				_, err := adapter.GetTxDB(txCtx).Exec(txCtx, query, *corr.RequestedClockIn, attendance.ClockDate, corr.AttendanceID)
				if err != nil {
					return domain.NewInternal(fmt.Sprintf("update attendance clock_in: %v", err))
				}
			}
		case domain.CorrectionClockOut:
			if corr.RequestedClockOut != nil {
				query := `UPDATE attendances SET clock_out=$1, updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL`
				_, err := adapter.GetTxDB(txCtx).Exec(txCtx, query, *corr.RequestedClockOut, corr.AttendanceID)
				if err != nil {
					return domain.NewInternal(fmt.Sprintf("update attendance clock_out: %v", err))
				}
			}
		case domain.CorrectionBoth:
			if corr.RequestedClockIn != nil {
				query := `UPDATE attendances SET clock_in=$1, clock_date=$2::date, updated_at=NOW() WHERE id=$3 AND deleted_at IS NULL`
				_, err := adapter.GetTxDB(txCtx).Exec(txCtx, query, *corr.RequestedClockIn, attendance.ClockDate, corr.AttendanceID)
				if err != nil {
					return domain.NewInternal(fmt.Sprintf("update attendance clock_in: %v", err))
				}
			}
			if corr.RequestedClockOut != nil {
				query := `UPDATE attendances SET clock_out=$1, updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL`
				_, err := adapter.GetTxDB(txCtx).Exec(txCtx, query, *corr.RequestedClockOut, corr.AttendanceID)
				if err != nil {
					return domain.NewInternal(fmt.Sprintf("update attendance clock_out: %v", err))
				}
			}
		}

		return nil
	})
	if err != nil {
		logger.Error(ctx, "approve attendance correction failed",
			"correction_id", id,
			"approved_by", approvedBy,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "attendance correction approved",
		"correction_id", id,
		"attendance_id", corr.AttendanceID,
		"approved_by", approvedBy)

	return uc.correctionRepo.GetByID(ctx, id)
}

// Reject rejects a pending correction.
func (uc *AttendanceCorrectionUC) Reject(ctx context.Context, id, approvedBy, rejectReason string) (*domain.AttendanceCorrection, error) {
	if rejectReason == "" {
		return nil, domain.NewValidation("reject_reason is required")
	}

	corr, err := uc.correctionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if corr.Status != domain.CorrectionPending {
		return nil, domain.NewValidation("correction is not in pending status")
	}

	if err := uc.correctionRepo.UpdateStatus(ctx, id, domain.CorrectionRejected, approvedBy, rejectReason); err != nil {
		logger.Error(ctx, "reject attendance correction failed",
			"correction_id", id,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "attendance correction rejected",
		"correction_id", id,
		"attendance_id", corr.AttendanceID,
		"rejected_by", approvedBy)

	return uc.correctionRepo.GetByID(ctx, id)
}

// ListPending returns all pending corrections for a tenant with pagination.
func (uc *AttendanceCorrectionUC) ListPending(ctx context.Context, tenantID string, limit, offset int) (*domain.AttendanceCorrectionReport, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	corrections, total, err := uc.correctionRepo.ListByTenant(ctx, tenantID, string(domain.CorrectionPending), limit, offset)
	if err != nil {
		logger.Error(ctx, "list pending corrections failed",
			"tenant_id", tenantID,
			"error", err)
		return nil, domain.NewInternal("failed to list pending corrections")
	}

	return &domain.AttendanceCorrectionReport{
		Total:  total,
		Data:   corrections,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// ListByEmployee returns corrections for a specific employee.
func (uc *AttendanceCorrectionUC) ListByEmployee(ctx context.Context, employeeID string, limit, offset int) ([]domain.AttendanceCorrection, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	corrections, err := uc.correctionRepo.ListByEmployee(ctx, employeeID, limit, offset)
	if err != nil {
		logger.Error(ctx, "list employee corrections failed",
			"employee_id", employeeID,
			"error", err)
		return nil, domain.NewInternal("failed to list corrections")
	}

	return corrections, nil
}

// GetByID returns a single correction by ID.
func (uc *AttendanceCorrectionUC) GetByID(ctx context.Context, id string) (*domain.AttendanceCorrection, error) {
	corr, err := uc.correctionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return corr, nil
}
