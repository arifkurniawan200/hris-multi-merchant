package handler

import (
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// ── Dashboard Handler ──────────────────────────────

type DashboardHandler struct {
	uc domain.DashboardUseCase
}

func NewDashboardHandler(uc domain.DashboardUseCase) *DashboardHandler {
	return &DashboardHandler{uc: uc}
}

// Summary returns the dashboard summary for the current user.
func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrUnauthorized, "No user context", reqID)
		return
	}

	role, _ := r.Context().Value(middleware.CtxRole).(string)

	summary, err := h.uc.GetSummary(r.Context(), tenantID, userID, role)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", summary, reqID)
}
