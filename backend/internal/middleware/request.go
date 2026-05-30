package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/contextkeys"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
)

// Re-export context keys for backward compatibility.
const (
	CtxUserID   = contextkeys.UserID
	CtxTenantID = contextkeys.TenantID
	CtxRole     = contextkeys.UserRole
	CtxReqID    = contextkeys.RequestID
)

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		w.Header().Set("X-Request-ID", reqID)
		ctx := context.WithValue(r.Context(), contextkeys.RequestID, reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Logging is the HTTP logging middleware using global logger.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(ww, r)
		logger.Info(r.Context(),
			"http_request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent())
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// Recovery middleware using global logger.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error(r.Context(), "panic_recovered", "error", err)
				http.Error(w, `{"error":"internal_server_error"}`, http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func GetReqID(ctx context.Context) string {
	if v, ok := ctx.Value(contextkeys.RequestID).(string); ok {
		return v
	}
	return ""
}

func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return ""
}
