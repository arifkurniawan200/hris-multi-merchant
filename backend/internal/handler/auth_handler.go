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

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid_body", middleware.GetReqID(r.Context()))
		return
	}

	userUC, ok := h.userUC.(interface {
		RegisterUser(email, password, fullName string) (*domain.User, error)
	})
	if !ok {
		response.Err(w, http.StatusInternalServerError, "service_error", middleware.GetReqID(r.Context()))
		return
	}

	user, err := userUC.RegisterUser(req.Email, req.Password, req.FullName)
	if err != nil {
		response.Err(w, http.StatusBadRequest, err.Error(), middleware.GetReqID(r.Context()))
		return
	}

	response.JSON(w, http.StatusCreated, user, middleware.GetReqID(r.Context()))
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, "invalid_body", middleware.GetReqID(r.Context()))
		return
	}

	userUC, ok := h.userUC.(interface {
		LoginUser(email, password string) (*domain.User, error)
		IssueTokens(userID string, email string, tenantID string, role domain.UserTenantRole) (*domain.TokenPair, error)
	})
	if !ok {
		response.Err(w, http.StatusInternalServerError, "service_error", middleware.GetReqID(r.Context()))
		return
	}

	user, err := userUC.LoginUser(req.Email, req.Password)
	if err != nil {
		response.Err(w, http.StatusUnauthorized, err.Error(), middleware.GetReqID(r.Context()))
		return
	}

	tokens, err := userUC.IssueTokens(user.ID, user.Email, "", "")
	if err != nil {
		response.Err(w, http.StatusInternalServerError, "token_error", middleware.GetReqID(r.Context()))
		return
	}

	if err := h.refreshRepo.Save(user.ID, tokens.RefreshToken, 7*24*3600); err != nil {
		response.Err(w, http.StatusInternalServerError, "store_refresh_error", middleware.GetReqID(r.Context()))
		return
	}

	response.JSON(w, http.StatusOK, tokens, middleware.GetReqID(r.Context()))
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshReq
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

	userUC, ok := h.userUC.(interface {
		GetUser(id string) (*domain.User, error)
		IssueTokens(userID string, email string, tenantID string, role domain.UserTenantRole) (*domain.TokenPair, error)
	})
	if !ok {
		response.Err(w, http.StatusInternalServerError, "service_error", middleware.GetReqID(r.Context()))
		return
	}

	user, err := userUC.GetUser(userID)
	if err != nil {
		response.Err(w, http.StatusNotFound, "user_not_found", middleware.GetReqID(r.Context()))
		return
	}

	tokens, err := userUC.IssueTokens(user.ID, user.Email, "", "")
	if err != nil {
		response.Err(w, http.StatusInternalServerError, "token_error", middleware.GetReqID(r.Context()))
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

	userUC, ok := h.userUC.(interface {
		GetUser(id string) (*domain.User, error)
	})
	if !ok {
		response.Err(w, http.StatusInternalServerError, "service_error", middleware.GetReqID(r.Context()))
		return
	}

	user, err := userUC.GetUser(userID)
	if err != nil {
		response.Err(w, http.StatusNotFound, "user_not_found", middleware.GetReqID(r.Context()))
		return
	}

	response.JSON(w, http.StatusOK, user, middleware.GetReqID(r.Context()))
}
