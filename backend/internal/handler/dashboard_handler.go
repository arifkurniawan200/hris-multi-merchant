package handler

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/google/uuid"
)

// ── Dashboard Handler ───────────────────────────

type DashboardHandler struct {
	leaveUC      domain.LeaveUseCase
	attendanceUC domain.AttendanceUseCase
}

func NewDashboardHandler(leaveUC domain.LeaveUseCase, attendanceUC domain.AttendanceUseCase) *DashboardHandler {
	return &DashboardHandler{
		leaveUC:      leaveUC,
		attendanceUC: attendanceUC,
	}
}

// Dashboard handles GET /api/v1/employee/dashboard
func (h *DashboardHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "No user context", reqID)
		return
	}

	tenantUUID := uuid.MustParse(tenantID)
	userUUID := uuid.MustParse(userID)
	now := time.Now()
	currentYear := now.Year()

	// ── 1. Leave Balances ──────────────────────
	balances, err := h.leaveUC.GetBalance(r.Context(), userUUID, currentYear)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}
	if balances == nil {
		balances = []domain.LeaveBalance{}
	}

	// ── 2. My Leaves (for pending count + upcoming) ──
	// Use a generous limit to get all relevant leaves
	leaves, err := h.leaveUC.ListMyLeaves(r.Context(), tenantUUID, userUUID, 100, 0)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}
	if leaves == nil {
		leaves = []domain.LeaveRequest{}
	}

	// Count pending leaves
	pendingCount := 0
	var upcomingLeaves []domain.LeaveRequest
	today := now.Format("2006-01-02")

	for _, l := range leaves {
		if l.Status == "pending" {
			pendingCount++
		}
		// Upcoming: approved leaves with start date >= today
		if l.Status == "approved" && l.StartDate >= today {
			upcomingLeaves = append(upcomingLeaves, l)
		}
	}

	// Sort upcoming leaves by start date ascending
	sort.Slice(upcomingLeaves, func(i, j int) bool {
		return upcomingLeaves[i].StartDate < upcomingLeaves[j].StartDate
	})
	// Limit to next 5
	if len(upcomingLeaves) > 5 {
		upcomingLeaves = upcomingLeaves[:5]
	}

	// ── 3. Attendance Summary (this month) ─────
	thisMonth := now.Format("2006-01")

	attendances, err := h.attendanceUC.GetHistory(r.Context(), userID, 100, 0)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	summary := domain.AttendanceSummary{}
	for _, a := range attendances {
		// Only count records from the current month
		if !strings.HasPrefix(a.ClockDate, thisMonth) {
			continue
		}
		summary.Total++
		switch a.Status {
		case domain.AttendancePresent:
			summary.Present++
		case domain.AttendanceLate:
			summary.Late++
		case domain.AttendanceAbsent, domain.AttendanceHalfDay:
			summary.Absent++
		default:
			summary.Absent++
		}
	}

	// ── Build Response ─────────────────────────
	dashboard := domain.DashboardResponse{
		LeaveBalances:     balances,
		PendingLeaveCount: pendingCount,
		AttendanceSummary: summary,
		UpcomingLeaves:    upcomingLeaves,
	}

	response.JSON(w, http.StatusOK, "Success", dashboard, reqID)
}
