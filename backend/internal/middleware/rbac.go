package middleware

import (
	"net/http"
)

// RequireRole gates handler behind minimum role level.
// Hierarchy: super_admin > tenant_admin > manager > employee
var roleWeight = map[string]int{
	"super_admin":  100,
	"tenant_admin": 50,
	"manager":      20,
	"employee":     10,
}

func RequireRole(minRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			rawRole, ok := ctx.Value(CtxRole).(string)
			if !ok || rawRole == "" {
				writeErr(w, http.StatusForbidden, "forbidden")
				return
			}

			if roleWeight[rawRole] >= roleWeight[minRole] {
				next.ServeHTTP(w, r)
				return
			}

			writeErr(w, http.StatusForbidden, "insufficient_role")
		})
	}
}
