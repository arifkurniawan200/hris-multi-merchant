package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type ShiftSwapUC struct {
	repo         domain.ShiftSwapRepository
	empShiftRepo domain.EmployeeShiftRepository
	empRepo      domain.EmployeeRepository
}

func NewShiftSwapUC(
	repo domain.ShiftSwapRepository,
	empShiftRepo domain.EmployeeShiftRepository,
	empRepo domain.EmployeeRepository,
) domain.ShiftSwapUseCase {
	return &ShiftSwapUC{
		repo:         repo,
		empShiftRepo: empShiftRepo,
		empRepo:      empRepo,
	}
}

func (uc *ShiftSwapUC) RequestSwap(ctx context.Context, req *domain.CreateShiftSwapRequest) (*domain.ShiftSwap, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Cek requester punya shift aktif di requester_date
	_, err := uc.empShiftRepo.GetActive(ctx, req.RequesterEmployeeID, req.RequesterDate)
	if err != nil {
		return nil, domain.NewValidation("you don't have an active shift on requester date")
	}

	// Cek target punya shift aktif di target_date
	_, err = uc.empShiftRepo.GetActive(ctx, req.TargetEmployeeID, req.TargetDate)
	if err != nil {
		return nil, domain.NewValidation("target employee doesn't have an active shift on target date")
	}

	// Self-swap guard
	if req.RequesterEmployeeID == req.TargetEmployeeID {
		return nil, domain.NewValidation("cannot swap shift with yourself")
	}

	// Same date guard — must be different dates or different shifts
	if req.RequesterDate == req.TargetDate {
		return nil, domain.NewValidation("swap dates must be different")
	}

	s := &domain.ShiftSwap{
		ID:                  uuid.New().String(),
		TenantID:            req.TenantID,
		RequesterEmployeeID: req.RequesterEmployeeID,
		RequesterDate:       req.RequesterDate,
		TargetEmployeeID:    req.TargetEmployeeID,
		TargetDate:          req.TargetDate,
		Status:              domain.ShiftSwapPending,
		Reason:              req.Reason,
	}

	if err := uc.repo.Create(ctx, s); err != nil {
		logger.Error(ctx, "create shift swap failed",
			"requester", req.RequesterEmployeeID,
			"target", req.TargetEmployeeID,
			"error", err,
		)
		return nil, err
	}

	return s, nil
}

func (uc *ShiftSwapUC) Approve(ctx context.Context, id, managerEmployeeID string) (*domain.ShiftSwap, error) {
	swap, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("shift swap not found")
	}

	if swap.Status != domain.ShiftSwapPending {
		return nil, domain.NewValidation("only pending swaps can be approved")
	}

	// Execute swap logic: swap shift assignments for the day
	// Requester gets target's shift on target_date, target gets requester's shift on requester_date

	// 1. Get requester's shift on requester_date
	_, err = uc.empShiftRepo.GetActive(ctx, swap.RequesterEmployeeID, swap.RequesterDate)
	if err != nil {
		return nil, domain.NewValidation("requester no longer has active shift for swap date")
	}

	// 2. Get target's shift on target_date
	_, err = uc.empShiftRepo.GetActive(ctx, swap.TargetEmployeeID, swap.TargetDate)
	if err != nil {
		return nil, domain.NewValidation("target employee no longer has active shift for swap date")
	}

	// 3. Swap: update requester's assignment to target's shift on target_date's shift
	// But we can't change the employee_id on an existing assignment.
	// Strategy: short-circuit the dates — requester works target_date with target's shift,
	// and target works requester_date with requester's shift.
	//
	// Simplified approach:
	// - Update requester's shift on requester_date → end it today
	// - Create new assignment for requester: target's shift, effective from target_date
	// - Update target's shift on target_date → end it today
	// - Create new assignment for target: requester's shift, effective from requester_date

	// Actually, the cleanest approach is to create temporary assignments.
	// For v1: just mark approved — actual shift re-assignment can be manual by manager
	// or handled in a background process.

	reviewedBy := &managerEmployeeID
	if err := uc.repo.UpdateStatus(ctx, id, domain.ShiftSwapApproved, reviewedBy, nil); err != nil {
		return nil, err
	}

	// Shorten requester's current assignment end to requester_date - 1
	// Create a one-day assignment: requester gets target's shift on target_date? No...
	// Simpler: just swap the shift_ids and dates between the two assignments
	// Actually the simplest v1: just approve, assign the shift swap and let the
	// roster page reflect it.

	// For now — just mark approved. Manager can adjust assignments manually.
	// Full auto-swap (create new one-day assignments, shorten old ones) can be added in v2.

	swap.Status = domain.ShiftSwapApproved
	swap.ReviewedBy = &managerEmployeeID
	return swap, nil
}

func (uc *ShiftSwapUC) Reject(ctx context.Context, id, managerEmployeeID, reason string) (*domain.ShiftSwap, error) {
	swap, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("shift swap not found")
	}

	if swap.Status != domain.ShiftSwapPending {
		return nil, domain.NewValidation("only pending swaps can be rejected")
	}

	reviewedBy := &managerEmployeeID
	rejectionReason := &reason
	if err := uc.repo.UpdateStatus(ctx, id, domain.ShiftSwapRejected, reviewedBy, rejectionReason); err != nil {
		return nil, err
	}

	swap.Status = domain.ShiftSwapRejected
	swap.ReviewedBy = &managerEmployeeID
	swap.RejectionReason = reason
	return swap, nil
}

func (uc *ShiftSwapUC) Cancel(ctx context.Context, id, requesterEmployeeID string) error {
	swap, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return domain.NewNotFound("shift swap not found")
	}

	if swap.RequesterEmployeeID != requesterEmployeeID {
		return domain.NewForbidden("you can only cancel your own swap requests")
	}

	if swap.Status != domain.ShiftSwapPending {
		return domain.NewValidation("only pending swaps can be cancelled")
	}

	return uc.repo.SoftDelete(ctx, id)
}

func (uc *ShiftSwapUC) ListMyRequests(ctx context.Context, employeeID string) ([]domain.ShiftSwap, error) {
	return uc.repo.ListByEmployee(ctx, employeeID)
}

func (uc *ShiftSwapUC) ListPendingForApproval(ctx context.Context, tenantID string) ([]domain.ShiftSwap, error) {
	return uc.repo.ListPendingForManager(ctx, tenantID)
}

func (uc *ShiftSwapUC) ListAll(ctx context.Context, tenantID string, status *domain.ShiftSwapStatus) ([]domain.ShiftSwap, error) {
	return uc.repo.ListByTenant(ctx, tenantID, status)
}
