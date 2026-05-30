package handler

import (
	"encoding/json"
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"go.uber.org/zap"
)

type AdminHandler struct {
	tenantUC domain.TenantUseCase
	logger   *zap.Logger
}

func NewAdminHandler(tenantUC domain.TenantUseCase, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{tenantUC: tenantUC, logger: logger}
}

// ListTenants GET /api/v1/admin/tenants (super_admin only)
func (h *AdminHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenants, err := h.tenantUC.ListTenants()
	if err != nil {
		h.logger.Error("admin list tenants failed", zap.Error(err), zap.String("request_id", reqID))
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to list tenants", reqID)
		return
	}
	response.JSON(w, http.StatusOK, "Success", tenants, reqID)
}

// ActivateTenant PUT /api/v1/admin/tenants/:id/activate
func (h *AdminHandler) ActivateTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	if err := h.tenantUC.ActivateTenant(tenantID); err != nil {
		h.logger.Error("activate tenant failed", zap.String("tenant_id", tenantID), zap.String("request_id", reqID), zap.Error(err))
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Tenant activated", map[string]string{"status": "activated"}, reqID)
}

// DeactivateTenant PUT /api/v1/admin/tenants/:id/deactivate
func (h *AdminHandler) DeactivateTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID := r.PathValue("id")

	if err := h.tenantUC.DeactivateTenant(tenantID); err != nil {
		h.logger.Error("deactivate tenant failed", zap.String("tenant_id", tenantID), zap.String("request_id", reqID), zap.Error(err))
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
	if err := h.tenantUC.ExtendTenant(tenantID, req.Months); err != nil {
		h.logger.Error("extend tenant failed", zap.String("tenant_id", tenantID), zap.String("request_id", reqID), zap.Error(err))
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
	if err := h.tenantUC.ChangePlan(tenantID, &req); err != nil {
		h.logger.Error("change plan failed", zap.String("tenant_id", tenantID), zap.String("request_id", reqID), zap.Error(err))
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

	if err := h.tenantUC.SoftDeleteTenant(tenantID); err != nil {
		h.logger.Error("soft delete tenant failed", zap.String("tenant_id", tenantID), zap.String("request_id", reqID), zap.Error(err))
		handleDomainErr(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, "Tenant deleted", map[string]string{"status": "deleted"}, reqID)
}
