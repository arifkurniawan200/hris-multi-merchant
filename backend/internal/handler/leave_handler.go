package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ── Leave Handler ────────────────────────────────

type LeaveHandler struct {
	uc domain.LeaveUseCase
}

func NewLeaveHandler(uc domain.LeaveUseCase) *LeaveHandler {
	return &LeaveHandler{uc: uc}
}

// ── Employee routes ──────────────────────────────

// SubmitLeave handles POST /api/v1/leaves
func (h *LeaveHandler) SubmitLeave(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.CreateLeaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID
	req.UserID = userID

	lr, err := h.uc.Submit(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Leave request submitted", lr, reqID)
}

// MyLeaves handles GET /api/v1/leaves/my
func (h *LeaveHandler) MyLeaves(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

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

	leaves, err := h.uc.ListMyLeaves(r.Context(), uuid.MustParse(tenantID), uuid.MustParse(userID), limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", leaves, reqID)
}

// CancelLeave handles PUT /api/v1/leaves/{id}/cancel
func (h *LeaveHandler) CancelLeave(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	leaveID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid leave ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	if err := h.uc.Cancel(r.Context(), leaveID, uuid.MustParse(userID)); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Leave cancelled", nil, reqID)
}

// Balance handles GET /api/v1/leaves/balance
func (h *LeaveHandler) Balance(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	balances, err := h.uc.GetBalance(r.Context(), uuid.MustParse(userID), time.Now().Year())
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", balances, reqID)
}

// ── Manager+ routes ──────────────────────────────

// ListPendingLeaves handles GET /api/v1/leaves/pending
func (h *LeaveHandler) ListPendingLeaves(w http.ResponseWriter, r *http.Request) {
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

	leaves, err := h.uc.ListPending(r.Context(), uuid.MustParse(tenantID), limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", leaves, reqID)
}

// ListAllLeaves handles GET /api/v1/leaves
func (h *LeaveHandler) ListAllLeaves(w http.ResponseWriter, r *http.Request) {
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

	// Filters
	filter := domain.LeaveFilter{}
	if s := r.URL.Query().Get("status"); s != "" {
		filter.Status = s
	}
	if e := r.URL.Query().Get("employee_id"); e != "" {
		filter.EmployeeID = e
	}
	if d := r.URL.Query().Get("date_from"); d != "" {
		filter.DateFrom = d
	}
	if d := r.URL.Query().Get("date_to"); d != "" {
		filter.DateTo = d
	}

	requests, total, err := h.uc.ListAll(r.Context(), uuid.MustParse(tenantID), filter, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]interface{}{
		"total": total,
		"data":  requests,
	}, reqID)
}

// ApproveLeave handles PUT /api/v1/leaves/{id}/approve
func (h *LeaveHandler) ApproveLeave(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	leaveID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid leave ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	if err := h.uc.Approve(r.Context(), leaveID, uuid.MustParse(userID)); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Leave approved", nil, reqID)
}

// RejectLeave handles PUT /api/v1/leaves/{id}/reject
func (h *LeaveHandler) RejectLeave(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	leaveID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid leave ID", reqID)
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

	if err := h.uc.Reject(r.Context(), leaveID, uuid.MustParse(userID), body.Reason); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Leave rejected", nil, reqID)
}

// ── Leave Type Management (manager+) ─────────────

// CreateLeaveType handles POST /api/v1/leaves-types
func (h *LeaveHandler) CreateLeaveType(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.CreateLeaveTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID

	lt, err := h.uc.CreateLeaveType(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Leave type created", lt, reqID)
}

// ListLeaveTypes handles GET /api/v1/leaves-types
func (h *LeaveHandler) ListLeaveTypes(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	types, err := h.uc.ListLeaveTypes(r.Context(), uuid.MustParse(tenantID))
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", types, reqID)
}

// UpdateLeaveType handles PUT /api/v1/leaves-types/{id}
func (h *LeaveHandler) UpdateLeaveType(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	typeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid leave type ID", reqID)
		return
	}

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	lt := &domain.LeaveType{
		ID:       typeID,
		TenantID: uuid.MustParse(tenantID),
	}

	if v, ok := body["name"].(string); ok {
		lt.Name = v
	}
	if v, ok := body["code"].(string); ok {
		lt.Code = v
	}
	if v, ok := body["default_days_per_year"].(float64); ok {
		lt.DefaultDaysPerYear = int(v)
	}
	if v, ok := body["max_consecutive_days"].(float64); ok {
		lt.MaxConsecutiveDays = int(v)
	}
	if v, ok := body["is_paid"].(bool); ok {
		lt.IsPaid = v
	}
	if v, ok := body["color"].(string); ok {
		lt.Color = v
	}
	if v, ok := body["description"].(string); ok {
		lt.Description = v
	}

	if err := h.uc.UpdateLeaveType(r.Context(), lt); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Leave type updated", nil, reqID)
}

// DeleteLeaveType handles DELETE /api/v1/leaves-types/{id}
func (h *LeaveHandler) DeleteLeaveType(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	typeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid leave type ID", reqID)
		return
	}

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	if err := h.uc.SoftDeleteLeaveType(r.Context(), typeID, uuid.MustParse(tenantID)); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Leave type deleted", nil, reqID)
}
