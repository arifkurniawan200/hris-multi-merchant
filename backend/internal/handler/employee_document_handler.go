package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type verifyDocReq struct {
	IsVerified bool `json:"is_verified"`
}

type EmployeeDocumentHandler struct {
	uc         domain.EmployeeDocumentUseCase
	storageDir string
}

func NewEmployeeDocumentHandler(uc domain.EmployeeDocumentUseCase, storageDir string) *EmployeeDocumentHandler {
	return &EmployeeDocumentHandler{uc: uc, storageDir: storageDir}
}

// Upload handles POST /api/v1/employees/documents/upload
func (h *EmployeeDocumentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	// Parse multipart form — max 32MB
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Failed to parse multipart form", reqID)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing file field 'file'", reqID)
		return
	}
	defer file.Close()

	employeeID := r.FormValue("employee_id")
	documentType := r.FormValue("document_type")
	documentName := r.FormValue("document_name")
	notes := r.FormValue("notes")

	if employeeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "employee_id is required", reqID)
		return
	}
	if documentType == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "document_type is required", reqID)
		return
	}

	// Detect MIME type from header
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" || mimeType == "application/octet-stream" {
		ext := strings.ToLower(filepath.Ext(header.Filename))
		switch ext {
		case ".pdf":
			mimeType = "application/pdf"
		case ".jpg", ".jpeg":
			mimeType = "image/jpeg"
		case ".png":
			mimeType = "image/png"
		case ".doc", ".docx":
			mimeType = "application/msword"
		case ".xls", ".xlsx":
			mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		default:
			mimeType = "application/octet-stream"
		}
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to read file", reqID)
		return
	}

	req := &domain.UploadDocumentRequest{
		EmployeeID:   employeeID,
		TenantID:     tenantID,
		DocumentType: documentType,
		DocumentName: documentName,
		Notes:        notes,
		UploadedBy:   userID,
	}

	doc, err := h.uc.Upload(r.Context(), req, fileBytes, header.Filename, mimeType)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Document uploaded", doc, reqID)
}

// List handles GET /api/v1/employees/documents?employee_id=xxx
func (h *EmployeeDocumentHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	employeeID := r.URL.Query().Get("employee_id")
	if employeeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "employee_id query parameter is required", reqID)
		return
	}

	docs, err := h.uc.List(r.Context(), tenantID, employeeID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	if docs == nil {
		docs = []domain.EmployeeDocument{}
	}

	response.JSON(w, http.StatusOK, "Success", docs, reqID)
}

// Download handles GET /api/v1/employees/documents/{id}/download
func (h *EmployeeDocumentHandler) Download(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing document ID", reqID)
		return
	}

	doc, err := h.uc.Get(r.Context(), id, tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	fullPath := filepath.Join(h.storageDir, doc.FilePath)

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		response.Err(w, http.StatusNotFound, response.ErrNotFound, "File not found on disk", reqID)
		return
	}

	w.Header().Set("Content-Type", doc.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, doc.FileName))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", doc.FileSize))
	http.ServeFile(w, r, fullPath)
}

// Delete handles DELETE /api/v1/employees/documents/{id}
func (h *EmployeeDocumentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing document ID", reqID)
		return
	}

	if err := h.uc.Delete(r.Context(), id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Document deleted", nil, reqID)
}

// Verify handles PUT /api/v1/employees/documents/{id}/verify
func (h *EmployeeDocumentHandler) Verify(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing document ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req verifyDocReq
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && !req.IsVerified {
		// Unverify by setting is_verified=false via a special value
		// For now just delete the verify record
	}

	if err := h.uc.Verify(r.Context(), id, userID); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	// Return updated document
	doc, err := h.uc.Get(r.Context(), id, r.Context().Value(middleware.CtxTenantID).(string))
	if err == nil {
		response.JSON(w, http.StatusOK, "Document verified", doc, reqID)
		return
	}

	response.JSON(w, http.StatusOK, "Document verified", nil, reqID)
}
