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
	reqID := middleware.GetReqID(r.Context())

	var req domain.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	user, err := h.userUC.RegisterUser(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "User registered successfully", user, reqID)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	user, err := h.userUC.LoginUser(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	// Look up tenant membership — user may have zero or many tenants
	tenantID, role, _ := h.userUC.FindUserTenant(r.Context(), user.ID)

	tokens, err := h.userUC.IssueTokens(r.Context(), user.ID, user.Email, tenantID, role)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	if err := h.refreshRepo.Save(user.ID, tokens.RefreshToken, 7*24*3600); err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to store refresh token", reqID)
		return
	}

	// Build structured login response with user info
	type loginResponse struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		User         struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Name  string `json:"name"`
			Role  string `json:"role"`
		} `json:"user"`
	}

	resp := loginResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
	}
	resp.User.ID = user.ID
	resp.User.Email = user.Email
	resp.User.Name = user.FullName
	resp.User.Role = string(role)

	response.JSON(w, http.StatusOK, "Login successful", resp, reqID)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	userID, err := h.jwtParser.ParseRefreshToken(req.RefreshToken)
	if err != nil {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "Invalid refresh token", reqID)
		return
	}

	stored, err := h.refreshRepo.Get(userID)
	if err != nil || stored != req.RefreshToken {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "Refresh token mismatch", reqID)
		return
	}

	user, err := h.userUC.GetUser(r.Context(), userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	tokens, err := h.userUC.IssueTokens(r.Context(), user.ID, user.Email, "", "")
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	if err := h.refreshRepo.Save(user.ID, tokens.RefreshToken, 7*24*3600); err != nil {
		response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Failed to store refresh token", reqID)
		return
	}

	response.JSON(w, http.StatusOK, "Token refreshed", tokens, reqID)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusUnauthorized, response.ErrUnauthorized, "Unauthorized", reqID)
		return
	}

	user, err := h.userUC.GetUser(r.Context(), userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", user, reqID)
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var req domain.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	token, err := h.userUC.ForgotPassword(r.Context(), req.Email)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "If the email exists, a reset link has been sent", map[string]string{
		"token": token,
	}, reqID)
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var req domain.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	if err := h.userUC.ResetPassword(r.Context(), req.Token, req.Password); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Password has been reset successfully", nil, reqID)
}
