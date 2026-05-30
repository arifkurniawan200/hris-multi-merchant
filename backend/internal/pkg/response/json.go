package response

import (
	"encoding/json"
	"net/http"
)

// ── Standard response envelope ──────────────────
//
// Success:
//
//	{
//	    "success": true,
//	    "message": "Success",
//	    "error_code": 0,
//	    "request_id": "abc123",
//	    "data": {...}
//	}
//
// Error:
//
//	{
//	    "success": false,
//	    "message": "Invalid email or password",
//	    "error_code": 1308,
//	    "request_id": "abc123",
//	    "data": {}
//	}

type Envelope struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	ErrorCode int         `json:"error_code"`
	RequestID string      `json:"request_id"`
	Data      interface{} `json:"data"`
}

// JSON writes a success response with data.
func JSON(w http.ResponseWriter, status int, message string, data interface{}, requestID string) {
	if message == "" {
		message = "Success"
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Envelope{
		Success:   true,
		Message:   message,
		ErrorCode: 0,
		RequestID: requestID,
		Data:      data,
	})
}

// Err writes an error response with structured error code.
func Err(w http.ResponseWriter, status int, errorCode int, message string, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Envelope{
		Success:   false,
		Message:   message,
		ErrorCode: errorCode,
		RequestID: requestID,
		Data:      struct{}{},
	})
}

// ── Error code constants (3xxx range for domain errors) ──

const (
	// Validation
	ErrUnknown      = 3000
	ErrValidation   = 3001
	ErrInvalidBody  = 3002
	ErrMissingParam = 3003

	// Resource
	ErrNotFound = 3101
	ErrConflict = 3102

	// Auth
	ErrUnauthorized   = 3201
	ErrForbidden      = 3202
	ErrRoleInsufficient = 3203

	// Tenant / context
	ErrNoTenantContext = 3301
	ErrTenantInactive  = 3302

	// Internal
	ErrInternal = 3999
)

// MapHTTPStatusToErrorCode maps common HTTP status codes to our error codes.
func MapHTTPStatusToErrorCode(status int) int {
	switch status {
	case 400:
		return ErrValidation
	case 401:
		return ErrUnauthorized
	case 403:
		return ErrForbidden
	case 404:
		return ErrNotFound
	case 409:
		return ErrConflict
	default:
		return ErrInternal
	}
}
