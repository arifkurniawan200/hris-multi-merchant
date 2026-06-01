package usecase

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

type EmployeeDocumentUC struct {
	repo       domain.EmployeeDocumentRepository
	storageDir string
}

func NewEmployeeDocumentUC(repo domain.EmployeeDocumentRepository, storageDir string) domain.EmployeeDocumentUseCase {
	return &EmployeeDocumentUC{repo: repo, storageDir: storageDir}
}

func validDocumentType(dt string) bool {
	switch dt {
	case "ktp", "npwp", "bpjs_health", "bpjs_labor", "ijazah", "certificate", "contract", "other":
		return true
	}
	return false
}

func (uc *EmployeeDocumentUC) Upload(ctx context.Context, req *domain.UploadDocumentRequest, fileBytes []byte, fileName, mimeType string) (*domain.EmployeeDocument, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	if !validDocumentType(req.DocumentType) {
		return nil, domain.NewValidation(fmt.Sprintf("invalid document type: %s", req.DocumentType))
	}

	docID := uuid.New().String()

	// Build storage path: storageDir/tenant_id/employee_id/
	relDir := filepath.Join(req.TenantID, req.EmployeeID)
	absDir := filepath.Join(uc.storageDir, relDir)
	if err := os.MkdirAll(absDir, 0755); err != nil {
		logger.Error(ctx, "create upload dir failed", "path", absDir, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create upload directory: %v", err))
	}

	// Save file with UUID prefix to avoid collisions
	storedName := docID + "_" + fileName
	filePath := filepath.Join(absDir, storedName)
	if err := os.WriteFile(filePath, fileBytes, 0644); err != nil {
		logger.Error(ctx, "save file failed", "path", filePath, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("save file: %v", err))
	}

	relPath := filepath.Join(relDir, storedName)

	docName := req.DocumentName
	if docName == "" {
		docName = fileName
	}

	doc := &domain.EmployeeDocument{
		ID:           docID,
		EmployeeID:   req.EmployeeID,
		TenantID:     req.TenantID,
		DocumentType: req.DocumentType,
		DocumentName: docName,
		FileName:     fileName,
		FileSize:     int64(len(fileBytes)),
		MimeType:     mimeType,
		FilePath:     relPath,
		Notes:        req.Notes,
		UploadedBy:   req.UploadedBy,
		ExpiresAt:    req.ExpiresAt,
	}

	if err := uc.repo.Create(ctx, doc); err != nil {
		// Clean up the saved file on DB error
		os.Remove(filePath)
		logger.Error(ctx, "create document record failed", "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create document: %v", err))
	}

	logger.Info(ctx, "employee document uploaded",
		"doc_id", doc.ID,
		"employee_id", doc.EmployeeID,
		"tenant_id", doc.TenantID,
		"type", doc.DocumentType,
		"file_size", doc.FileSize,
	)
	return doc, nil
}

func (uc *EmployeeDocumentUC) List(ctx context.Context, tenantID, employeeID string) ([]domain.EmployeeDocument, error) {
	docs, err := uc.repo.ListByEmployee(ctx, tenantID, employeeID)
	if err != nil {
		logger.Error(ctx, "list employee documents failed", "tenant_id", tenantID, "employee_id", employeeID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("list documents: %v", err))
	}
	return docs, nil
}

func (uc *EmployeeDocumentUC) Get(ctx context.Context, id, tenantID string) (*domain.EmployeeDocument, error) {
	doc, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err.Error() == "employee document not found" {
			return nil, domain.NewNotFound("employee document not found")
		}
		logger.Error(ctx, "get employee document failed", "id", id, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("get document: %v", err))
	}

	if doc.TenantID != tenantID {
		return nil, domain.NewNotFound("employee document not found")
	}

	return doc, nil
}

func (uc *EmployeeDocumentUC) Delete(ctx context.Context, id string) error {
	// Get the doc first to know the file path
	doc, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err.Error() == "employee document not found" {
			return domain.NewNotFound("employee document not found")
		}
		logger.Error(ctx, "get employee document for delete failed", "id", id, "error", err)
		return domain.NewInternal(fmt.Sprintf("get document: %v", err))
	}

	// Soft delete from DB
	if err := uc.repo.SoftDelete(ctx, id); err != nil {
		logger.Error(ctx, "soft delete employee document failed", "id", id, "error", err)
		return domain.NewInternal(fmt.Sprintf("delete document: %v", err))
	}

	// Remove file from disk (best effort)
	fullPath := filepath.Join(uc.storageDir, doc.FilePath)
	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		logger.Error(ctx, "remove document file failed", "path", fullPath, "error", err)
	}

	logger.Info(ctx, "employee document deleted", "doc_id", id)
	return nil
}

func (uc *EmployeeDocumentUC) Verify(ctx context.Context, id, verifiedBy string) error {
	// Check document exists
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err.Error() == "employee document not found" {
			return domain.NewNotFound("employee document not found")
		}
		logger.Error(ctx, "get employee document for verify failed", "id", id, "error", err)
		return domain.NewInternal(fmt.Sprintf("get document: %v", err))
	}

	if err := uc.repo.Verify(ctx, id, verifiedBy); err != nil {
		logger.Error(ctx, "verify employee document failed", "id", id, "verified_by", verifiedBy, "error", err)
		return domain.NewInternal(fmt.Sprintf("verify document: %v", err))
	}

	logger.Info(ctx, "employee document verified", "doc_id", id, "verified_by", verifiedBy)
	return nil
}
