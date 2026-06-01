package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type ShiftSwapHandler struct {
	uc      domain.ShiftSwapUseCase
	empRepo domain.EmployeeRepository
}

func NewShiftSwapHandler(uc domain.ShiftSwapUseCase, empRepo domain.EmployeeRepository) *ShiftSwapHandler {
	return &ShiftSwapHandler{uc: uc, empRepo: empRepo}
}

func (h *ShiftSwapHandler) RequestSwap(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "No user context", reqID)
		return
	}

	// Resolve employee from JWT
	emp, err := h.empRepo.GetByUserID(r.Context(), tenantID, userID)
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrNotFound, "Employee not found for this user", reqID)
		return
	}

	var req domain.CreateShiftSwapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.RequesterEmployeeID = emp.ID
	req.TenantID = tenantID

	swap, err := h.uc.RequestSwap(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Shift swap requested", swap, reqID)
}

func (h *ShiftSwapHandler) ListMySwaps(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if tenantID == "" || userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user/tenant context", reqID)
		return
	}

	emp, err := h.empRepo.GetByUserID(r.Context(), tenantID, userID)
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrNotFound, "Employee not found", reqID)
		return
	}

	swaps, err := h.uc.ListMyRequests(r.Context(), emp.ID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", swaps, reqID)
}

func (h *ShiftSwapHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	swaps, err := h.uc.ListPendingForApproval(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", swaps, reqID)
}

func (h *ShiftSwapHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	// Optional status filter
	var status *domain.ShiftSwapStatus
	if s := r.URL.Query().Get("status"); s != "" {
		switch domain.ShiftSwapStatus(s) {
		case domain.ShiftSwapPending, domain.ShiftSwapApproved, domain.ShiftSwapRejected, domain.ShiftSwapCancelled:
			status = (*domain.ShiftSwapStatus)(&s)
		default:
			response.Err(w, http.StatusBadRequest, response.ErrValidation,
				fmt.Sprintf("Invalid status: %s", s), reqID)
			return
		}
	}

	swaps, err := h.uc.ListAll(r.Context(), tenantID, status)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", swaps, reqID)
}

func (h *ShiftSwapHandler) Approve(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing swap ID", reqID)
		return
	}

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if tenantID == "" || userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user/tenant context", reqID)
		return
	}

	// Resolve manager employee ID
	emp, err := h.empRepo.GetByUserID(r.Context(), tenantID, userID)
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrNotFound, "Employee not found", reqID)
		return
	}

	swap, err := h.uc.Approve(r.Context(), id, emp.ID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Shift swap approved", swap, reqID)
}

func (h *ShiftSwapHandler) Reject(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing swap ID", reqID)
		return
	}

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if tenantID == "" || userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user/tenant context", reqID)
		return
	}

	emp, err := h.empRepo.GetByUserID(r.Context(), tenantID, userID)
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrNotFound, "Employee not found", reqID)
		return
	}

	var req domain.RejectShiftSwapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	req.ReviewedBy = emp.ID

	swap, err := h.uc.Reject(r.Context(), id, req.ReviewedBy, req.RejectionReason)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Shift swap rejected", swap, reqID)
}

func (h *ShiftSwapHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing swap ID", reqID)
		return
	}

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if tenantID == "" || userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user/tenant context", reqID)
		return
	}

	emp, err := h.empRepo.GetByUserID(r.Context(), tenantID, userID)
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrNotFound, "Employee not found", reqID)
		return
	}

	if err := h.uc.Cancel(r.Context(), id, emp.ID); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Shift swap cancelled", map[string]string{"status": "cancelled"}, reqID)
}

// unused but kept for potential future use
var _ = time.Now
