package handler

import (
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// ── Analytics Handler ──────────────────────────────

type AnalyticsHandler struct {
	uc domain.AnalyticsUseCase
}

func NewAnalyticsHandler(uc domain.AnalyticsUseCase) *AnalyticsHandler {
	return &AnalyticsHandler{uc: uc}
}

// Summary returns the analytics summary for the tenant.
func (h *AnalyticsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	summary, err := h.uc.GetSummary(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", summary, reqID)
}
