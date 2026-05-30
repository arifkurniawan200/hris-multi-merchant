package handler

import (
	"encoding/json"
	"fmt"
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
	tenants, err := h.tenantUC.ListTenants()
	if err != nil {
		h.logger.Error("admin list tenants failed", zap.Error(err))
		response.Err(w, http.StatusInternalServerError, "failed to list tenants", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, tenants, middleware.GetReqID(r.Context()))
}

// ActivateTenant PUT /api/v1/admin/tenants/:id/activate
func (h *AdminHandler) ActivateTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.tenantUC.ActivateTenant(tenantID); err != nil {
		h.logger.Error("activate tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Err(w, http.StatusInternalServerError, "failed to activate tenant", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "activated"}, middleware.GetReqID(r.Context()))
}

// DeactivateTenant PUT /api/v1/admin/tenants/:id/deactivate
func (h *AdminHandler) DeactivateTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.tenantUC.DeactivateTenant(tenantID); err != nil {
		h.logger.Error("deactivate tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Err(w, http.StatusInternalServerError, "failed to deactivate tenant", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "deactivated"}, middleware.GetReqID(r.Context()))
}

// ExtendTenant PUT /api/v1/admin/tenants/:id/extend
func (h *AdminHandler) ExtendTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	var req domain.ExtendTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid body", middleware.GetReqID(r.Context()))
		return
	}
	if err := h.tenantUC.ExtendTenant(tenantID, req.Months); err != nil {
		h.logger.Error("extend tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Err(w, http.StatusInternalServerError, "failed to extend subscription", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "extended", "months": fmt.Sprintf("%d", req.Months)}, middleware.GetReqID(r.Context()))
}

// ChangePlan PUT /api/v1/admin/tenants/:id/plan
func (h *AdminHandler) ChangePlan(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	var req domain.ChangePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid body", middleware.GetReqID(r.Context()))
		return
	}
	if err := h.tenantUC.ChangePlan(tenantID, &req); err != nil {
		h.logger.Error("change plan failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Err(w, http.StatusInternalServerError, "failed to change plan", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "plan_changed", "plan": req.Plan}, middleware.GetReqID(r.Context()))
}

// SoftDeleteTenant DELETE /api/v1/admin/tenants/:id (soft delete)
func (h *AdminHandler) SoftDeleteTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.tenantUC.SoftDeleteTenant(tenantID); err != nil {
		h.logger.Error("soft delete tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Err(w, http.StatusInternalServerError, "failed to delete tenant", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "deleted"}, middleware.GetReqID(r.Context()))
}
