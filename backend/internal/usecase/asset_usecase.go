package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
)

type AssetCategoryUC struct {
	catRepo domain.AssetCategoryRepository
}

func NewAssetCategoryUC(catRepo domain.AssetCategoryRepository) domain.AssetCategoryUseCase {
	return &AssetCategoryUC{catRepo: catRepo}
}

func (uc *AssetCategoryUC) Create(ctx context.Context, tenantID string, req *domain.CreateAssetCategoryRequest) (*domain.AssetCategory, error) {
	cat := &domain.AssetCategory{
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
	}
	if err := uc.catRepo.Create(ctx, tenantID, cat); err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("create category: %v", err))
	}
	return cat, nil
}

func (uc *AssetCategoryUC) GetByID(ctx context.Context, tenantID, id string) (*domain.AssetCategory, error) {
	return uc.catRepo.GetByID(ctx, tenantID, id)
}

func (uc *AssetCategoryUC) List(ctx context.Context, tenantID string) ([]domain.AssetCategory, error) {
	return uc.catRepo.List(ctx, tenantID)
}

func (uc *AssetCategoryUC) Update(ctx context.Context, tenantID, id string, req *domain.UpdateAssetCategoryRequest) (*domain.AssetCategory, error) {
	existing, err := uc.catRepo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = req.Description
	}
	if err := uc.catRepo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *AssetCategoryUC) Delete(ctx context.Context, tenantID, id string) error {
	return uc.catRepo.Delete(ctx, tenantID, id)
}

// ── Asset UC ────────────────────────────────────────

type AssetUC struct {
	assetRepo     domain.AssetRepository
	assignRepo    domain.AssetAssignmentRepository
	empRepo       domain.EmployeeRepository
}

func NewAssetUC(
	assetRepo domain.AssetRepository,
	assignRepo domain.AssetAssignmentRepository,
	empRepo domain.EmployeeRepository,
) domain.AssetUseCase {
	return &AssetUC{
		assetRepo:  assetRepo,
		assignRepo: assignRepo,
		empRepo:    empRepo,
	}
}

func (uc *AssetUC) Create(ctx context.Context, tenantID string, req *domain.CreateAssetRequest) (*domain.Asset, error) {
	// Check unique asset code
	existing, _ := uc.assetRepo.GetByCode(ctx, tenantID, req.AssetCode)
	if existing != nil {
		return nil, domain.NewConflict(fmt.Sprintf("asset code '%s' already exists", req.AssetCode))
	}

	a := &domain.Asset{
		TenantID:      tenantID,
		CategoryID:    req.CategoryID,
		AssetCode:     req.AssetCode,
		Name:          req.Name,
		Brand:         req.Brand,
		Model:         req.Model,
		SerialNumber:  req.SerialNumber,
		PurchaseDate:  req.PurchaseDate,
		PurchasePrice: req.PurchasePrice,
		Condition:     req.Condition,
		Status:        "available",
		Notes:         req.Notes,
	}

	if err := uc.assetRepo.Create(ctx, a); err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("create asset: %v", err))
	}
	return a, nil
}

func (uc *AssetUC) GetByID(ctx context.Context, tenantID, id string) (*domain.Asset, error) {
	a, err := uc.assetRepo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	// Get current holder if assigned
	if a.Status == "assigned" {
		assignment, _ := uc.assignRepo.GetActiveByAssetID(ctx, a.ID)
		if assignment != nil {
			a.CurrentHolder = assignment.EmployeeID
		}
	}
	return a, nil
}

func (uc *AssetUC) List(ctx context.Context, tenantID string, filter domain.AssetFilter) ([]domain.Asset, int, error) {
	filter.TenantID = tenantID
	return uc.assetRepo.List(ctx, filter)
}

func (uc *AssetUC) Update(ctx context.Context, tenantID, id string, req *domain.UpdateAssetRequest) (*domain.Asset, error) {
	existing, err := uc.assetRepo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if req.CategoryID != nil {
		existing.CategoryID = *req.CategoryID
	}
	if req.AssetCode != nil {
		existing.AssetCode = *req.AssetCode
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Brand != nil {
		existing.Brand = req.Brand
	}
	if req.Model != nil {
		existing.Model = req.Model
	}
	if req.SerialNumber != nil {
		existing.SerialNumber = req.SerialNumber
	}
	if req.PurchaseDate != nil {
		existing.PurchaseDate = req.PurchaseDate
	}
	if req.PurchasePrice != nil {
		existing.PurchasePrice = req.PurchasePrice
	}
	if req.Condition != nil {
		existing.Condition = *req.Condition
	}
	if req.Status != nil {
		existing.Status = *req.Status
	}
	if req.Notes != nil {
		existing.Notes = req.Notes
	}

	if err := uc.assetRepo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *AssetUC) Delete(ctx context.Context, tenantID, id string) error {
	return uc.assetRepo.Delete(ctx, tenantID, id)
}

func (uc *AssetUC) Assign(ctx context.Context, tenantID, assignedBy string, req *domain.CreateAssignmentRequest) (*domain.AssetAssignment, error) {
	// Check asset exists
	asset, err := uc.assetRepo.GetByID(ctx, tenantID, req.AssetID)
	if err != nil {
		return nil, err
	}

	// Check asset is available
	if asset.Status == "assigned" {
		activeAssign, _ := uc.assignRepo.GetActiveByAssetID(ctx, req.AssetID)
		if activeAssign != nil {
			return nil, domain.NewConflict("asset is already assigned to another employee")
		}
	}

	// Check employee exists
	emp, err := uc.empRepo.GetByID(ctx, req.EmployeeID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found")
	}

	nowStr := time.Now().Format("2006-01-02")

	assignment := &domain.AssetAssignment{
		TenantID:              tenantID,
		AssetID:               req.AssetID,
		EmployeeID:            req.EmployeeID,
		AssignedBy:            assignedBy,
		AssignedAt:            nowStr,
		ConditionAtAssignment: req.ConditionAtAssignment,
		Notes:                 req.Notes,
	}

	if err := uc.assignRepo.Create(ctx, assignment); err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("create assignment: %v", err))
	}

	// Update asset status
	_ = uc.assetRepo.UpdateStatus(ctx, req.AssetID, "assigned")

	assignment.AssetName = asset.Name
	assignment.AssetCode = asset.AssetCode
	assignment.EmployeeName = fmt.Sprintf("%s %s", emp.FirstName, emp.LastName)

	logger.Info(ctx, "asset assigned",
		"asset_id", req.AssetID,
		"employee_id", req.EmployeeID,
		"assigned_by", assignedBy,
	)

	return assignment, nil
}

func (uc *AssetUC) ReturnAsset(ctx context.Context, tenantID, assignmentID string, req *domain.ReturnAssignmentRequest) (*domain.AssetAssignment, error) {
	assignment, err := uc.assignRepo.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return nil, err
	}

	if assignment.ReturnedAt != nil {
		return nil, domain.NewConflict("asset already returned")
	}

	returnedAt := time.Now().Format("2006-01-02")
	if req.ReturnedAt != nil && *req.ReturnedAt != "" {
		returnedAt = *req.ReturnedAt
	}

	if err := uc.assignRepo.Return(ctx, assignmentID, returnedAt, req.ConditionAtReturn, req.Notes); err != nil {
		return nil, err
	}

	// Update asset status back to available
	_ = uc.assetRepo.UpdateStatus(ctx, assignment.AssetID, "available")
	// If condition deteriorated, update asset condition
	if req.ConditionAtReturn != nil && *req.ConditionAtReturn != "" {
		asset, _ := uc.assetRepo.GetByID(ctx, tenantID, assignment.AssetID)
		if asset != nil {
			asset.Condition = *req.ConditionAtReturn
			_ = uc.assetRepo.Update(ctx, asset)
		}
	}

	assignment.ReturnedAt = &returnedAt
	assignment.ConditionAtReturn = req.ConditionAtReturn

	logger.Info(ctx, "asset returned",
		"asset_id", assignment.AssetID,
		"assignment_id", assignmentID,
	)

	return assignment, nil
}

func (uc *AssetUC) GetAssignments(ctx context.Context, tenantID string, filter domain.AssignmentFilter) ([]domain.AssetAssignment, int, error) {
	filter.TenantID = tenantID
	return uc.assignRepo.List(ctx, filter)
}

func (uc *AssetUC) GetMyAssets(ctx context.Context, tenantID, userID string) ([]domain.AssetAssignment, error) {
	emp, err := uc.empRepo.GetByUserID(ctx, tenantID, userID)
	if err != nil {
		return nil, domain.NewNotFound("employee not found for this user")
	}

	return uc.assignRepo.GetActiveByEmployeeID(ctx, tenantID, emp.ID)
}

// Helper to fix typo in method name (will fix properly later)
func (uc *AssetUC) Return(ctx context.Context, tenantID, assignmentID string, req *domain.ReturnAssignmentRequest) (*domain.AssetAssignment, error) {
	return uc.ReturnAsset(ctx, tenantID, assignmentID, req)
}
