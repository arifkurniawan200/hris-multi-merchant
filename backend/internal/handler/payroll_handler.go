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

type PayrollHandler struct {
	uc domain.PayrollUseCase
}

func NewPayrollHandler(uc domain.PayrollUseCase) *PayrollHandler {
	return &PayrollHandler{uc: uc}
}

// Generate handles POST /api/v1/payroll/generate
func (h *PayrollHandler) Generate(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.GeneratePayrollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	result, err := h.uc.Generate(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Payroll generated successfully", result, reqID)
}

// ListByPeriod handles GET /api/v1/payroll?year=2025&month=6&limit=50&offset=0
func (h *PayrollHandler) ListByPeriod(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	year, _ := strconv.Atoi(q.Get("year"))
	month, _ := strconv.Atoi(q.Get("month"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	if year == 0 {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "year is required", reqID)
		return
	}
	if month < 1 || month > 12 {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "month must be between 1-12", reqID)
		return
	}

	report, err := h.uc.ListByPeriod(r.Context(), tenantID, year, month, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", report, reqID)
}

// GetByID handles GET /api/v1/payroll/{id}
func (h *PayrollHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := chi.URLParam(r, "id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing payroll ID", reqID)
		return
	}

	p, err := h.uc.GetByID(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", p, reqID)
}

// Approve handles PUT /api/v1/payroll/{id}/approve
func (h *PayrollHandler) Approve(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := chi.URLParam(r, "id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing payroll ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	p, err := h.uc.Approve(r.Context(), id, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Payroll approved", p, reqID)
}

// MarkPaid handles PUT /api/v1/payroll/{id}/paid
func (h *PayrollHandler) MarkPaid(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := chi.URLParam(r, "id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing payroll ID", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	p, err := h.uc.MarkPaid(r.Context(), id, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Payroll marked as paid", p, reqID)
}

// GetConfig handles GET /api/v1/payroll/config
func (h *PayrollHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	cfg, err := h.uc.GetConfig(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", cfg, reqID)
}

// UpdateConfig handles PUT /api/v1/payroll/config
func (h *PayrollHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var cfg domain.PayrollConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	result, err := h.uc.UpdateConfig(r.Context(), tenantID, &cfg)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Payroll config updated", result, reqID)
}
