package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type contextKey string

const (
	CtxUserID   contextKey = "user_id"
	CtxTenantID contextKey = "tenant_id"
	CtxRole     contextKey = "role"
	CtxReqID    contextKey = "request_id"
)

// ── RequestID ──────────────────────────────────
// Injects X-Request-ID into context and response header.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		w.Header().Set("X-Request-ID", reqID)
		ctx := context.WithValue(r.Context(), CtxReqID, reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ── Logger ──────────────────────────────────────
// Attach Zap logger with request ID to context.
func Logger(log *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID, _ := r.Context().Value(CtxReqID).(string)

			// Wrap response writer to capture status
			ww := &statusWriter{ResponseWriter: w, status: http.StatusOK}
			start := time.Now()

			next.ServeHTTP(ww, r.WithContext(r.Context()))

			log.Info("http_request",
				zap.String("request_id", reqID),
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.Int("status", ww.status),
				zap.Duration("duration", time.Since(start)),
				zap.String("remote_addr", r.RemoteAddr),
				zap.String("user_agent", r.UserAgent()),
			)
		})
	}
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// ── Recovery ────────────────────────────────────
func Recovery(log *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					reqID, _ := r.Context().Value(CtxReqID).(string)
					log.Error("panic_recovered",
						zap.String("request_id", reqID),
						zap.Any("error", err),
						zap.Stack("stack"),
					)
					http.Error(w, `{"error":"internal_server_error"}`, http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// GetReqID extracts request ID from context.
func GetReqID(ctx context.Context) string {
	if v, ok := ctx.Value(CtxReqID).(string); ok {
		return v
	}
	return ""
}

// RequireAuth validates JWT and injects claims into context.
// Skipped here — implementation in auth middleware.
func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return ""
}
