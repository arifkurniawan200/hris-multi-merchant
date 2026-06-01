package handler

import (
	"net/http"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// ── Roster Handler ─────────────────────────────────

type RosterHandler struct {
	uc domain.RosterUseCase
}

func NewRosterHandler(uc domain.RosterUseCase) *RosterHandler {
	return &RosterHandler{uc: uc}
}

// List returns the roster (employees + shift assignments) for a date range.
func (h *RosterHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	// Parse date range with defaults to this week
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")

	if dateFrom == "" || dateTo == "" {
		// Default to current week (Monday – Sunday)
		now := time.Now()
		weekday := now.Weekday()
		if weekday == time.Sunday {
			weekday = 7
		}
		monday := now.AddDate(0, 0, -int(weekday-time.Monday))
		sunday := monday.AddDate(0, 0, 6)

		if dateFrom == "" {
			dateFrom = monday.Format("2006-01-02")
		}
		if dateTo == "" {
			dateTo = sunday.Format("2006-01-02")
		}
	}

	roster, err := h.uc.GetRoster(r.Context(), tenantID, dateFrom, dateTo)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", roster, reqID)
}
