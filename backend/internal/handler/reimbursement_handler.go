package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/go-chi/chi/v5"
)

// ── Reimbursement Handler ─────────────────────────

type ReimbursementHandler struct {
	uc domain.ReimbursementUseCase
}

func NewReimbursementHandler(uc domain.ReimbursementUseCase) *ReimbursementHandler {
	return &ReimbursementHandler{uc: uc}
}

// ── Reimbursement Type Management (manager+) ──────

// CreateType handles POST /api/v1/reimbursements/types
func (h *ReimbursementHandler) CreateType(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.CreateReimbursementTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	rt, err := h.uc.CreateType(r.Context(), tenantID, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Reimbursement type created", rt, reqID)
}

// UpdateType handles PUT /api/v1/reimbursements/types/{id}
func (h *ReimbursementHandler) UpdateType(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	typeID := chi.URLParam(r, "id")
	if typeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Missing reimbursement type ID", reqID)
		return
	}

	var req domain.UpdateReimbursementTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	rt, err := h.uc.UpdateType(r.Context(), typeID, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Reimbursement type updated", rt, reqID)
}

// ListTypes handles GET /api/v1/reimbursements/types
func (h *ReimbursementHandler) ListTypes(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	types, err := h.uc.ListTypes(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", types, reqID)
}

// DeleteType handles DELETE /api/v1/reimbursements/types/{id}
func (h *ReimbursementHandler) DeleteType(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	typeID := chi.URLParam(r, "id")
	if typeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Missing reimbursement type ID", reqID)
		return
	}

	if err := h.uc.DeleteType(r.Context(), typeID); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Reimbursement type deleted", nil, reqID)
}

// ── Employee+ routes ──────────────────────────────

// Submit handles POST /api/v1/reimbursements
func (h *ReimbursementHandler) Submit(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.ReimbursementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID
	req.UserID = userID

	rb, err := h.uc.Submit(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Reimbursement submitted", rb, reqID)
}

// MyReimbursements handles GET /api/v1/reimbursements/my
func (h *ReimbursementHandler) MyReimbursements(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	limit := 10
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	reimbursements, err := h.uc.MyReimbursements(r.Context(), userID, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", reimbursements, reqID)
}

// ── Manager+ routes ───────────────────────────────

// ListPending handles GET /api/v1/reimbursements/pending
func (h *ReimbursementHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	report, err := h.uc.ListPending(r.Context(), tenantID, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", report, reqID)
}

// ListAll handles GET /api/v1/reimbursements?status=...&limit=...&offset=...
func (h *ReimbursementHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	limit := 10
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	status := r.URL.Query().Get("status")

	report, err := h.uc.ListAll(r.Context(), tenantID, status, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", report, reqID)
}

// Approve handles PUT /api/v1/reimbursements/{id}/approve
func (h *ReimbursementHandler) Approve(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	reimbID := chi.URLParam(r, "id")
	if reimbID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Missing reimbursement ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	rb, err := h.uc.Approve(r.Context(), reimbID, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Reimbursement approved", rb, reqID)
}

// Reject handles PUT /api/v1/reimbursements/{id}/reject
func (h *ReimbursementHandler) Reject(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	reimbID := chi.URLParam(r, "id")
	if reimbID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Missing reimbursement ID", reqID)
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	rb, err := h.uc.Reject(r.Context(), reimbID, userID, body.Reason)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Reimbursement rejected", rb, reqID)
}
