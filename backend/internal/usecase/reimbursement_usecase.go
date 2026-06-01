package usecase

import (
	"context"
	"fmt"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type ReimbursementUC struct {
	reimbTypeRepo domain.ReimbursementTypeRepository
	reimbRepo     domain.ReimbursementRepository
	employeeRepo  domain.EmployeeRepository
	txManager     *adapter.TxManager
}

func NewReimbursementUC(
	reimbTypeRepo domain.ReimbursementTypeRepository,
	reimbRepo domain.ReimbursementRepository,
	employeeRepo domain.EmployeeRepository,
	txManager *adapter.TxManager,
) domain.ReimbursementUseCase {
	return &ReimbursementUC{
		reimbTypeRepo: reimbTypeRepo,
		reimbRepo:     reimbRepo,
		employeeRepo:  employeeRepo,
		txManager:     txManager,
	}
}

// ── Reimbursement Type CRUD ───────────────────────

func (uc *ReimbursementUC) CreateType(ctx context.Context, tenantID string, req *domain.CreateReimbursementTypeRequest) (*domain.ReimbursementType, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	// Check uniqueness
	existing, _ := uc.reimbTypeRepo.GetByCode(ctx, tenantID, req.Code)
	if existing != nil {
		return nil, domain.NewConflict("reimbursement type code already exists")
	}

	rt := &domain.ReimbursementType{
		ID:          uuid.New().String(),
		TenantID:    tenantID,
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		MaxAmount:   req.MaxAmount,
	}

	if err := uc.reimbTypeRepo.Create(ctx, rt); err != nil {
		logger.Error(ctx, "create reimbursement type failed", "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create reimbursement type: %v", err))
	}

	logger.Info(ctx, "reimbursement type created",
		"reimb_type_id", rt.ID,
		"code", rt.Code,
		"tenant_id", tenantID)

	return rt, nil
}

func (uc *ReimbursementUC) UpdateType(ctx context.Context, id string, req *domain.UpdateReimbursementTypeRequest) (*domain.ReimbursementType, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, err := uc.reimbTypeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("reimbursement type not found")
	}

	// If code changed, check uniqueness
	if existing.Code != req.Code {
		dup, _ := uc.reimbTypeRepo.GetByCode(ctx, existing.TenantID, req.Code)
		if dup != nil {
			return nil, domain.NewConflict("reimbursement type code already exists")
		}
	}

	existing.Name = req.Name
	existing.Code = req.Code
	existing.Description = req.Description
	existing.MaxAmount = req.MaxAmount

	if err := uc.reimbTypeRepo.Update(ctx, existing); err != nil {
		logger.Error(ctx, "update reimbursement type failed", "reimb_type_id", id, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("update reimbursement type: %v", err))
	}

	logger.Info(ctx, "reimbursement type updated", "reimb_type_id", id)
	return existing, nil
}

func (uc *ReimbursementUC) ListTypes(ctx context.Context, tenantID string) ([]domain.ReimbursementType, error) {
	types, err := uc.reimbTypeRepo.List(ctx, tenantID)
	if err != nil {
		logger.Error(ctx, "list reimbursement types failed", "tenant_id", tenantID, "error", err)
		return nil, domain.NewInternal("failed to list reimbursement types")
	}
	return types, nil
}

func (uc *ReimbursementUC) DeleteType(ctx context.Context, id string) error {
	// Verify it exists
	_, err := uc.reimbTypeRepo.GetByID(ctx, id)
	if err != nil {
		return domain.NewNotFound("reimbursement type not found")
	}

	if err := uc.reimbTypeRepo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete reimbursement type failed", "reimb_type_id", id, "error", err)
		return domain.NewInternal("failed to delete reimbursement type")
	}

	logger.Info(ctx, "reimbursement type deleted", "reimb_type_id", id)
	return nil
}

// ── Reimbursement (employee+) ─────────────────────

func (uc *ReimbursementUC) Submit(ctx context.Context, req *domain.ReimbursementRequest) (*domain.Reimbursement, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	tenantID := req.TenantID

	// Resolve employee from JWT userID
	emp, err := uc.employeeRepo.GetByUserID(ctx, tenantID, req.UserID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}
	employeeID := emp.ID

	// Validate reimbursement type exists
	reimbType, err := uc.reimbTypeRepo.GetByID(ctx, req.TypeID)
	if err != nil {
		return nil, domain.NewNotFound("reimbursement type not found")
	}
	if reimbType.TenantID != tenantID {
		return nil, domain.NewForbidden("reimbursement type does not belong to this tenant")
	}

	// Validate max_amount if set
	if reimbType.MaxAmount != nil && req.Amount > *reimbType.MaxAmount {
		return nil, domain.NewValidation(
			fmt.Sprintf("amount exceeds maximum of %d for this reimbursement type", *reimbType.MaxAmount))
	}

	var reimbursemnt *domain.Reimbursement

	err = uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		rb := &domain.Reimbursement{
			ID:          uuid.New().String(),
			TenantID:    tenantID,
			EmployeeID:  employeeID,
			TypeID:      req.TypeID,
			Amount:      req.Amount,
			Description: req.Description,
			ReceiptURL:  req.ReceiptURL,
			Status:      domain.ReimbursementPending,
		}

		if err := uc.reimbRepo.Create(txCtx, rb); err != nil {
			return domain.NewInternal(fmt.Sprintf("create reimbursement: %v", err))
		}

		reimbursemnt = rb
		return nil
	})
	if err != nil {
		logger.Error(ctx, "submit reimbursement failed",
			"employee_id", employeeID,
			"tenant_id", tenantID,
			"error", err)
		return nil, err
	}

	logger.Info(ctx, "reimbursement submitted",
		"reimb_id", reimbursemnt.ID,
		"employee_id", employeeID,
		"type_id", req.TypeID,
		"amount", req.Amount)

	return uc.reimbRepo.GetByID(ctx, reimbursemnt.ID)
}

func (uc *ReimbursementUC) MyReimbursements(ctx context.Context, userID string, limit, offset int) ([]domain.Reimbursement, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Resolve employee from userID — we need tenantID too
	// Try getting without tenant filter by passing empty string
	emp, err := uc.employeeRepo.GetByUserID(ctx, "", userID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}

	reimbursements, err := uc.reimbRepo.ListByEmployee(ctx, emp.ID, limit, offset)
	if err != nil {
		logger.Error(ctx, "list my reimbursements failed",
			"employee_id", emp.ID,
			"error", err)
		return nil, domain.NewInternal("failed to list reimbursements")
	}

	return reimbursements, nil
}

// ── Reimbursement management (manager+) ───────────

func (uc *ReimbursementUC) ListPending(ctx context.Context, tenantID string, limit, offset int) (*domain.ReimbursementReport, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	return uc.listByStatus(ctx, tenantID, "pending", limit, offset)
}

func (uc *ReimbursementUC) ListAll(ctx context.Context, tenantID string, status string, limit, offset int) (*domain.ReimbursementReport, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	return uc.listByStatus(ctx, tenantID, status, limit, offset)
}

func (uc *ReimbursementUC) listByStatus(ctx context.Context, tenantID, status string, limit, offset int) (*domain.ReimbursementReport, error) {
	data, total, err := uc.reimbRepo.ListByTenant(ctx, tenantID, status, limit, offset)
	if err != nil {
		logger.Error(ctx, "list reimbursements failed",
			"tenant_id", tenantID,
			"status", status,
			"error", err)
		return nil, domain.NewInternal("failed to list reimbursements")
	}

	return &domain.ReimbursementReport{
		Total:  total,
		Data:   data,
		Limit:  limit,
		Offset: offset,
	}, nil
}

func (uc *ReimbursementUC) Approve(ctx context.Context, id, approvedBy string) (*domain.Reimbursement, error) {
	rb, err := uc.reimbRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("reimbursement not found")
	}

	if rb.Status != domain.ReimbursementPending {
		return nil, domain.NewValidation("only pending reimbursements can be approved")
	}

	if err := uc.reimbRepo.UpdateStatus(ctx, id, domain.ReimbursementApproved, approvedBy, ""); err != nil {
		logger.Error(ctx, "approve reimbursement failed", "reimb_id", id, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("approve reimbursement: %v", err))
	}

	logger.Info(ctx, "reimbursement approved",
		"reimb_id", id,
		"approved_by", approvedBy)

	return uc.reimbRepo.GetByID(ctx, id)
}

func (uc *ReimbursementUC) Reject(ctx context.Context, id, approvedBy, rejectReason string) (*domain.Reimbursement, error) {
	rb, err := uc.reimbRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("reimbursement not found")
	}

	if rb.Status != domain.ReimbursementPending {
		return nil, domain.NewValidation("only pending reimbursements can be rejected")
	}

	if err := uc.reimbRepo.UpdateStatus(ctx, id, domain.ReimbursementRejected, approvedBy, rejectReason); err != nil {
		logger.Error(ctx, "reject reimbursement failed", "reimb_id", id, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("reject reimbursement: %v", err))
	}

	logger.Info(ctx, "reimbursement rejected",
		"reimb_id", id,
		"approved_by", approvedBy,
		"reason", rejectReason)

	return uc.reimbRepo.GetByID(ctx, id)
}
