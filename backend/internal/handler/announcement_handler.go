package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type AnnouncementHandler struct {
	uc domain.AnnouncementUseCase
}

func NewAnnouncementHandler(uc domain.AnnouncementUseCase) *AnnouncementHandler {
	return &AnnouncementHandler{uc: uc}
}

// Create creates a new announcement.
func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	a, err := h.uc.Create(r.Context(), tenantID, userID, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Announcement created", a, reqID)
}

// GetByID returns a single announcement.
func (h *AnnouncementHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	id := r.PathValue("id")

	a, err := h.uc.GetByID(r.Context(), tenantID, id, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", a, reqID)
}

// List returns paginated announcements.
func (h *AnnouncementHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	filter := domain.AnnouncementFilter{
		Limit:  limit,
		Offset: offset,
	}

	if deptID := r.URL.Query().Get("department_id"); deptID != "" {
		filter.DepartmentID = &deptID
	}

	items, total, err := h.uc.List(r.Context(), tenantID, userID, filter)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]interface{}{
		"data":   items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}, reqID)
}

// GetPinned returns pinned announcements for dashboard.
func (h *AnnouncementHandler) GetPinned(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	items, err := h.uc.GetPinned(r.Context(), tenantID, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", items, reqID)
}

// Update updates an announcement.
func (h *AnnouncementHandler) Update(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	id := r.PathValue("id")

	var req domain.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	a, err := h.uc.Update(r.Context(), tenantID, userID, id, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Announcement updated", a, reqID)
}

// Delete soft-deletes an announcement.
func (h *AnnouncementHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	if err := h.uc.Delete(r.Context(), tenantID, id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Announcement deleted", nil, reqID)
}

// MarkRead marks an announcement as read by the current user.
func (h *AnnouncementHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	id := r.PathValue("id")

	if err := h.uc.MarkRead(r.Context(), tenantID, id, userID); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Marked as read", nil, reqID)
}

// GetUnreadCount returns the number of unread announcements.
func (h *AnnouncementHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	items, err := h.uc.GetPinned(r.Context(), tenantID, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]interface{}{
		"pinned_count": len(items),
	}, reqID)
}
