package middleware

import (
	"context"
	"net/http"
)

// TenantCtx reads tenant_id from JWT claims in context,
// sets PostgreSQL app.current_tenant session variable for RLS.
func TenantCtx(setFn func(ctx context.Context, key string, value string) error) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			role, _ := ctx.Value(CtxRole).(string)
			tenantID, _ := ctx.Value(CtxTenantID).(string)
			userID, _ := ctx.Value(CtxUserID).(string)

			if err := setFn(ctx, "app.current_tenant", tenantID); err != nil {
				writeErr(w, http.StatusForbidden, "tenant_context_error")
				return
			}

			if err := setFn(ctx, "app.current_user_id", userID); err != nil {
				writeErr(w, http.StatusForbidden, "tenant_context_error")
				return
			}

			superAdmin := role == "super_admin"
			ctx = context.WithValue(ctx, bypassRLSKey, superAdmin)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type ctxFlagKey string

const bypassRLSKey ctxFlagKey = "bypass_rls"

func BypassRLS(ctx context.Context) bool {
	v, ok := ctx.Value(bypassRLSKey).(bool)
	return ok && v
}
