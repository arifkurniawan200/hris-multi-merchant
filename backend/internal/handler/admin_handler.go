package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type AdminHandler struct {
	tenantUC      domain.TenantUseCase
	userTenantRepo domain.UserTenantRepository
}

func NewAdminHandler(tenantUC domain.TenantUseCase, userTenantRepo domain.UserTenantRepository) *AdminHandler {
	return &AdminHandler{tenantUC: tenantUC, userTenantRepo: userTenantRepo}
}

// ListTenants GET /api/v1/admin/tenants (super_admin only)
func (h *AdminHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	tenants, err := h.tenantUC.ListTenantsWithCounts(r.Context(), limit, offset)
	if err != nil {
		logger.Error(r.Context(), "admin list tenants failed", "error", err)
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to list tenants", reqID)
		return
	}
	response.JSON(w, http.StatusOK, "Success", tenants, reqID)
}

// GetTenantDetail GET /api/v1/admin/tenants/{id}
func (h *AdminHandler) GetTenantDetail(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	detail, err := h.tenantUC.GetTenantDetail(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Success", detail, reqID)
}

// ListAllUsers GET /api/v1/admin/users
func (h *AdminHandler) ListAllUsers(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	users, err := h.userTenantRepo.ListAllUsers(r.Context())
	if err != nil {
		logger.Error(r.Context(), "admin list all users failed", "error", err)
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to list users", reqID)
		return
	}
	response.JSON(w, http.StatusOK, "Success", users, reqID)
}

// ActivateTenant PUT /api/v1/admin/tenants/:id/activate
func (h *AdminHandler) ActivateTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	if err := h.tenantUC.ActivateTenant(r.Context(), tenantID); err != nil {
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Tenant activated", map[string]string{"status": "activated"}, reqID)
}

// DeactivateTenant PUT /api/v1/admin/tenants/:id/deactivate
func (h *AdminHandler) DeactivateTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	if err := h.tenantUC.DeactivateTenant(r.Context(), tenantID); err != nil {
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Tenant deactivated", map[string]string{"status": "deactivated"}, reqID)
}

// ExtendTenant PUT /api/v1/admin/tenants/:id/extend
func (h *AdminHandler) ExtendTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	var req domain.ExtendTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	if err := h.tenantUC.ExtendTenant(r.Context(), tenantID, req.Months); err != nil {
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Subscription extended", map[string]interface{}{
		"status": "extended",
		"months": req.Months,
	}, reqID)
}

// ChangePlan PUT /api/v1/admin/tenants/:id/plan
func (h *AdminHandler) ChangePlan(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	var req domain.ChangePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	if err := h.tenantUC.ChangePlan(r.Context(), tenantID, &req); err != nil {
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Plan changed", map[string]string{
		"status": "plan_changed",
		"plan":   req.Plan,
	}, reqID)
}

// SoftDeleteTenant DELETE /api/v1/admin/tenants/:id (soft delete)
func (h *AdminHandler) SoftDeleteTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	if err := h.tenantUC.SoftDeleteTenant(r.Context(), tenantID); err != nil {
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Tenant deleted", map[string]string{"status": "deleted"}, reqID)
}
