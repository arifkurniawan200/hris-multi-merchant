package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// ── Attendance Handler ──────────────────────────

type AttendanceHandler struct {
	uc domain.AttendanceUseCase
}

func NewAttendanceHandler(uc domain.AttendanceUseCase) *AttendanceHandler {
	return &AttendanceHandler{uc: uc}
}

func (h *AttendanceHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.ClockInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	// Set tenant from context, employeeID from JWT or body
	req.TenantID = tenantID
	req.UserID = userID

	att, err := h.uc.ClockIn(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Clock-in recorded", att, reqID)
}

func (h *AttendanceHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.ClockOutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID
	req.UserID = userID

	att, err := h.uc.ClockOut(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Clock-out recorded", att, reqID)
}

func (h *AttendanceHandler) History(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user context", reqID)
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	attendances, err := h.uc.GetHistory(r.Context(), userID, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", attendances, reqID)
}

func (h *AttendanceHandler) Report(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	date := q.Get("date")
	if date == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing date parameter", reqID)
		return
	}

	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	report, err := h.uc.GetReport(r.Context(), tenantID, date, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", report, reqID)
}
