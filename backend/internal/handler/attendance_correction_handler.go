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

type AttendanceCorrectionHandler struct {
	uc domain.AttendanceCorrectionUseCase
}

func NewAttendanceCorrectionHandler(uc domain.AttendanceCorrectionUseCase) *AttendanceCorrectionHandler {
	return &AttendanceCorrectionHandler{uc: uc}
}

// Request handles POST /api/v1/attendance/corrections
func (h *AttendanceCorrectionHandler) Request(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.AttendanceCorrectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID
	req.UserID = userID

	corr, err := h.uc.Request(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Attendance correction requested", corr, reqID)
}

// Approve handles PUT /api/v1/attendance/corrections/{id}/approve
func (h *AttendanceCorrectionHandler) Approve(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	corrID := chi.URLParam(r, "id")
	if corrID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing correction ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user context", reqID)
		return
	}

	corr, err := h.uc.Approve(r.Context(), corrID, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Attendance correction approved", corr, reqID)
}

// Reject handles PUT /api/v1/attendance/corrections/{id}/reject
func (h *AttendanceCorrectionHandler) Reject(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	corrID := chi.URLParam(r, "id")
	if corrID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing correction ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user context", reqID)
		return
	}

	var body struct {
		RejectReason string `json:"reject_reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	corr, err := h.uc.Reject(r.Context(), corrID, userID, body.RejectReason)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Attendance correction rejected", corr, reqID)
}

// ListPending handles GET /api/v1/attendance/corrections/pending
func (h *AttendanceCorrectionHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	report, err := h.uc.ListPending(r.Context(), tenantID, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", report, reqID)
}

// ListByEmployee handles GET /api/v1/attendance/corrections/employee/{employeeID}
func (h *AttendanceCorrectionHandler) ListByEmployee(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	employeeID := chi.URLParam(r, "employeeID")
	if employeeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	corrections, err := h.uc.ListByEmployee(r.Context(), employeeID, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", corrections, reqID)
}
