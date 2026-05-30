package handler

import (
	"encoding/json"
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type AuthHandler struct {
	userUC      domain.UserUseCase
	jwtParser   RefreshParser
	refreshRepo RefreshTokenStore
}

type RefreshParser interface {
	ParseRefreshToken(token string) (string, error)
}

type RefreshTokenStore interface {
	Save(userID, token string, ttlSeconds int) error
	Get(userID string) (string, error)
	Delete(userID string) error
}

func NewAuthHandler(userUC domain.UserUseCase, parser RefreshParser, refreshRepo RefreshTokenStore) *AuthHandler {
	return &AuthHandler{
		userUC:      userUC,
		jwtParser:   parser,
		refreshRepo: refreshRepo,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid_body", middleware.GetReqID(r.Context()))
		return
	}

	user, err := h.userUC.RegisterUser(&req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, user, middleware.GetReqID(r.Context()))
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid_body", middleware.GetReqID(r.Context()))
		return
	}

	user, err := h.userUC.LoginUser(&req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	tokens, err := h.userUC.IssueTokens(user.ID, user.Email, "", "")
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	if err := h.refreshRepo.Save(user.ID, tokens.RefreshToken, 7*24*3600); err != nil {
		response.Err(w, http.StatusInternalServerError, "store_refresh_error", middleware.GetReqID(r.Context()))
		return
	}

	response.JSON(w, http.StatusOK, tokens, middleware.GetReqID(r.Context()))
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid_body", middleware.GetReqID(r.Context()))
		return
	}

	userID, err := h.jwtParser.ParseRefreshToken(req.RefreshToken)
	if err != nil {
		response.Err(w, http.StatusUnauthorized, "invalid_refresh_token", middleware.GetReqID(r.Context()))
		return
	}

	stored, err := h.refreshRepo.Get(userID)
	if err != nil || stored != req.RefreshToken {
		response.Err(w, http.StatusUnauthorized, "refresh_token_mismatch", middleware.GetReqID(r.Context()))
		return
	}

	user, err := h.userUC.GetUser(userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	tokens, err := h.userUC.IssueTokens(user.ID, user.Email, "", "")
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	if err := h.refreshRepo.Save(user.ID, tokens.RefreshToken, 7*24*3600); err != nil {
		response.Err(w, http.StatusInternalServerError, "store_refresh_error", middleware.GetReqID(r.Context()))
		return
	}

	response.JSON(w, http.StatusOK, tokens, middleware.GetReqID(r.Context()))
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusUnauthorized, "unauthorized", middleware.GetReqID(r.Context()))
		return
	}

	user, err := h.userUC.GetUser(userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, user, middleware.GetReqID(r.Context()))
}

// handleDomainErr maps domain.AppError to HTTP response.
func handleDomainErr(w http.ResponseWriter, r *http.Request, err error) {
	if appErr, ok := err.(*domain.AppError); ok {
		response.Err(w, appErr.Code, appErr.Message, middleware.GetReqID(r.Context()))
		return
	}
	response.Err(w, http.StatusInternalServerError, err.Error(), middleware.GetReqID(r.Context()))
}
