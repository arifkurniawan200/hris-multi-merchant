package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/golang-jwt/jwt/v5"
)

type jwtValidator interface {
	ParseToken(token string) (*domain.JWTClaims, error)
}

type Auth struct {
	jwt jwtValidator
}

func NewAuth(jwt jwtValidator) *Auth {
	return &Auth{jwt: jwt}
}

func (a *Auth) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := BearerToken(r)
		if raw == "" {
			writeErr(w, http.StatusUnauthorized, "missing_bearer_token")
			return
		}

		claims, err := a.jwt.ParseToken(raw)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "invalid_token")
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, CtxUserID, claims.UserID)
		ctx = context.WithValue(ctx, CtxTenantID, claims.TenantID)
		ctx = context.WithValue(ctx, CtxRole, string(claims.Role))

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	errCode := response.MapHTTPStatusToErrorCode(status)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response.Envelope{
		Success:   false,
		Message:   msg,
		ErrorCode: errCode,
		RequestID: "",
		Data:      struct{}{},
	})
}

// ── Internal JWT implementation ──────────────────────

type JWTManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewJWTManager(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *JWTManager {
	return &JWTManager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (j *JWTManager) GenerateAccessToken(claims domain.JWTClaims) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   claims.UserID,
		"email":     claims.Email,
		"tenant_id": claims.TenantID,
		"role":      claims.Role,
		"type":      "access",
		"exp":       time.Now().Add(j.accessTTL).Unix(),
		"iat":       time.Now().Unix(),
	})
	return t.SignedString(j.accessSecret)
}

func (j *JWTManager) GenerateRefreshToken(userID string) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"type":    "refresh",
		"exp":     time.Now().Add(j.refreshTTL).Unix(),
		"iat":     time.Now().Unix(),
	})
	return t.SignedString(j.refreshSecret)
}

func (j *JWTManager) ParseToken(token string) (*domain.JWTClaims, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return j.accessSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok || !t.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	if tp, _ := claims["type"].(string); tp != "access" {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return &domain.JWTClaims{
		UserID:   claims["user_id"].(string),
		Email:    claims["email"].(string),
		TenantID: strOrEmpty(claims["tenant_id"]),
		Role:     domain.UserTenantRole(strOrEmpty(claims["role"])),
	}, nil
}

func (j *JWTManager) ParseRefreshToken(token string) (string, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return j.refreshSecret, nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok || !t.Valid {
		return "", jwt.ErrSignatureInvalid
	}
	if tp, _ := claims["type"].(string); tp != "refresh" {
		return "", jwt.ErrTokenInvalidClaims
	}
	userID, _ := claims["user_id"].(string)
	return userID, nil
}

func strOrEmpty(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
