package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type OvertimeHandler struct {
	uc domain.OvertimeUseCase
}

func NewOvertimeHandler(uc domain.OvertimeUseCase) *OvertimeHandler {
	return &OvertimeHandler{uc: uc}
}

// SubmitOvertime handles POST /api/v1/overtime
func (h *OvertimeHandler) SubmitOvertime(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.SubmitOvertimeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID
	req.UserID = userID

	ot, err := h.uc.Submit(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Overtime request submitted", ot, reqID)
}

// MyOvertime handles GET /api/v1/overtime
func (h *OvertimeHandler) MyOvertime(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	ots, err := h.uc.ListMyOvertime(r.Context(), uuid.MustParse(tenantID), uuid.MustParse(userID), limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", ots, reqID)
}

// ListPendingOvertime handles GET /api/v1/overtime/pending
func (h *OvertimeHandler) ListPendingOvertime(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	ots, err := h.uc.ListPending(r.Context(), uuid.MustParse(tenantID), limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", ots, reqID)
}

// ApproveOvertime handles PUT /api/v1/overtime/{id}/approve
func (h *OvertimeHandler) ApproveOvertime(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	otID := chi.URLParam(r, "id")
	if otID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing overtime ID", reqID)
		return
	}

	reviewerID, _ := r.Context().Value(middleware.CtxUserID).(string)

	if err := h.uc.Approve(r.Context(), uuid.MustParse(otID), uuid.MustParse(reviewerID)); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Overtime approved", nil, reqID)
}

// RejectOvertime handles PUT /api/v1/overtime/{id}/reject
func (h *OvertimeHandler) RejectOvertime(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	otID := chi.URLParam(r, "id")
	if otID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing overtime ID", reqID)
		return
	}

	reviewerID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.RejectOvertimeRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.uc.Reject(r.Context(), uuid.MustParse(otID), uuid.MustParse(reviewerID), req.Reason); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Overtime rejected", nil, reqID)
}
