package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/repository"
	"go.uber.org/zap"
)

type AdminHandler struct {
	subRepo *repository.SubscriptionRepo
	logger  *zap.Logger
}

func NewAdminHandler(subRepo *repository.SubscriptionRepo, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{subRepo: subRepo, logger: logger}
}

// ListTenants GET /api/v1/admin/tenants (super_admin only)
func (h *AdminHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	tenants, err := h.subRepo.GetUserTenantsWithExpiry("") // empty = all
	if err != nil {
		h.logger.Error("admin list tenants failed", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to list tenants", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, tenants, middleware.GetReqID(r.Context()))
}

// ActivateTenant PUT /api/v1/admin/tenants/:id/activate
func (h *AdminHandler) ActivateTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.subRepo.Activate(tenantID); err != nil {
		h.logger.Error("activate tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to activate tenant", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "activated"}, middleware.GetReqID(r.Context()))
}

// DeactivateTenant PUT /api/v1/admin/tenants/:id/deactivate
func (h *AdminHandler) DeactivateTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.subRepo.Deactivate(tenantID); err != nil {
		h.logger.Error("deactivate tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to deactivate tenant", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "deactivated"}, middleware.GetReqID(r.Context()))
}

// ExtendTenant PUT /api/v1/admin/tenants/:id/extend
func (h *AdminHandler) ExtendTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	var body struct {
		Months int `json:"months"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Months <= 0 {
		response.Error(w, http.StatusBadRequest, "months must be > 0", middleware.GetReqID(r.Context()))
		return
	}
	duration := time.Duration(body.Months) * 30 * 24 * time.Hour
	if err := h.subRepo.Extend(tenantID, duration); err != nil {
		h.logger.Error("extend tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to extend subscription", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "extended", "months": fmt.Sprintf("%d", body.Months)}, middleware.GetReqID(r.Context()))
}

// ChangePlan PUT /api/v1/admin/tenants/:id/plan
func (h *AdminHandler) ChangePlan(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	var body struct {
		Plan           string `json:"plan"`
		PricePerEmployee int64  `json:"price_per_employee"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid body", middleware.GetReqID(r.Context()))
		return
	}
	if body.Plan != "free" && body.Plan != "pro" && body.Plan != "enterprise" {
		response.Error(w, http.StatusBadRequest, "plan must be free, pro, or enterprise", middleware.GetReqID(r.Context()))
		return
	}
	if err := h.subRepo.ChangePlan(tenantID, body.Plan, body.PricePerEmployee); err != nil {
		h.logger.Error("change plan failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to change plan", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "plan_changed", "plan": body.Plan}, middleware.GetReqID(r.Context()))
}

// SoftDeleteTenant DELETE /api/v1/admin/tenants/:id (soft delete)
func (h *AdminHandler) SoftDeleteTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.subRepo.SoftDelete(tenantID); err != nil {
		h.logger.Error("soft delete tenant failed", zap.String("tenant_id", tenantID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to delete tenant", middleware.GetReqID(r.Context()))
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "deleted"}, middleware.GetReqID(r.Context()))
}
