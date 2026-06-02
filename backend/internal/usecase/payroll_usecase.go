package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/pdf"
	"github.com/google/uuid"
)

type PayrollUC struct {
	payrollRepo       domain.PayrollRepository
	payrollConfigRepo domain.PayrollConfigRepository
	attendanceRepo    domain.AttendanceRepository
	employeeRepo      domain.EmployeeRepository
	tenantRepo        domain.TenantRepository
	txManager         *adapter.TxManager
}

func NewPayrollUC(
	payrollRepo domain.PayrollRepository,
	payrollConfigRepo domain.PayrollConfigRepository,
	attendanceRepo domain.AttendanceRepository,
	employeeRepo domain.EmployeeRepository,
	tenantRepo domain.TenantRepository,
	txManager *adapter.TxManager,
) domain.PayrollUseCase {
	return &PayrollUC{
		payrollRepo:       payrollRepo,
		payrollConfigRepo: payrollConfigRepo,
		attendanceRepo:    attendanceRepo,
		employeeRepo:      employeeRepo,
		tenantRepo:        tenantRepo,
		txManager:         txManager,
	}
}

// ── Generate ────────────────────────────────────

func (uc *PayrollUC) Generate(ctx context.Context, req *domain.GeneratePayrollRequest) ([]domain.Payroll, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	tenantID, _ := ctx.Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		return nil, domain.NewValidation("no tenant context")
	}

	// Get payroll config or use defaults
	cfg, err := uc.payrollConfigRepo.Get(ctx, tenantID)
	if err != nil {
		// Use sensible defaults
		cfg = &domain.PayrollConfig{
			DailySalaryRatio:  25,
			LatePenaltyAmount: 0,
			AbsentPenalty:     0,
			OvertimeRate:      150,
		}
	}

	dailySalaryRatio := cfg.DailySalaryRatio
	if dailySalaryRatio <= 0 {
		dailySalaryRatio = 25
	}
	latePenaltyAmt := cfg.LatePenaltyAmount
	absentPenaltyAmt := cfg.AbsentPenalty

	// Resolve employees
	employees := make([]domain.Employee, 0)
	if len(req.EmployeeIDs) > 0 {
		for _, eid := range req.EmployeeIDs {
			emp, err := uc.employeeRepo.GetByID(ctx, eid)
			if err != nil {
				return nil, domain.NewNotFound(fmt.Sprintf("employee %s not found", eid))
			}
			if emp.TenantID != tenantID {
				return nil, domain.NewValidation(fmt.Sprintf("employee %s does not belong to this tenant", eid))
			}
			employees = append(employees, *emp)
		}
	} else {
		// All active employees
		emps, err := uc.employeeRepo.List(ctx, tenantID, domain.EmployeeFilter{
			Status: "active",
			Limit:  10000,
		})
		if err != nil {
			return nil, domain.NewInternal(fmt.Sprintf("list employees: %v", err))
		}
		employees = emps
	}

	if len(employees) == 0 {
		return nil, domain.NewValidation("no employees found for payroll generation")
	}

	periodYear := req.PeriodYear
	periodMonth := req.PeriodMonth

	// Date range for the month
	dateFrom := fmt.Sprintf("%d-%02d-01", periodYear, periodMonth)
	dateTo := fmt.Sprintf("%d-%02d-%d", periodYear, periodMonth, daysInMonth(periodYear, periodMonth))

	generated := make([]domain.Payroll, 0)

	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Get a raw querier from the tx
		txDB := adapter.GetTxDB(txCtx)
		if txDB == nil {
			return domain.NewInternal("no transaction in context")
		}

		for _, emp := range employees {
			if emp.EmploymentStatus != "active" && emp.EmploymentStatus != "probation" {
				continue
			}

			baseSalary := emp.BaseSalary

			// ── 1. Attendance counts (late, absent, half_day) ──
			attQuery := `SELECT
				COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0)::int,
				COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0)::int,
				COALESCE(SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END), 0)::int
			FROM attendances
			WHERE employee_id=$1 AND tenant_id=$2
			  AND clock_date >= $3::date AND clock_date <= $4::date
			  AND deleted_at IS NULL`

			var lateCount, absentCount, halfDayCount int
			err := txDB.QueryRow(txCtx, attQuery, emp.ID, tenantID, dateFrom, dateTo).Scan(&lateCount, &absentCount, &halfDayCount)
			if err != nil {
				return fmt.Errorf("query attendance for emp %s: %w", emp.ID, err)
			}

			// ── 2. Approved leave days (unpaid) ──
			leaveQuery := `SELECT COALESCE(SUM(lr.total_days), 0)::int
			FROM leave_requests lr
			JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.deleted_at IS NULL
			WHERE lr.employee_id=$1
			  AND lr.status='approved'
			  AND lt.is_paid = false
			  AND lr.deleted_at IS NULL
			  AND lr.start_date >= $2::date AND lr.start_date <= $3::date`

			var leaveDays int
			err = txDB.QueryRow(txCtx, leaveQuery, emp.ID, dateFrom, dateTo).Scan(&leaveDays)
			if err != nil {
				return fmt.Errorf("query leave days for emp %s: %w", emp.ID, err)
			}

			// ── 3. Approved overtime hours SUM (calculate pay in Go) ──
			otHoursQuery := `SELECT COALESCE(SUM(ot.total_hours), 0)::numeric(10,1)
			FROM overtime_requests ot
			WHERE ot.employee_id=$1
			  AND ot.status='approved'
			  AND ot.date >= $2::date AND ot.date <= $3::date
			  AND ot.deleted_at IS NULL`

			var otHours float64
			err = txDB.QueryRow(txCtx, otHoursQuery, emp.ID, dateFrom, dateTo).Scan(&otHours)
			if err != nil {
				return fmt.Errorf("query overtime hours for emp %s: %w", emp.ID, err)
			}

			// ── 4. Approved reimbursements SUM ──
			reimbQuery := `SELECT COALESCE(SUM(amount), 0)::bigint
			FROM reimbursements
			WHERE employee_id=$1
			  AND status='approved'
			  AND deleted_at IS NULL
			  AND created_at >= $2::date AND created_at <= $3::date`

			var reimbAmount int64
			err = txDB.QueryRow(txCtx, reimbQuery, emp.ID, dateFrom, dateTo).Scan(&reimbAmount)
			if err != nil {
				return fmt.Errorf("query reimbursements for emp %s: %w", emp.ID, err)
			}

			// ── Calculate deductions ──
			dailySalary := baseSalary / int64(dailySalaryRatio)
			if dailySalary < 0 {
				dailySalary = 0
			}

			// Late deduction: if latePenaltyAmt > 0 use it, else use dailySalary * lateCount
			var lateDeduction int64
			if latePenaltyAmt > 0 {
				lateDeduction = int64(lateCount) * latePenaltyAmt
			} else {
				lateDeduction = int64(lateCount) * dailySalary
			}

			// Absent deduction: if absentPenaltyAmt > 0 use it, else use dailySalary * absentCount
			var absentDeduction int64
			if absentPenaltyAmt > 0 {
				absentDeduction = int64(absentCount) * absentPenaltyAmt
			} else {
				absentDeduction = int64(absentCount) * dailySalary
			}

			// Half day deduction
			halfDeduction := int64(halfDayCount) * (dailySalary / 2)

			// Leave deduction (unpaid leave days)
			leaveDeduction := int64(leaveDays) * dailySalary

			// Overtime pay: otHours * hourly_rate * overtime_rate/100
			// hourly_rate = dailySalary / 8
			hourlyRate := dailySalary / 8
			var overtimePay int64
			if cfg.OvertimeRate > 0 && hourlyRate > 0 {
				overtimePay = int64(float64(otHours) * float64(hourlyRate) * float64(cfg.OvertimeRate) / 100.0)
			}

			// Net salary
			netSalary := baseSalary - lateDeduction - absentDeduction - halfDeduction - leaveDeduction + overtimePay + reimbAmount
			if netSalary < 0 {
				netSalary = 0
			}

			payroll := &domain.Payroll{
				ID:              uuid.New().String(),
				TenantID:        tenantID,
				EmployeeID:      emp.ID,
				PeriodYear:      periodYear,
				PeriodMonth:     periodMonth,
				BaseSalary:      baseSalary,
				OvertimePay:     overtimePay,
				LateDeduction:   lateDeduction,
				AbsentDeduction: absentDeduction + halfDeduction,
				LeaveDeduction:  leaveDeduction,
				Reimbursement:   reimbAmount,
				NetSalary:       netSalary,
				Status:          domain.PayrollDraft,
				Notes:           "",
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}

			if err := uc.payrollRepo.Create(txCtx, payroll); err != nil {
				return fmt.Errorf("create payroll for emp %s: %w", emp.ID, err)
			}

			generated = append(generated, *payroll)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	logger.L.WithFields(map[string]interface{}{
		"tenant_id":    tenantID,
		"period_year":  periodYear,
		"period_month": periodMonth,
		"count":        len(generated),
	}).Info("payroll generated")

	return generated, nil
}

// ── Approve ────────────────────────────────────

func (uc *PayrollUC) Approve(ctx context.Context, id, userID string) (*domain.Payroll, error) {
	p, err := uc.payrollRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("payroll not found")
	}
	if p.Status != domain.PayrollDraft {
		return nil, domain.NewValidation("payroll is not in draft status")
	}

	if err := uc.payrollRepo.UpdateStatus(ctx, id, domain.PayrollApproved, userID, nil); err != nil {
		return nil, err
	}

	p.Status = domain.PayrollApproved
	p.ApprovedBy = &userID
	now := time.Now()
	p.ApprovedAt = &now
	return p, nil
}

// ── MarkPaid ───────────────────────────────────

func (uc *PayrollUC) MarkPaid(ctx context.Context, id, userID string) (*domain.Payroll, error) {
	p, err := uc.payrollRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("payroll not found")
	}
	if p.Status != domain.PayrollApproved {
		return nil, domain.NewValidation("payroll must be approved before marking as paid")
	}

	now := time.Now()
	if err := uc.payrollRepo.UpdateStatus(ctx, id, domain.PayrollPaid, userID, &now); err != nil {
		return nil, err
	}

	p.Status = domain.PayrollPaid
	p.PaidAt = &now
	return p, nil
}

// ── ListByPeriod ──────────────────────────────

func (uc *PayrollUC) ListByPeriod(ctx context.Context, tenantID string, year, month int, limit, offset int) (*domain.PayrollReport, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	data, total, err := uc.payrollRepo.ListByPeriod(ctx, tenantID, year, month, limit, offset)
	if err != nil {
		return nil, err
	}

	return &domain.PayrollReport{
		Total:  total,
		Data:   data,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// ── GetByID ──────────────────────────────────

func (uc *PayrollUC) GetByID(ctx context.Context, id string) (*domain.Payroll, error) {
	return uc.payrollRepo.GetByID(ctx, id)
}

// ── GetConfig ────────────────────────────────

func (uc *PayrollUC) GetConfig(ctx context.Context, tenantID string) (*domain.PayrollConfig, error) {
	cfg, err := uc.payrollConfigRepo.Get(ctx, tenantID)
	if err != nil {
		// Return defaults
		return &domain.PayrollConfig{
			DailySalaryRatio:  25,
			LatePenaltyAmount: 0,
			AbsentPenalty:     0,
			OvertimeRate:      150,
		}, nil
	}
	return cfg, nil
}

// ── UpdateConfig ─────────────────────────────

func (uc *PayrollUC) UpdateConfig(ctx context.Context, tenantID string, cfg *domain.PayrollConfig) (*domain.PayrollConfig, error) {
	if cfg.DailySalaryRatio <= 0 {
		cfg.DailySalaryRatio = 25
	}
	if cfg.OvertimeRate <= 0 {
		cfg.OvertimeRate = 150
	}

	if cfg.ID == "" {
		cfg.ID = uuid.New().String()
	}
	cfg.TenantID = tenantID

	if err := uc.payrollConfigRepo.Upsert(ctx, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

// ── Helpers ─────────────────────────────────

func daysInMonth(year, month int) int {
	return time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC).Day()
}

// ── DownloadPayslipPDF ─────────────────────

func (uc *PayrollUC) DownloadPayslipPDF(ctx context.Context, id string) ([]byte, string, error) {
	// 1. Get payroll record (includes joined employee name/code from repo)
	p, err := uc.payrollRepo.GetByID(ctx, id)
	if err != nil {
		return nil, "", domain.NewNotFound("payroll not found")
	}

	// 2. Authorization: if user is employee, verify they own this payslip
	role, _ := ctx.Value(middleware.CtxRole).(string)
	if role == "employee" {
		userID, _ := ctx.Value(middleware.CtxUserID).(string)
		tenantID, _ := ctx.Value(middleware.CtxTenantID).(string)
		if userID == "" || tenantID == "" {
			return nil, "", domain.NewForbidden("unauthorized")
		}
		emp, err := uc.employeeRepo.GetByUserID(ctx, tenantID, userID)
		if err != nil {
			return nil, "", domain.NewForbidden("employee record not found")
		}
		if emp.ID != p.EmployeeID {
			return nil, "", domain.NewForbidden("you can only download your own payslip")
		}
	}

	// 3. Resolve tenant name
	tenant, err := uc.tenantRepo.GetByID(ctx, p.TenantID)
	if err != nil {
		return nil, "", domain.NewInternal("failed to resolve tenant info")
	}

	// 4. Resolve employee record (for full employee details like bank, dept, position)
	emp, err := uc.employeeRepo.GetByID(ctx, p.EmployeeID)
	if err != nil {
		return nil, "", domain.NewInternal("failed to resolve employee info")
	}

	// 5. Build PDF
	pdfBytes, err := pdf.BuildPayslipPDF(p, tenant.Name, emp)
	if err != nil {
		return nil, "", domain.NewInternal(fmt.Sprintf("failed to generate PDF: %v", err))
	}

	// 6. Generate filename
	filename := fmt.Sprintf("payslip_%s_%d_%02d.pdf", emp.EmployeeCode, p.PeriodYear, p.PeriodMonth)

	return pdfBytes, filename, nil
}
