package handler

import (
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type NotificationHandler struct {
	uc domain.NotificationUseCase
}

func NewNotificationHandler(uc domain.NotificationUseCase) *NotificationHandler {
	return &NotificationHandler{uc: uc}
}

// List handles GET /api/v1/notifications
func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "User not authenticated", reqID)
		return
	}

	parsedUserID := uuid.MustParse(userID)

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	notifs, err := h.uc.ListMyNotifications(r.Context(), parsedUserID, limit, offset)
	if err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to list notifications", reqID)
		return
	}

	response.JSON(w, http.StatusOK, "Success", notifs, reqID)
}

// CountUnread handles GET /api/v1/notifications/unread-count
func (h *NotificationHandler) CountUnread(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "User not authenticated", reqID)
		return
	}

	parsedUserID := uuid.MustParse(userID)

	count, err := h.uc.CountUnread(r.Context(), parsedUserID)
	if err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to count unread", reqID)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]int{"unread_count": count}, reqID)
}

// MarkRead handles PUT /api/v1/notifications/{id}/read
func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "User not authenticated", reqID)
		return
	}

	parsedUserID := uuid.MustParse(userID)

	notifID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid notification ID", reqID)
		return
	}

	if err := h.uc.MarkRead(r.Context(), notifID, parsedUserID); err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to mark as read", reqID)
		return
	}

	response.JSON(w, http.StatusOK, "Notification marked as read", nil, reqID)
}

// MarkAllRead handles PUT /api/v1/notifications/read-all
func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "User not authenticated", reqID)
		return
	}

	parsedUserID := uuid.MustParse(userID)

	if err := h.uc.MarkAllRead(r.Context(), parsedUserID); err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to mark all as read", reqID)
		return
	}

	response.JSON(w, http.StatusOK, "All notifications marked as read", nil, reqID)
}
