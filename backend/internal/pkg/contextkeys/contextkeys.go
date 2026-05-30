package contextkeys

// Key is a typed context key used to store and retrieve values from [context.Context].
// Using a typed key (not bare string) prevents collisions between packages.
type Key string

const (
	// RequestID stores the unique request identifier (string).
	RequestID Key = "request_id"

	// TenantID stores the current tenant identifier (string).
	TenantID Key = "tenant_id"

	// UserID stores the authenticated user ID (string).
	UserID Key = "user_id"

	// UserRole stores the authenticated user's role (string).
	UserRole Key = "user_role"
)
